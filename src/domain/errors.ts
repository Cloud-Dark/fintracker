// Kelas error domain akuntansi (22_ACCOUNTING_SPEC.md bagian 4, TR-003/TR-004).

/** Detail satu baris ledger yang gagal divalidasi. */
export interface ImbalanceLeg {
  accountId: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number;
}

/** Dilempar bila SUM(Debit) - SUM(Credit) != 0 pada sebuah transaksi. */
export class LedgerImbalanceError extends Error {
  readonly name = 'LedgerImbalanceError';
  readonly transactionId: string | null;
  readonly delta: number;
  readonly legs: ImbalanceLeg[];

  constructor(delta: number, legs: ImbalanceLeg[], transactionId: string | null = null) {
    super(
      `Ledger tidak seimbang: selisih Debit dikurangi Kredit sebesar ${delta}. ` +
        `Seluruh mutasi dibatalkan (hard rollback), tidak ada baris ledger yang tersimpan.`,
    );
    this.transactionId = transactionId;
    this.delta = delta;
    this.legs = legs;
  }
}

/** Dilempar bila masukan pengguna atau referensi data tidak sah. */
export class ValidationError extends Error {
  readonly name = 'ValidationError';
  readonly field: string | null;

  constructor(message: string, field: string | null = null) {
    super(`Validasi gagal: ${message}`);
    this.field = field;
  }
}

/** Dilempar bila ada upaya mengubah atau menghapus baris ledger yang sudah tertulis. */
export class ImmutableLedgerError extends Error {
  readonly name = 'ImmutableLedgerError';

  constructor(detail: string) {
    super(
      `Buku besar bersifat immutable (append-only): ${detail}. ` +
        `Koreksi hanya boleh dilakukan melalui transaksi pembalik (reversal).`,
    );
  }
}

/** Dilempar bila rantai hash atau invarian integritas data dilanggar. */
export class IntegrityError extends Error {
  readonly name = 'IntegrityError';
  readonly brokenAt: string | null;

  constructor(message: string, brokenAt: string | null = null) {
    super(`Integritas data terganggu: ${message}`);
    this.brokenAt = brokenAt;
  }
}
