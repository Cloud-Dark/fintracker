import { beforeEach, describe, expect, it } from 'vitest'

import { bootstrap, getAccounts } from '@/repositories/db'
import { postTransaction, reverseTransaction } from '@/domain/kernel'
import {
  balanceSheet,
  cashFlow,
  dashboardSummary,
  generalLedger,
  profitAndLoss,
} from '@/domain/reporting'

function accountId(code: string): string {
  const acc = getAccounts().find((a) => a.code === code)
  if (!acc) throw new Error(`Akun ${code} tidak ada pada seed.`)
  return acc.id
}

const RANGE = { from: '2026-05-01', to: '2026-05-31' }

/**
 * Data uji dengan hasil yang sudah diketahui:
 * - Pendapatan operasional 40100: 10.000.000
 * - Pendapatan non-operasional 40200: 500.000
 * - HPP 50100: 2.000.000
 * - OPEX 60200: 1.500.000
 */
async function seedScenario(): Promise<void> {
  await postTransaction({
    mutationType: 'INCOME',
    amount: 10_000_000,
    transactionDate: '2026-05-02',
    description: 'Penjualan Jasa',
    destinationAccountId: accountId('10200'),
    categoryAccountId: accountId('40100'),
  })
  await postTransaction({
    mutationType: 'INCOME',
    amount: 500_000,
    transactionDate: '2026-05-03',
    description: 'Bunga bank',
    destinationAccountId: accountId('10200'),
    categoryAccountId: accountId('40200'),
  })
  await postTransaction({
    mutationType: 'EXPENSE',
    amount: 2_000_000,
    transactionDate: '2026-05-05',
    description: 'Subkontraktor',
    sourceAccountId: accountId('10200'),
    categoryAccountId: accountId('50100'),
    attachmentId: 'att-hpp',
  })
  await postTransaction({
    mutationType: 'EXPENSE',
    amount: 1_500_000,
    transactionDate: '2026-05-06',
    description: 'Marketing',
    sourceAccountId: accountId('10100'),
    categoryAccountId: accountId('60200'),
    attachmentId: 'att-mkt',
  })
  await postTransaction({
    mutationType: 'TRANSFER',
    amount: 1_000_000,
    transactionDate: '2026-05-07',
    description: 'Top up e-wallet',
    sourceAccountId: accountId('10200'),
    destinationAccountId: accountId('10300'),
  })
}

beforeEach(() => {
  localStorage.clear()
  bootstrap()
})

describe('profitAndLoss (FR-022)', () => {
  it('menghitung laba rugi multi-step sesuai formula spec 7.1', async () => {
    await seedScenario()
    const pl = profitAndLoss(RANGE)

    expect(pl.revenueOperating).toBe(10_000_000)
    expect(pl.cogs).toBe(2_000_000)
    expect(pl.grossProfit).toBe(8_000_000)
    expect(pl.opex).toBe(1_500_000)
    expect(pl.operatingProfit).toBe(6_500_000)
    expect(pl.revenueNonOperating).toBe(500_000)
    expect(pl.netProfit).toBe(7_000_000)

    expect(pl.lines.map((l) => l.code)).toEqual(['40100', '40200', '50100', '60200'])
  })

  it('mengecualikan transaksi VOID beserta pembaliknya dari agregasi', async () => {
    await seedScenario()
    const salah = await postTransaction({
      mutationType: 'EXPENSE',
      amount: 999_000,
      transactionDate: '2026-05-10',
      description: 'Salah catat',
      sourceAccountId: accountId('10100'),
      categoryAccountId: accountId('60300'),
    })
    await reverseTransaction(salah.transaction.id)

    const pl = profitAndLoss(RANGE)
    expect(pl.opex).toBe(1_500_000)
    expect(pl.netProfit).toBe(7_000_000)
  })

  it('mengabaikan transaksi di luar rentang tanggal', async () => {
    await seedScenario()
    const pl = profitAndLoss({ from: '2026-06-01', to: '2026-06-30' })
    expect(pl.revenueOperating).toBe(0)
    expect(pl.netProfit).toBe(0)
  })
})

describe('balanceSheet (FR-023)', () => {
  it('menegakkan Aset = Liabilitas + Ekuitas', async () => {
    await seedScenario()
    const bs = balanceSheet('2026-05-31')

    // Kas: bank 10.000.000 + 500.000 - 2.000.000 - 1.000.000 = 7.500.000
    // Kas tunai -1.500.000; e-wallet 1.000.000 => total aset 7.000.000
    expect(bs.assets).toBe(7_000_000)
    expect(bs.liabilities).toBe(0)
    expect(bs.retainedEarnings).toBe(7_000_000)
    expect(bs.equity).toBe(7_000_000)
    expect(bs.difference).toBe(0)
    expect(bs.isBalanced).toBe(true)
  })

  it('tetap seimbang setelah pembayaran utang', async () => {
    await seedScenario()
    await postTransaction({
      mutationType: 'DEBT_PAYMENT',
      amount: 400_000,
      transactionDate: '2026-05-20',
      description: 'Bayar utang vendor',
      sourceAccountId: accountId('10200'),
      categoryAccountId: accountId('20100'),
    })

    const bs = balanceSheet('2026-05-31')
    expect(bs.liabilities).toBe(-400_000)
    expect(bs.assets).toBe(6_600_000)
    expect(bs.isBalanced).toBe(true)
  })
})

