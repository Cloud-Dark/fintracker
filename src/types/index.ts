// Tipe domain sesuai 20_DATABASE.md bagian 3 dan 11.

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type CategoryType = 'INCOME' | 'EXPENSE';
export type MutationType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'DEBT_PAYMENT';
export type TransactionStatus = 'DRAFT' | 'POSTED' | 'VOID';
export type EntryType = 'DEBIT' | 'CREDIT';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  currency: 'IDR';
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  parentId: string | null;
  defaultAccountCode: string;
  isActive: boolean;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  clientTxId: string;
  transactionDate: string;
  description: string;
  categoryId: string;
  mutationType: MutationType;
  amount: number;
  sourceAccountId: string;
  destinationAccountId: string;
  status: TransactionStatus;
  reversesTransactionId: string | null;
  attachmentId: string | null;
  isVerified: boolean;
  syncVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerEntry {
  id: string;
  transactionId: string;
  accountId: string;
  entryType: EntryType;
  amount: number;
  runningBalance: number;
  sequenceNum: number;
  prevHash: string;
  entryHash: string;
  createdAt: string;
}

export interface Meta {
  schemaVersion: number;
  lastSequenceNum: number;
  seededAt: string | null;
}

// Lampiran bukti bayar (dirujuk Transaction.attachmentId, aturan Ghost Expense).
export interface Attachment {
  id: string;
  transactionId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
  createdAt: string;
}

// Preferensi pengguna, non-akuntansi (kunci fintrack:v1:settings).
export interface Settings {
  theme: 'light' | 'dark' | 'system';
  locale: 'id-ID';
  currency: 'IDR';
  quotaWarningRatio: number;
  duplicateWindowHours: number;
  ghostExpenseThreshold: number;
}

export interface BackupEnvelope {
  formatVersion: 1;
  schemaVersion: number;
  exportedAt: string;
  checksum: string;
  data: {
    meta: Meta;
    accounts: Account[];
    categories: Category[];
    transactions: Transaction[];
    ledgerEntries: LedgerEntry[];
    attachments: unknown[];
    reconciliations: unknown[];
    settings: Record<string, unknown>;
  };
}
