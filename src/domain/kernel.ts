// Accounting Kernel — modul domain murni (tidak mengimpor React).
// Referensi: docs/22_ACCOUNTING_SPEC.md, docs/20_DATABASE.md, TR-003..TR-008.

import type { Account, EntryType, LedgerEntry, MutationType, Transaction } from '@/types';
import { uuidv7 } from '@/lib/uuid';
import { GENESIS_HASH, computeEntryHash } from '@/lib/hash';
import { ImmutableLedgerError, LedgerImbalanceError, ValidationError } from '@/domain/errors';
import { resolvePosting, type PostingLeg } from '@/domain/postingRules';
import {
  appendLedgerEntries,
  getAccounts,
  getLedgerEntries,
  getTransactions,
  nextSequence,
  saveAccounts,
  saveTransactions,
} from '@/repositories/db';

export interface PostTransactionInput {
  mutationType: MutationType;
  amount: number;
  transactionDate: string;
  description?: string;
  categoryId?: string | null;
  sourceAccountId?: string | null;
  destinationAccountId?: string | null;
  /** Akun hasil resolusi kategori: pendapatan / beban / liabilitas. */
  categoryAccountId?: string | null;
  clientTxId?: string;
  attachmentId?: string | null;
}

export interface PostResult {
  transaction: Transaction;
  entries: LedgerEntry[];
}

export interface ChainVerification {
  valid: boolean;
  brokenAt: string | null;
  checked: number;
}

/** Akun bertambah pada sisi DEBIT bila normal balance-nya debet (ASSET/EXPENSE). */
export function isDebitNormal(type: Account['type']): boolean {
  return type === 'ASSET' || type === 'EXPENSE';
}

function signedDelta(type: Account['type'], entryType: EntryType, amount: number): number {
  const naik = isDebitNormal(type) ? entryType === 'DEBIT' : entryType === 'CREDIT';
  return naik ? amount : -amount;
}

/** Invarian wajib: SUM(Debit) - SUM(Kredit) = 0 (spec bagian 4). */
export function assertBalanced(legs: readonly PostingLeg[]): void {
  let delta = 0;
  for (const leg of legs) {
    if (!Number.isSafeInteger(leg.amount) || leg.amount <= 0) {
      throw new ValidationError('Nominal baris ledger harus bilangan bulat positif.', 'amount');
    }
    delta += leg.entryType === 'DEBIT' ? leg.amount : -leg.amount;
  }
  if (legs.length < 2 || delta !== 0) {
    throw new LedgerImbalanceError(delta, [...legs]);
  }
}

function assertValidDate(value: string): void {
  if (!value || Number.isNaN(Date.parse(value))) {
    throw new ValidationError(
      `Tanggal transaksi tidak valid: "${String(value)}".`,
      'transactionDate',
    );
  }
}

function indexAccounts(accounts: readonly Account[]): Map<string, Account> {
  const map = new Map<string, Account>();
  for (const a of accounts) map.set(a.id, a);
  return map;
}

function assertAccountsUsable(legs: readonly PostingLeg[], byId: Map<string, Account>): void {
  for (const leg of legs) {
    const acc = byId.get(leg.accountId);
    if (!acc) {
      throw new ValidationError(
        `Akun dengan id "${leg.accountId}" tidak ditemukan pada Chart of Accounts.`,
        'accountId',
      );
    }
    if (!acc.isActive) {
      throw new ValidationError(
        `Akun ${acc.code} ${acc.name} sudah dinonaktifkan dan tidak dapat dipakai.`,
        'accountId',
      );
    }
  }
}

/** Saldo berjalan terakhir per akun, menurut sequenceNum tertinggi. */
function lastRunningBalances(entries: readonly LedgerEntry[]): Map<string, number> {
  const sorted = [...entries].sort((a, b) => a.sequenceNum - b.sequenceNum);
  const map = new Map<string, number>();
  for (const e of sorted) map.set(e.accountId, e.runningBalance);
  return map;
}

function lastEntryHash(entries: readonly LedgerEntry[]): string {
  let best: LedgerEntry | null = null;
  for (const e of entries) {
    if (best === null || e.sequenceNum > best.sequenceNum) best = e;
  }
  return best === null ? GENESIS_HASH : best.entryHash;
}

