import { beforeAll, describe, expect, it } from 'vitest'

import { bootstrap, getAccounts, getLedgerEntries } from '@/repositories/db'
import { postTransaction, verifyChain } from '@/domain/kernel'
import { balanceSheet, cashFlow, generalLedger, profitAndLoss } from '@/domain/reporting'
import { agingReceivables, ghostExpenses } from '@/domain/sentinel'

/**
 * Tolok ukur NFR: render laporan di bawah 500 ms pada volume ledger besar.
 *
 * Uji ini mengukur waktu komputasi laporan murni, bukan waktu lukis peramban.
 * Ambang sengaja dipasang longgar agar tidak rapuh pada mesin CI yang lambat,
 * namun tetap gagal bila terjadi regresi algoritmik (misalnya perhitungan
 * saldo yang berubah menjadi kuadratik terhadap jumlah baris).
 */

/**
 * Jumlah transaksi; setiap transaksi menghasilkan dua baris ledger berpasangan.
 *
 * Nilai 3.000 dipilih karena merupakan volume terbesar yang masih muat pada
 * kuota `localStorage` 5 MB. Pengukuran kapasitas menunjukkan batas keras
 * berada pada sekitar 3.732 transaksi (7.464 baris ledger, rasio pemakaian
 * 0,954) sebelum peramban melempar `QuotaExceededError`. Target NFR semula
 * sebesar 10.000 baris ledger karena itu TIDAK dapat dipenuhi pada arsitektur
 * penyimpanan saat ini; lihat 10_RISK_REGISTER.md butir R-009.
 */
const TRANSACTION_COUNT = 3_000
const TARGET_LEDGER_ROWS = TRANSACTION_COUNT * 2
const THRESHOLD_MS = 500

function accountId(code: string): string {
  const acc = getAccounts().find((a) => a.code === code)
  if (!acc) throw new Error(`Akun ${code} tidak ada pada seed.`)
  return acc.id
}

function elapsed(label: string, fn: () => unknown): number {
  const start = performance.now()
  fn()
  const ms = performance.now() - start
  console.log(`[perf] ${label}: ${ms.toFixed(1)} ms`)
  return ms
}

describe(`Tolok ukur laporan pada ${TARGET_LEDGER_ROWS} baris ledger`, () => {
  beforeAll(async () => {
    localStorage.clear()
    bootstrap()

    const kas = accountId('10200')
    const pendapatan = accountId('40100')
    const beban = accountId('60200')

    // Selang-seling pemasukan dan pengeluaran sepanjang satu tahun penuh.
    for (let i = 0; i < TRANSACTION_COUNT; i += 1) {
      const day = (i % 28) + 1
      const month = (i % 12) + 1
      const date = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

      if (i % 2 === 0) {
        await postTransaction({
          mutationType: 'INCOME',
          amount: 100_000 + i,
          transactionDate: date,
          description: `Pemasukan ${i}`,
          destinationAccountId: kas,
          categoryAccountId: pendapatan,
        })
      } else {
        await postTransaction({
          mutationType: 'EXPENSE',
          amount: 50_000 + i,
          transactionDate: date,
          description: `Pengeluaran ${i}`,
          sourceAccountId: kas,
          categoryAccountId: beban,
        })
      }
    }
  }, 300_000)

  it(`menghasilkan ${TARGET_LEDGER_ROWS} baris ledger`, () => {
    expect(getLedgerEntries()).toHaveLength(TARGET_LEDGER_ROWS)
  })

  it('menghitung Laba Rugi di bawah ambang', () => {
    const ms = elapsed('profitAndLoss', () =>
      profitAndLoss({ from: '2026-01-01', to: '2026-12-31' })
    )
    expect(ms).toBeLessThan(THRESHOLD_MS)
  })

  it('menghitung Neraca di bawah ambang', () => {
    const ms = elapsed('balanceSheet', () => balanceSheet('2026-12-31'))
    expect(ms).toBeLessThan(THRESHOLD_MS)
  })

  it('menghitung Arus Kas di bawah ambang', () => {
    const ms = elapsed('cashFlow', () => cashFlow({ from: '2026-01-01', to: '2026-12-31' }))
    expect(ms).toBeLessThan(THRESHOLD_MS)
  })

  it('menyusun Buku Besar penuh di bawah ambang', () => {
    const ms = elapsed('generalLedger', () => generalLedger({}))
    expect(ms).toBeLessThan(THRESHOLD_MS)
  })

  it('menjalankan sentinel di bawah ambang', () => {
    const ms = elapsed('sentinel', () => {
      agingReceivables()
      ghostExpenses()
    })
    expect(ms).toBeLessThan(THRESHOLD_MS)
  })

  it('memverifikasi rantai hash penuh dan melaporkan durasinya', async () => {
    const start = performance.now()
    const result = await verifyChain()
    const ms = performance.now() - start
    console.log(`[perf] verifyChain (${TARGET_LEDGER_ROWS} baris): ${ms.toFixed(1)} ms`)

    // Verifikasi rantai bersifat kriptografis dan sekuensial, sehingga tidak
    // terikat ambang 500 ms yang berlaku untuk laporan. Yang diuji di sini
    // adalah kebenarannya; durasi dicatat sebagai informasi.
    expect(result.valid).toBe(true)
  }, 120_000)
})
