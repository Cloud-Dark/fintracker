import { beforeEach, describe, expect, it } from 'vitest'

import {
  bootstrap,
  exportBackup,
  getAccounts,
  getCategories,
  getLedgerEntries,
  getTransactions,
  importBackup,
  resetAll,
} from '@/repositories/db'
import { postTransaction, reverseTransaction, verifyChain } from '@/domain/kernel'
import { balanceSheet, cashFlow, generalLedger, profitAndLoss } from '@/domain/reporting'
import { sentinelSummary } from '@/domain/sentinel'

/**
 * Uji penerimaan tingkat alur: menelusuri perjalanan pengguna dari awal
 * sampai akhir melalui lapisan domain yang sama dengan yang dipakai antarmuka.
 * Skenario dan hasilnya tercatat pada docs/uat/2026-09-19_smoke-test-mvp.md.
 */

function accountId(code: string): string {
  const acc = getAccounts().find((a) => a.code === code)
  if (!acc) throw new Error(`Akun ${code} tidak ada pada seed.`)
  return acc.id
}

describe('UAT-01 — Bootstrap awal', () => {
  beforeEach(() => {
    localStorage.clear()
    bootstrap()
  })

  it('menanam Chart of Accounts lima digit dan kategori bawaan', () => {
    const accounts = getAccounts()
    expect(accounts.length).toBeGreaterThan(0)
    expect(getCategories().length).toBeGreaterThan(0)
    for (const acc of accounts) {
      expect(acc.code).toMatch(/^\d{5}$/)
    }
  })

  it('memulai tanpa transaksi dan tanpa baris ledger', () => {
    expect(getTransactions()).toHaveLength(0)
    expect(getLedgerEntries()).toHaveLength(0)
  })
})

describe('UAT-02 — Alur pencatatan sampai pelaporan', () => {
  beforeEach(() => {
    localStorage.clear()
    bootstrap()
  })

  it('mencatat pemasukan lalu menghasilkan dua baris ledger yang seimbang', async () => {
    await postTransaction({
      mutationType: 'INCOME',
      amount: 5_000_000,
      transactionDate: '2026-09-01',
      description: 'Pembayaran proyek',
      destinationAccountId: accountId('10200'),
      categoryAccountId: accountId('40100'),
    })

    const entries = getLedgerEntries()
    expect(entries).toHaveLength(2)

    const debit = entries.reduce((s, e) => s + (e.entryType === 'DEBIT' ? e.amount : 0), 0)
    const credit = entries.reduce((s, e) => s + (e.entryType === 'CREDIT' ? e.amount : 0), 0)
    expect(debit - credit).toBe(0)
  })

  it('mencerminkan transaksi pada Laba Rugi, Neraca, dan Arus Kas', async () => {
    await postTransaction({
      mutationType: 'INCOME',
      amount: 5_000_000,
      transactionDate: '2026-09-01',
      description: 'Pembayaran proyek',
      destinationAccountId: accountId('10200'),
      categoryAccountId: accountId('40100'),
    })
    await postTransaction({
      mutationType: 'EXPENSE',
      amount: 1_200_000,
      transactionDate: '2026-09-05',
      description: 'Sewa kantor',
      sourceAccountId: accountId('10200'),
      categoryAccountId: accountId('60200'),
    })

    const range = { from: '2026-09-01', to: '2026-09-30' }

    const pl = profitAndLoss(range)
    expect(pl.netProfit).toBe(5_000_000 - 1_200_000)

    const bs = balanceSheet('2026-09-30')
    expect(bs.isBalanced).toBe(true)

    const cf = cashFlow(range)
    expect(cf.closingBalance - cf.openingBalance).toBe(3_800_000)
    expect(cf.netChange).toBe(3_800_000)

    expect(generalLedger({})).toHaveLength(4)
  })
})

describe('UAT-03 — Koreksi lewat jurnal pembalik', () => {
  beforeEach(() => {
    localStorage.clear()
    bootstrap()
  })

  it('menandai transaksi asal VOID tanpa menghapus baris ledger mana pun', async () => {
    const posted = await postTransaction({
      mutationType: 'EXPENSE',
      amount: 750_000,
      transactionDate: '2026-09-10',
      description: 'Pembelian keliru',
      sourceAccountId: accountId('10200'),
      categoryAccountId: accountId('60200'),
    })

    const before = getLedgerEntries().length
    await reverseTransaction(posted.transaction.id)
    const after = getLedgerEntries()

    // Baris lama tetap ada; jurnal pembalik ditambahkan, bukan menggantikan.
    expect(after.length).toBe(before * 2)

    const original = getTransactions().find((t) => t.id === posted.transaction.id)
    expect(original?.status).toBe('VOID')

    // Efek bersih terhadap laporan menjadi nol.
    const pl = profitAndLoss({ from: '2026-09-01', to: '2026-09-30' })
    expect(pl.netProfit).toBe(0)
  })
})

describe('UAT-04 — Integritas rantai hash', () => {
  beforeEach(() => {
    localStorage.clear()
    bootstrap()
  })

  it('melaporkan rantai valid setelah serangkaian transaksi', async () => {
    for (let i = 0; i < 5; i += 1) {
      await postTransaction({
        mutationType: 'INCOME',
        amount: 100_000 + i,
        transactionDate: '2026-09-02',
        description: `Pemasukan ${i}`,
        destinationAccountId: accountId('10200'),
        categoryAccountId: accountId('40100'),
      })
    }

    const result = await verifyChain()
    expect(result.valid).toBe(true)
  })
})

describe('UAT-05 — Cadangan dan pemulihan', () => {
  beforeEach(() => {
    localStorage.clear()
    bootstrap()
  })

  it('memulihkan seluruh data dari berkas ekspor setelah reset', async () => {
    await postTransaction({
      mutationType: 'INCOME',
      amount: 2_500_000,
      transactionDate: '2026-09-03',
      description: 'Termin pertama',
      destinationAccountId: accountId('10200'),
      categoryAccountId: accountId('40100'),
    })

    const backup = exportBackup()
    const txBefore = getTransactions().length
    const rowsBefore = getLedgerEntries().length

    resetAll()
    expect(getTransactions()).toHaveLength(0)

    importBackup(backup)
    expect(getTransactions()).toHaveLength(txBefore)
    expect(getLedgerEntries()).toHaveLength(rowsBefore)

    // Rantai tetap sahih setelah pemulihan.
    await expect(verifyChain()).resolves.toMatchObject({ valid: true })
  })

  it('menolak berkas cadangan yang rusak tanpa merusak data yang ada', () => {
    const txBefore = getTransactions().length
    expect(() => importBackup({ tidak: 'valid' } as never)).toThrow()
    expect(getTransactions()).toHaveLength(txBefore)
  })
})

describe('UAT-06 — Sentinel kebocoran kas', () => {
  beforeEach(() => {
    localStorage.clear()
    bootstrap()
  })

  it('menandai pengeluaran besar tanpa bukti sebagai ghost expense', async () => {
    await postTransaction({
      mutationType: 'EXPENSE',
      amount: 2_000_000,
      transactionDate: '2026-09-04',
      description: 'Pengeluaran tanpa bukti',
      sourceAccountId: accountId('10200'),
      categoryAccountId: accountId('60200'),
    })

    const summary = sentinelSummary()
    expect(summary.ghostExpenseCount).toBeGreaterThan(0)
    expect(summary.ghostExpenseTotal).toBe(2_000_000)
    expect(summary.totalWarnings).toBeGreaterThan(0)
  })
})