/** Menyusun entri ledger berantai, lalu menulis akun + transaksi + ledger. */
async function commitLegs(
  transaction: Transaction,
  legs: readonly PostingLeg[],
  voidTransactionId: string | null,
): Promise<PostResult> {
  const accounts = getAccounts();
  const byId = indexAccounts(accounts);
  const existing = getLedgerEntries();

  const balances = lastRunningBalances(existing);
  let prevHash = lastEntryHash(existing);
  const createdAt = transaction.createdAt;
  const firstSeq = nextSequence(legs.length);

  const entries: LedgerEntry[] = [];
  for (let i = 0; i < legs.length; i += 1) {
    const leg = legs[i] as PostingLeg;
    const acc = byId.get(leg.accountId) as Account;
    const running = (balances.get(leg.accountId) ?? 0) + signedDelta(acc.type, leg.entryType, leg.amount);
    balances.set(leg.accountId, running);

    const sequenceNum = firstSeq + i;
    const entryHash = await computeEntryHash({
      prevHash,
      transactionId: transaction.id,
      accountId: leg.accountId,
      entryType: leg.entryType,
      amount: leg.amount,
      sequenceNum,
      createdAt,
    });
    entries.push({
      id: uuidv7(),
      transactionId: transaction.id,
      accountId: leg.accountId,
      entryType: leg.entryType,
      amount: leg.amount,
      runningBalance: running,
      sequenceNum,
      prevHash,
      entryHash,
      createdAt,
    });
    prevHash = entryHash;
  }

  const touched = new Set(entries.map((e) => e.accountId));
  const updatedAccounts = accounts.map((a) =>
    touched.has(a.id)
      ? { ...a, currentBalance: balances.get(a.id) ?? a.currentBalance, updatedAt: createdAt }
      : a,
  );

  // Transaksi asal (bila reversal) di-VOID pada penulisan yang sama; baris
  // ledger asal tidak pernah disentuh.
  const nextTransactions = getTransactions().map((t) =>
    voidTransactionId !== null && t.id === voidTransactionId
      ? { ...t, status: 'VOID' as const, updatedAt: createdAt }
      : t,
  );
  nextTransactions.push(transaction);

  saveAccounts(updatedAccounts);
  saveTransactions(nextTransactions);
  appendLedgerEntries(entries);

  return { transaction, entries };
}

/**
 * Mencatat satu input single-entry menjadi pasangan baris ledger double-entry.
 * Idempoten terhadap `clientTxId` (TR-008).
 */
export async function postTransaction(input: PostTransactionInput): Promise<PostResult> {
  const clientTxId = input.clientTxId ?? uuidv7();

  const priorTx = getTransactions().find((t) => t.clientTxId === clientTxId);
  if (priorTx) {
    const priorEntries = getLedgerEntries()
      .filter((e) => e.transactionId === priorTx.id)
      .sort((a, b) => a.sequenceNum - b.sequenceNum);
    return { transaction: priorTx, entries: priorEntries };
  }

  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new ValidationError(
      'Nominal harus bilangan bulat positif dalam satuan rupiah utuh.',
      'amount',
    );
  }
  assertValidDate(input.transactionDate);

  const legs = resolvePosting({
    mutationType: input.mutationType,
    amount: input.amount,
    sourceAccountId: input.sourceAccountId ?? null,
    destinationAccountId: input.destinationAccountId ?? null,
    categoryAccountId: input.categoryAccountId ?? null,
  });
  assertBalanced(legs);
  assertAccountsUsable(legs, indexAccounts(getAccounts()));

  const now = new Date().toISOString();
  const attachmentId = input.attachmentId ?? null;
  const transaction: Transaction = {
    id: uuidv7(),
    clientTxId,
    transactionDate: input.transactionDate,
    description: input.description ?? '',
    categoryId: input.categoryId ?? '',
    mutationType: input.mutationType,
    amount: input.amount,
    sourceAccountId: input.sourceAccountId ?? '',
    destinationAccountId: input.destinationAccountId ?? '',
    status: 'POSTED',
    reversesTransactionId: null,
    attachmentId,
    // FR-032: pengeluaran di atas Rp 1.000.000 perlu lampiran bukti bayar.
    isVerified:
      input.mutationType === 'EXPENSE' && input.amount > 1_000_000
        ? attachmentId !== null
        : true,
    syncVersion: 1,
    createdAt: now,
    updatedAt: now,
  };

  return commitLegs(transaction, legs, null);
}

