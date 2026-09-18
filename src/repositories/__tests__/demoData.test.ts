// Uji data contoh: memastikan seluruh transaksi peragaan lolos invarian kernel
// yang sama seperti input pengguna, bukan sekadar tertulis ke penyimpanan.

import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_TRANSACTION_COUNT, hasDemoData, loadDemoData } from '@/repositories/demoData'
import { getAccounts, getLedgerEntries, getTransactions, resetAll } from '@/repositories/db'
import { verifyChain } from '@/domain/kernel'
import { agingReceivables, ghostExpenses, sentinelSummary } from '@/domain/sentinel'
import { balanceSheet, profitAndLoss } from '@/domain/reporting'
import { toISODate } from '@/lib/date'

describe('demoData', () => {
  beforeEach(() => {
    resetAll()
  })

  it('memposting seluruh transaksi contoh', async () => {
    const result = await loadDemoData()
    expect(result.skipped).toBe(false)
    expect(result.posted).toBe(DEMO_TRANSACTION_COUNT)
    expect(getTransactions()).toHaveLength(DEMO_TRANSACTION_COUNT)
    // Setiap transaksi menghasilkan tepat dua baris jurnal.
    expect(getLedgerEntries()).toHaveLength(DEMO_TRANSACTION_COUNT * 2)
  })

  it('bersifat idempoten pada pemanggilan kedua', async () => {
    await loadDemoData()
    expect(hasDemoData()).toBe(true)

    const second = await loadDemoData()
    expect(second.skipped).toBe(true)
    expect(second.posted).toBe(0)
    expect(getTransactions()).toHaveLength(DEMO_TRANSACTION_COUNT)
  })

  it('menjaga invarian debit sama dengan kredit', async () => {
    await loadDemoData()

    let debit = 0
    let credit = 0
    for (const entry of getLedgerEntries()) {
      if (entry.entryType === 'DEBIT') debit += entry.amount
      else credit += entry.amount
    }

    expect(debit).toBe(credit)
    expect(debit).toBeGreaterThan(0)
  })

  it('menghasilkan rantai hash yang utuh', async () => {
    await loadDemoData()
    const verification = await verifyChain()

    expect(verification.valid).toBe(true)
    expect(verification.brokenAt).toBeNull()
    expect(verification.checked).toBe(DEMO_TRANSACTION_COUNT * 2)
  })

  it('menjaga persamaan neraca aset = liabilitas + ekuitas + laba berjalan', async () => {
    await loadDemoData()
    const sheet = balanceSheet(toISODate(new Date()))

    expect(sheet.isBalanced).toBe(true)
    expect(sheet.difference).toBe(0)
  })

  it('mengisi laporan laba rugi dengan pendapatan dan beban', async () => {
    await loadDemoData()
    const pnl = profitAndLoss({ from: '1970-01-01', to: toISODate(new Date()) })

    expect(pnl.revenueOperating).toBeGreaterThan(0)
    expect(pnl.cogs).toBeGreaterThan(0)
    expect(pnl.opex).toBeGreaterThan(0)
    expect(pnl.revenueNonOperating).toBeGreaterThan(0)
  })

  it('mengisi keempat bucket aging piutang', async () => {
    await loadDemoData()
    const aging = agingReceivables()

    // Invoice tertua sudah dilunasi FIFO, menyisakan tiga piutang terbuka
    // yang jatuh pada bucket 0-29, 30-59, dan 60-89.
    expect(aging.buckets['0-29'].items.length).toBeGreaterThan(0)
    expect(aging.buckets['30-59'].items.length).toBeGreaterThan(0)
    expect(aging.buckets['60-89'].items.length).toBeGreaterThan(0)
    expect(aging.total).toBe(12_750_000 + 9_200_000 + 6_400_000)
  })

  it('memunculkan ghost expense dan ringkasan sentinel', async () => {
    await loadDemoData()
    const ghosts = ghostExpenses()
    const summary = sentinelSummary()

    // Seluruh pengeluaran contoh dicatat tanpa lampiran bukti bayar,
    // sehingga yang di atas Rp 1.000.000 wajib tertandai.
    expect(ghosts.length).toBeGreaterThan(0)
    expect(ghosts.every((g) => g.amount > 1_000_000)).toBe(true)
    expect(summary.ghostExpenseCount).toBe(ghosts.length)
    expect(summary.totalWarnings).toBeGreaterThan(0)
  })

  it('menyediakan pasangan pengeluaran duplikat dalam jendela 48 jam', async () => {
    await loadDemoData()
    const langganan = getTransactions().filter(
      (tx) => tx.description === 'Langganan tahunan paket kolaborasi tim'
    )

    expect(langganan).toHaveLength(2)
    expect(langganan[0].amount).toBe(langganan[1].amount)
  })

  it('memakai ketiga akun kas sehingga saldo tidak menumpuk di satu dompet', async () => {
    await loadDemoData()
    const byCode = new Map(getAccounts().map((a) => [a.code, a]))

    for (const code of ['10100', '10200', '10300']) {
      const account = byCode.get(code)
      expect(account, `akun ${code} harus ada`).toBeDefined()
      expect(account?.currentBalance, `saldo akun ${code}`).toBeGreaterThan(0)
    }
  })
})
