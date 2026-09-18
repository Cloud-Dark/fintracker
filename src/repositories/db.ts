// Fasad repository di atas storage + unit-of-work.

import { sha256HexSync } from '@/lib/hash';
import { monthKey } from '@/lib/date';
import type {
  Account,
  BackupEnvelope,
  Category,
  LedgerEntry,
  Meta,
  Transaction,
} from '@/types';
import { seedAccounts, seedCategories } from './seed';
import {
  KEYS,
  ALL_KEYS,
  hasKey,
  readCollection,
  readObject,
  removeKey,
  writeCollection,
  writeObject,
} from './storage';
import { createUnitOfWork } from './unitOfWork';

export const SCHEMA_VERSION = 1;

const DEFAULT_META: Meta = {
  schemaVersion: SCHEMA_VERSION,
  lastSequenceNum: 0,
  seededAt: null,
};

export function getMeta(): Meta {
  return readObject<Meta>(KEYS.meta, DEFAULT_META);
}

function setMeta(meta: Meta): void {
  writeObject(KEYS.meta, meta);
}

/** Idempoten: hanya menulis bila kunci meta belum ada. */
export function bootstrap(): void {
  if (hasKey(KEYS.meta)) return;

  const accounts = seedAccounts();
  const categories = seedCategories();
  const meta: Meta = {
    schemaVersion: SCHEMA_VERSION,
    lastSequenceNum: 0,
    seededAt: new Date().toISOString(),
  };

  createUnitOfWork()
    .stage(KEYS.accounts, accounts)
    .stage(KEYS.categories, categories)
    .stage(KEYS.transactions, [])
    .stage(KEYS.ledgerEntries, [])
    .stage(KEYS.attachments, [])
    .stage(KEYS.reconciliations, [])
    .stageObject(KEYS.meta, meta)
    .commit();
}

export function getAccounts(): Account[] {
  return readCollection<Account>(KEYS.accounts);
}

export function getCategories(): Category[] {
  return readCollection<Category>(KEYS.categories);
}

export function getTransactions(): Transaction[] {
  return readCollection<Transaction>(KEYS.transactions);
}

export function getLedgerEntries(): LedgerEntry[] {
  return readCollection<LedgerEntry>(KEYS.ledgerEntries);
}

export function saveAccounts(rows: Account[]): void {
  writeCollection(KEYS.accounts, rows);
}

export function saveCategories(rows: Category[]): void {
  writeCollection(KEYS.categories, rows);
}

export function saveTransactions(rows: Transaction[]): void {
  writeCollection(KEYS.transactions, rows);
}

/** Append-only (TR-004): tidak pernah update atau delete baris ledger. */
export function appendLedgerEntries(entries: LedgerEntry[]): void {
  if (entries.length === 0) return;
  const existing = getLedgerEntries();
  writeCollection(KEYS.ledgerEntries, [...existing, ...entries]);
}

/** Alokasi blok sequence monotonic; mengembalikan sequence pertama pada blok. */
export function nextSequence(count: number): number {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error(`count harus bilangan bulat positif, diterima: ${String(count)}`);
  }
  const meta = getMeta();
  const first = meta.lastSequenceNum + 1;
  setMeta({ ...meta, lastSequenceNum: meta.lastSequenceNum + count });
  return first;
}

export interface Indexes {
  ledgerByAccount: Map<string, LedgerEntry[]>;
  txByMonth: Map<string, Transaction[]>;
  accountByCode: Map<string, Account>;
}

export function buildIndexes(): Indexes {
  const ledgerByAccount = new Map<string, LedgerEntry[]>();
  for (const entry of getLedgerEntries()) {
    const bucket = ledgerByAccount.get(entry.accountId);
    if (bucket) bucket.push(entry);
    else ledgerByAccount.set(entry.accountId, [entry]);
  }

  const txByMonth = new Map<string, Transaction[]>();
  for (const tx of getTransactions()) {
    const key = monthKey(tx.transactionDate);
    const bucket = txByMonth.get(key);
    if (bucket) bucket.push(tx);
    else txByMonth.set(key, [tx]);
  }

  const accountByCode = new Map<string, Account>();
  for (const acc of getAccounts()) accountByCode.set(acc.code, acc);

  return { ledgerByAccount, txByMonth, accountByCode };
}

export function exportBackup(): BackupEnvelope {
  const data: BackupEnvelope['data'] = {
    meta: getMeta(),
    accounts: getAccounts(),
    categories: getCategories(),
    transactions: getTransactions(),
    ledgerEntries: getLedgerEntries(),
    attachments: readCollection<unknown>(KEYS.attachments),
    reconciliations: readCollection<unknown>(KEYS.reconciliations),
    settings: readObject<Record<string, unknown>>(KEYS.settings, {}),
  };

  return {
    formatVersion: 1,
    schemaVersion: data.meta.schemaVersion,
    exportedAt: new Date().toISOString(),
    checksum: sha256HexSync(JSON.stringify(data)),
    data,
  };
}

export function importBackup(env: BackupEnvelope): void {
  if (!env || typeof env !== 'object' || !env.data) {
    throw new Error('Envelope backup tidak valid.');
  }
  if (env.formatVersion !== 1) {
    throw new Error(`formatVersion tidak didukung: ${String(env.formatVersion)}`);
  }
  if (env.schemaVersion > SCHEMA_VERSION) {
    throw new Error(
      `schemaVersion ${env.schemaVersion} lebih baru dari versi aplikasi (${SCHEMA_VERSION}). Perbarui aplikasi sebelum impor.`,
    );
  }
  if (env.schemaVersion < 1) {
    throw new Error(`schemaVersion tidak valid: ${String(env.schemaVersion)}`);
  }
  if (env.checksum && env.checksum !== sha256HexSync(JSON.stringify(env.data))) {
    throw new Error('Checksum backup tidak cocok; berkas kemungkinan korup.');
  }

  const d = env.data;
  createUnitOfWork()
    .stage(KEYS.accounts, d.accounts)
    .stage(KEYS.categories, d.categories)
    .stage(KEYS.transactions, d.transactions)
    .stage(KEYS.ledgerEntries, d.ledgerEntries)
    .stage(KEYS.attachments, d.attachments)
    .stage(KEYS.reconciliations, d.reconciliations)
    .stageObject(KEYS.settings, d.settings)
    .stageObject(KEYS.meta, d.meta)
    .commit();
}

export function resetAll(): void {
  for (const key of ALL_KEYS) removeKey(key);
}