/**
 * FR-003 — menerbitkan transaksi pembalik. Baris ledger asal tidak pernah
 * diubah maupun dihapus; transaksi asal hanya berpindah status ke VOID.
 */
export async function reverseTransaction(transactionId: string): Promise<PostResult> {
  const transactions = getTransactions();
  const original = transactions.find((t) => t.id === transactionId);
  if (!original) {
    throw new ValidationError(
      `Transaksi dengan id "${transactionId}" tidak ditemukan.`,
      'transactionId',
    );
  }
  if (original.status === 'VOID') {
    throw new ImmutableLedgerError(
      `transaksi ${original.id} sudah berstatus VOID sehingga tidak dapat dibalik lagi`,
    );
  }
  if (original.status !== 'POSTED') {
    throw new ValidationError(
      `Hanya transaksi berstatus POSTED yang dapat dikoreksi; status saat ini ${original.status}.`,
      'status',
    );
  }
  if (transactions.some((t) => t.reversesTransactionId === original.id)) {
    throw new ImmutableLedgerError(
      `transaksi ${original.id} sudah pernah dibalik oleh transaksi reversal sebelumnya`,
    );
  }

  const originalEntries = getLedgerEntries()
    .filter((e) => e.transactionId === original.id)
    .sort((a, b) => a.sequenceNum - b.sequenceNum);
  if (originalEntries.length === 0) {
    throw new ValidationError(
      `Transaksi ${original.id} tidak memiliki baris ledger untuk dibalik.`,
      'transactionId',
    );
  }

  const legs: PostingLeg[] = originalEntries.map((e) => ({
    accountId: e.accountId,
    entryType: e.entryType === 'DEBIT' ? 'CREDIT' : 'DEBIT',
    amount: e.amount,
  }));
  assertBalanced(legs);
  assertAccountsUsable(legs, indexAccounts(getAccounts()));

  const now = new Date().toISOString();
  const reversal: Transaction = {
    ...original,
    id: uuidv7(),
    clientTxId: `reversal:${original.clientTxId}`,
    description: `Reversal: ${original.description}`,
    status: 'POSTED',
    reversesTransactionId: original.id,
    syncVersion: 1,
    createdAt: now,
    updatedAt: now,
  };

  return commitLegs(reversal, legs, original.id);
}

/** FR-040 — hitung ulang seluruh rantai hash berurutan sequenceNum. */
export async function verifyChain(): Promise<ChainVerification> {
  const entries = [...getLedgerEntries()].sort((a, b) => a.sequenceNum - b.sequenceNum);
  let prevHash = GENESIS_HASH;
  let checked = 0;

  for (const e of entries) {
    if (e.prevHash !== prevHash) {
      return { valid: false, brokenAt: e.id, checked };
    }
    const expected = await computeEntryHash({
      prevHash: e.prevHash,
      transactionId: e.transactionId,
      accountId: e.accountId,
      entryType: e.entryType,
      amount: e.amount,
      sequenceNum: e.sequenceNum,
      createdAt: e.createdAt,
    });
    checked += 1;
    if (expected !== e.entryHash) {
      return { valid: false, brokenAt: e.id, checked };
    }
    prevHash = e.entryHash;
  }

  return { valid: true, brokenAt: null, checked };
}

/** Hitung ulang saldo tiap akun langsung dari baris ledger. */
export function recomputeBalances(): Map<string, number> {
  const byId = indexAccounts(getAccounts());
  const balances = new Map<string, number>();
  for (const id of byId.keys()) balances.set(id, 0);

  const entries = [...getLedgerEntries()].sort((a, b) => a.sequenceNum - b.sequenceNum);
  for (const e of entries) {
    const acc = byId.get(e.accountId);
    if (!acc) continue;
    balances.set(
      e.accountId,
      (balances.get(e.accountId) ?? 0) + signedDelta(acc.type, e.entryType, e.amount),
    );
  }
  return balances;
}
