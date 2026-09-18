// Cash Leakage Sentinel — FR-030..FR-032, docs/22_ACCOUNTING_SPEC.md bagian 6.
// Modul domain murni, dijalankan on-demand atas data lokal.

import type { Account, LedgerEntry, Transaction } from '@/types';
import { daysBetween, hoursBetween, toISODate } from '@/lib/date';
import { getAccounts, getLedgerEntries, getTransactions } from '@/repositories/db';

/** Kode akun Piutang Usaha yang dipantau aging (spec 6.1). */
export const RECEIVABLE_CODE = '10400';
/** Ambang Ghost Expense (spec 6.3). */
export const GHOST_EXPENSE_THRESHOLD = 1_000_000;
/** Jendela deteksi duplikat dalam jam (spec 6.2). */
export const DUPLICATE_WINDOW_HOURS = 48;

export type AgingBucketKey = '0-29' | '30-59' | '60-89' | '90+';

export interface AgingItem {
  transactionId: string;
  entryId: string;
  transactionDate: string;
  description: string;
  amount: number;
  ageDays: number;
  bucket: AgingBucketKey;
}

export interface AgingBucket {
  bucket: AgingBucketKey;
  total: number;
  items: AgingItem[];
}

export interface AgingReceivables {
  asOf: string;
  total: number;
  buckets: Record<AgingBucketKey, AgingBucket>;
  items: AgingItem[];
}

export interface DuplicateCandidate {
  amount: number;
  description: string;
  transactionDate: string;
  /** Diabaikan dari hasil bila transaksi ini sudah tersimpan. */
  excludeTransactionId?: string;
}

export interface GhostExpense {
  transactionId: string;
  transactionDate: string;
  description: string;
  amount: number;
  status: 'Unverified';
}

export interface SentinelSummary {
  agingOverdueCount: number;
  agingOverdueTotal: number;
  agingBuckets: Record<AgingBucketKey, number>;
  ghostExpenseCount: number;
  ghostExpenseTotal: number;
  totalWarnings: number;
}

const BUCKET_KEYS: readonly AgingBucketKey[] = ['0-29', '30-59', '60-89', '90+'];

function bucketOf(ageDays: number): AgingBucketKey {
  if (ageDays >= 90) return '90+';
  if (ageDays >= 60) return '60-89';
  if (ageDays >= 30) return '30-59';
  return '0-29';
}

function normalizeDescription(value: string): string {
  return value.trim().toLowerCase();
}

function isReportable(tx: Transaction): boolean {
  return tx.status === 'POSTED';
}

function receivableAccountIds(accounts: readonly Account[]): Set<string> {
  return new Set(accounts.filter((a) => a.code === RECEIVABLE_CODE).map((a) => a.id));
}

/**
 * FR-030 — Aging piutang. Sisi DEBIT ke akun 10400 menambah piutang;
 * sisi KREDIT melunasinya. Pelunasan dialokasikan FIFO (piutang tertua
 * dilunasi lebih dulu) sehingga hanya sisa yang belum lunas yang di-bucket.
 */
