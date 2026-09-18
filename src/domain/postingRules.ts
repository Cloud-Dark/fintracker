// Pemetaan tipe mutasi ke pasangan Debit/Kredit.
// Sumber kebenaran: docs/22_ACCOUNTING_SPEC.md bagian 2.

import type { EntryType, MutationType } from '@/types'
import { ValidationError } from '@/domain/errors'

/** Kode akun Utang Usaha yang dipakai sebagai sisi debit DEBT_PAYMENT. */
export const ACCOUNTS_PAYABLE_CODE = '20100'

export interface PostingInput {
  mutationType: MutationType
  amount: number
  /** Akun kas/bank sumber (sisi kredit pada arus keluar). */
  sourceAccountId?: string | null
  /** Akun kas/bank tujuan (sisi debit pada arus masuk). */
  destinationAccountId?: string | null
  /**
   * Akun hasil resolusi kategori: akun pendapatan (INCOME), akun beban/HPP
   * (EXPENSE), atau akun liabilitas 20100 (DEBT_PAYMENT).
   */
  categoryAccountId?: string | null
}

export interface PostingLeg {
  accountId: string
  entryType: EntryType
  amount: number
}

function requireId(value: string | null | undefined, field: string, keterangan: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`${keterangan} wajib diisi.`, field)
  }
  return value
}

/**
 * Mengubah satu input single-entry menjadi dua baris ledger yang seimbang.
 * Tidak menyentuh penyimpanan; fungsi murni.
 */
export function resolvePosting(input: PostingInput): PostingLeg[] {
  const { mutationType, amount } = input

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new ValidationError(
      'Nominal harus bilangan bulat positif dalam satuan rupiah utuh.',
      'amount'
    )
  }

  switch (mutationType) {
    case 'INCOME': {
      const kas = requireId(
        input.destinationAccountId,
        'destinationAccountId',
        'Akun kas/bank tujuan untuk pemasukan'
      )
      const pendapatan = requireId(
        input.categoryAccountId,
        'categoryAccountId',
        'Akun pendapatan dari kategori'
      )
      return [
        { accountId: kas, entryType: 'DEBIT', amount },
        { accountId: pendapatan, entryType: 'CREDIT', amount },
      ]
    }

    case 'EXPENSE': {
      const beban = requireId(
        input.categoryAccountId,
        'categoryAccountId',
        'Akun beban/HPP dari kategori'
      )
      const kas = requireId(
        input.sourceAccountId,
        'sourceAccountId',
        'Akun kas/bank sumber untuk pengeluaran'
      )
      return [
        { accountId: beban, entryType: 'DEBIT', amount },
        { accountId: kas, entryType: 'CREDIT', amount },
      ]
    }

    case 'TRANSFER': {
      const tujuan = requireId(
        input.destinationAccountId,
        'destinationAccountId',
        'Akun tujuan transfer'
      )
      const sumber = requireId(input.sourceAccountId, 'sourceAccountId', 'Akun sumber transfer')
      if (tujuan === sumber) {
        throw new ValidationError(
          'Akun sumber dan tujuan transfer tidak boleh sama.',
          'destinationAccountId'
        )
      }
      return [
        { accountId: tujuan, entryType: 'DEBIT', amount },
        { accountId: sumber, entryType: 'CREDIT', amount },
      ]
    }

    case 'DEBT_PAYMENT': {
      // Sisi debit adalah akun liabilitas (20100 Utang Usaha) yang
      // sudah diresolusi pemanggil ke dalam categoryAccountId.
      const utang = requireId(
        input.categoryAccountId ?? input.destinationAccountId,
        'categoryAccountId',
        `Akun liabilitas (${ACCOUNTS_PAYABLE_CODE} Utang Usaha) untuk pembayaran utang`
      )
      const kas = requireId(
        input.sourceAccountId,
        'sourceAccountId',
        'Akun kas/bank sumber untuk pembayaran utang'
      )
      return [
        { accountId: utang, entryType: 'DEBIT', amount },
        { accountId: kas, entryType: 'CREDIT', amount },
      ]
    }

    default: {
      const unknown: never = mutationType
      throw new ValidationError(`Tipe mutasi tidak dikenal: ${String(unknown)}.`, 'mutationType')
    }
  }
}