describe('cashFlow (FR-024)', () => {
  it('mengelompokkan penerimaan dan pengeluaran kas aktual', async () => {
    await seedScenario()
    const cf = cashFlow(RANGE)

    // Operasi: +10.000.000 +500.000 -2.000.000 -1.500.000 = 7.000.000
    expect(cf.operating).toBe(7_000_000)
    expect(cf.financing).toBe(0)
    expect(cf.netChange).toBe(7_000_000)
    expect(cf.openingBalance).toBe(0)
    expect(cf.closingBalance).toBe(7_000_000)

    // Transfer antar kas dikecualikan dari ketiga aktivitas.
    const transferItems = [...cf.inflows, ...cf.outflows].filter((i) => i.activity === 'EXCLUDED')
    expect(transferItems).toHaveLength(2)
  })

  it('menghitung saldo awal dari mutasi sebelum rentang', async () => {
    await postTransaction({
      mutationType: 'INCOME',
      amount: 4_000_000,
      transactionDate: '2026-04-15',
      description: 'Pendapatan April',
      destinationAccountId: accountId('10200'),
      categoryAccountId: accountId('40100'),
    })
    await seedScenario()

    const cf = cashFlow(RANGE)
    expect(cf.openingBalance).toBe(4_000_000)
    expect(cf.closingBalance).toBe(11_000_000)
  })

  it('mengelompokkan pembayaran utang sebagai aktivitas pendanaan', async () => {
    await postTransaction({
      mutationType: 'DEBT_PAYMENT',
      amount: 600_000,
      transactionDate: '2026-05-21',
      description: 'Bayar utang',
      sourceAccountId: accountId('10100'),
      categoryAccountId: accountId('20100'),
    })
    const cf = cashFlow(RANGE)
    expect(cf.financing).toBe(-600_000)
    expect(cf.operating).toBe(0)
  })
})

describe('generalLedger (FR-021)', () => {
  it('mengembalikan baris terurut sequenceNum dengan nama akun dan deskripsi', async () => {
    await seedScenario()
    const rows = generalLedger()

    expect(rows).toHaveLength(10)
    const seqs = rows.map((r) => r.sequenceNum)
    expect([...seqs].sort((a, b) => a - b)).toEqual(seqs)
    expect(rows[0]?.accountCode).toBe('10200')
    expect(rows[0]?.accountName).toContain('Kas di Bank')
    expect(rows[0]?.description).toBe('Penjualan Jasa')
  })

  it('menerapkan filter akun, tipe entri, dan rentang tanggal', async () => {
    await seedScenario()

    const perAkun = generalLedger({ accountId: accountId('10100') })
    expect(perAkun.every((r) => r.accountCode === '10100')).toBe(true)
    expect(perAkun).toHaveLength(1)

    const hanyaDebit = generalLedger({ entryType: 'DEBIT' })
    expect(hanyaDebit.every((r) => r.entryType === 'DEBIT')).toBe(true)
    expect(hanyaDebit).toHaveLength(5)

    const rentang = generalLedger({ from: '2026-05-05', to: '2026-05-06' })
    expect(rentang).toHaveLength(4)
  })

  it('tetap menampilkan baris ledger transaksi VOID apa adanya', async () => {
    const posted = await postTransaction({
      mutationType: 'EXPENSE',
      amount: 300_000,
      transactionDate: '2026-05-12',
      description: 'Salah catat',
      sourceAccountId: accountId('10100'),
      categoryAccountId: accountId('60300'),
    })
    await reverseTransaction(posted.transaction.id)

    const rows = generalLedger()
    expect(rows).toHaveLength(4)
    expect(rows.filter((r) => r.status === 'VOID')).toHaveLength(2)
  })
})

describe('dashboardSummary (FR-020)', () => {
  it('meringkas kas, saldo aset, serta pemasukan dan pengeluaran bulan berjalan', async () => {
    await seedScenario()
    const summary = dashboardSummary(new Date(2026, 4, 31))

    expect(summary.month).toBe('2026-05')
    expect(summary.totalCash).toBe(7_000_000)
    expect(summary.monthIncome).toBe(10_500_000)
    expect(summary.monthExpense).toBe(3_500_000)
    expect(summary.transactionCount).toBe(5)
    expect(summary.assetBalances.map((l) => l.code)).toEqual(['10100', '10200', '10300'])
  })
})