export function agingReceivables(asOf: string = toISODate(new Date())): AgingReceivables {
  const accounts = getAccounts();
  const arIds = receivableAccountIds(accounts);
  const txById = new Map<string, Transaction>();
  for (const t of getTransactions()) txById.set(t.id, t);

  const entries: LedgerEntry[] = getLedgerEntries()
    .filter((e) => arIds.has(e.accountId))
    .sort((a, b) => a.sequenceNum - b.sequenceNum);

  interface Open {
    entry: LedgerEntry;
    tx: Transaction;
    remaining: number;
  }
  const open: Open[] = [];
  let payments = 0;

  for (const entry of entries) {
    const tx = txById.get(entry.transactionId);
    if (!tx || !isReportable(tx)) continue;
    if (entry.entryType === 'DEBIT') open.push({ entry, tx, remaining: entry.amount });
    else payments += entry.amount;
  }

  // Alokasi pelunasan FIFO.
  open.sort((a, b) => a.tx.transactionDate.localeCompare(b.tx.transactionDate));
  for (const row of open) {
    if (payments <= 0) break;
    const pakai = Math.min(payments, row.remaining);
    row.remaining -= pakai;
    payments -= pakai;
  }

  const buckets = {} as Record<AgingBucketKey, AgingBucket>;
  for (const key of BUCKET_KEYS) buckets[key] = { bucket: key, total: 0, items: [] };

  const items: AgingItem[] = [];
  let total = 0;

  for (const row of open) {
    if (row.remaining <= 0) continue;
    const ageDays = daysBetween(row.tx.transactionDate, asOf);
    const bucket = bucketOf(ageDays);
    const item: AgingItem = {
      transactionId: row.tx.id,
      entryId: row.entry.id,
      transactionDate: row.tx.transactionDate,
      description: row.tx.description,
      amount: row.remaining,
      ageDays,
      bucket,
    };
    items.push(item);
    buckets[bucket].items.push(item);
    buckets[bucket].total += row.remaining;
    total += row.remaining;
  }

  return { asOf, total, buckets, items };
}

/**
 * FR-031 — deteksi pengeluaran duplikat dalam jendela ±48 jam dengan nominal
 * identik dan deskripsi sama (case-insensitive, trim). Non-blocking.
 */
export function detectDuplicateOutflow(candidate: DuplicateCandidate): Transaction[] {
  const target = normalizeDescription(candidate.description);
  return getTransactions()
    .filter((tx) => {
      if (tx.mutationType !== 'EXPENSE') return false;
      if (tx.status !== 'POSTED') return false;
      if (candidate.excludeTransactionId && tx.id === candidate.excludeTransactionId) return false;
      if (tx.amount !== candidate.amount) return false;
      if (normalizeDescription(tx.description) !== target) return false;
      const jam = hoursBetween(tx.transactionDate, candidate.transactionDate);
      return Number.isFinite(jam) && Math.abs(jam) <= DUPLICATE_WINDOW_HOURS;
    })
    .sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));
}

/** FR-032 — pengeluaran di atas Rp 1.000.000 tanpa lampiran bukti bayar. */
export function ghostExpenses(): GhostExpense[] {
  return getTransactions()
    .filter(
      (tx) =>
        tx.mutationType === 'EXPENSE' &&
        tx.status === 'POSTED' &&
        tx.amount > GHOST_EXPENSE_THRESHOLD &&
        (tx.attachmentId === null || tx.attachmentId === ''),
    )
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
    .map((tx) => ({
      transactionId: tx.id,
      transactionDate: tx.transactionDate,
      description: tx.description,
      amount: tx.amount,
      status: 'Unverified' as const,
    }));
}

/** Ringkasan jumlah peringatan per kategori untuk dashboard (FR-020). */
export function sentinelSummary(asOf: string = toISODate(new Date())): SentinelSummary {
  const aging = agingReceivables(asOf);
  const ghosts = ghostExpenses();

  const agingBuckets = {} as Record<AgingBucketKey, number>;
  for (const key of BUCKET_KEYS) agingBuckets[key] = aging.buckets[key].items.length;

  // Peringatan berjenjang baru muncul pada hari ke-30 ke atas.
  const overdue = aging.items.filter((i) => i.ageDays >= 30);
  const agingOverdueTotal = overdue.reduce((sum, i) => sum + i.amount, 0);
  const ghostExpenseTotal = ghosts.reduce((sum, g) => sum + g.amount, 0);

  return {
    agingOverdueCount: overdue.length,
    agingOverdueTotal,
    agingBuckets,
    ghostExpenseCount: ghosts.length,
    ghostExpenseTotal,
    totalWarnings: overdue.length + ghosts.length,
  };
}
