import { beforeEach, describe, expect, it } from 'vitest'

import { bootstrap, getAccounts, getLedgerEntries, getTransactions } from '@/repositories/db'
import { KEYS } from '@/repositories/storage'
import {
  assertBalanced,
  postTransaction,
  recomputeBalances,
  reverseTransaction,
  verifyChain,
} from '@/domain/kernel'
import { resolvePosting } from '@/domain/postingRules'
import { ImmutableLedgerError, LedgerImbalanceError, ValidationError } from '@/domain/errors'
import {
  agingReceivables,
  detectDuplicateOutflow,
  ghostExpenses,
  sentinelSummary,
} from '@/domain/sentinel'
import { GENESIS_HASH } from '@/lib/hash'
import type { LedgerEntry } from '@/types'

function accountId(code: string): string {
  const acc = getAccounts().find((a) => a.code === code)
  if (!acc) throw new Error(`Akun ${code} tidak ada pada seed.`)
  return acc.id
}

beforeEach(() => {
  localStorage.clear()
  bootstrap()
})

describe('resolvePosting — aturan posting per tipe mutasi', () => {
  it('INCOME mendebit kas dan mengkredit pendapatan', () => {
    const legs = resolvePosting({
      mutationType: 'INCOME',
      amount: 5_000_000,
      destinationAccountId: 'kas',
      categoryAccountId: 'pendapatan',
    })
    expect(legs).toEqual([
      { accountId: 'kas', entryType: 'DEBIT', amount: 5_000_000 },
      { accountId: 'pendapatan', entryType: 'CREDIT', amount: 5_000_000 },
    ])
  })

  it('EXPENSE mendebit beban dan mengkredit kas', () => {
    const legs = resolvePosting({
      mutationType: 'EXPENSE',
      amount: 1_200_000,
      sourceAccountId: 'kas',
      categoryAccountId: 'beban',
    })
    expect(legs[0]).toEqual({ accountId: 'beban', entryType: 'DEBIT', amount: 1_200_000 })
    expect(legs[1]).toEqual({ accountId: 'kas', entryType: 'CREDIT', amount: 1_200_000 })
  })

  it('TRANSFER mendebit tujuan dan mengkredit sumber', () => {
    const legs = resolvePosting({
      mutationType: 'TRANSFER',
      amount: 2_000_000,
      sourceAccountId: 'bank',
      destinationAccountId: 'ewallet',
    })
    expect(legs[0]?.accountId).toBe('ewallet')
    expect(legs[1]?.accountId).toBe('bank')
  })

  it('DEBT_PAYMENT mendebit utang usaha dan mengkredit kas', () => {
    const legs = resolvePosting({
      mutationType: 'DEBT_PAYMENT',
      amount: 750_000,
      sourceAccountId: 'kas',
      categoryAccountId: 'utang',
    })
    expect(legs[0]).toEqual({ accountId: 'utang', entryType: 'DEBIT', amount: 750_000 })
    expect(legs[1]).toEqual({ accountId: 'kas', entryType: 'CREDIT', amount: 750_000 })
  })

  it('menolak bila akun yang dibutuhkan tidak lengkap', () => {
    expect(() =>
      resolvePosting({ mutationType: 'INCOME', amount: 1000, destinationAccountId: 'kas' })
    ).toThrow(ValidationError)
  })
})

describe('assertBalanced', () => {
  it('menerima pasangan seimbang untuk keempat tipe mutasi', () => {
    const inputs = [
      resolvePosting({
        mutationType: 'INCOME',
        amount: 100,
        destinationAccountId: 'a',
        categoryAccountId: 'b',
      }),
      resolvePosting({
        mutationType: 'EXPENSE',
        amount: 100,
        sourceAccountId: 'a',
        categoryAccountId: 'b',
      }),
      resolvePosting({
        mutationType: 'TRANSFER',
        amount: 100,
        sourceAccountId: 'a',
        destinationAccountId: 'b',
      }),
      resolvePosting({
        mutationType: 'DEBT_PAYMENT',
        amount: 100,
        sourceAccountId: 'a',
        categoryAccountId: 'b',
      }),
    ]
    for (const legs of inputs) {
      expect(() => assertBalanced(legs)).not.toThrow()
      const delta = legs.reduce((d, l) => d + (l.entryType === 'DEBIT' ? l.amount : -l.amount), 0)
      expect(delta).toBe(0)
    }
  })

  it('menolak transaksi dengan delta bukan nol', () => {
    expect(() =>
      assertBalanced([
        { accountId: 'a', entryType: 'DEBIT', amount: 100 },
        { accountId: 'b', entryType: 'CREDIT', amount: 90 },
      ])
    ).toThrow(LedgerImbalanceError)
  })
})

describe('postTransaction', () => {
  it('menulis dua baris ledger seimbang dan memperbarui saldo akun', async () => {
    const { entries } = await postTransaction({
      mutationType: 'INCOME',
      amount: 5_000_000,
      transactionDate: '2026-01-05',
      description: 'Penjualan Jasa',
      destinationAccountId: accountId('10200'),
      categoryAccountId: accountId('40100'),
    })

    expect(entries).toHaveLength(2)
    expect(entries[0]?.entryType).toBe('DEBIT')
    expect(entries[1]?.entryType).toBe('CREDIT')
    expect(getLedgerEntries()).toHaveLength(2)

    const bank = getAccounts().find((a) => a.code === '10200')
    expect(bank?.currentBalance).toBe(5_000_000)
    expect(recomputeBalances().get(accountId('40100'))).toBe(5_000_000)
  })

  it('menolak nominal bukan bilangan bulat positif dan tanggal tidak valid', async () => {
    await expect(
      postTransaction({
        mutationType: 'INCOME',
        amount: -1,
        transactionDate: '2026-01-05',
        destinationAccountId: accountId('10200'),
        categoryAccountId: accountId('40100'),
      })
    ).rejects.toBeInstanceOf(ValidationError)

    await expect(
      postTransaction({
        mutationType: 'INCOME',
        amount: 1000,
        transactionDate: 'bukan-tanggal',
        destinationAccountId: accountId('10200'),
        categoryAccountId: accountId('40100'),
      })
    ).rejects.toBeInstanceOf(ValidationError)

    expect(getLedgerEntries()).toHaveLength(0)
  })

  it('idempoten terhadap clientTxId yang sama', async () => {
    const input = {
      mutationType: 'EXPENSE' as const,
      amount: 250_000,
      transactionDate: '2026-01-06',
      description: 'Software',
      sourceAccountId: accountId('10100'),
      categoryAccountId: accountId('60300'),
      clientTxId: 'tx-idem-1',
    }
    const first = await postTransaction(input)
    const second = await postTransaction(input)

    expect(second.transaction.id).toBe(first.transaction.id)
    expect(second.entries.map((e) => e.id)).toEqual(first.entries.map((e) => e.id))
    expect(getTransactions()).toHaveLength(1)
    expect(getLedgerEntries()).toHaveLength(2)
  })

  it('sequenceNum monotonic global lintas transaksi', async () => {
    for (let i = 0; i < 3; i += 1) {
      await postTransaction({
        mutationType: 'EXPENSE',
        amount: 100_000 + i,
        transactionDate: '2026-01-07',
        description: `Beban ${i}`,
        sourceAccountId: accountId('10100'),
        categoryAccountId: accountId('60200'),
      })
    }
    const seqs = getLedgerEntries().map((e) => e.sequenceNum)
    expect(seqs).toEqual([1, 2, 3, 4, 5, 6])
    expect(new Set(seqs).size).toBe(seqs.length)
  })
})

describe('reverseTransaction (FR-003)', () => {
  it('membalik setiap leg, mem-VOID transaksi asal, dan tidak menyentuh ledger asal', async () => {
    const posted = await postTransaction({
      mutationType: 'EXPENSE',
      amount: 500_000,
      transactionDate: '2026-01-08',
      description: 'Marketing',
      sourceAccountId: accountId('10100'),
      categoryAccountId: accountId('60200'),
    })
    const before = JSON.stringify(
      getLedgerEntries().filter((e) => e.transactionId === posted.transaction.id)
    )

    const reversal = await reverseTransaction(posted.transaction.id)

    expect(reversal.transaction.reversesTransactionId).toBe(posted.transaction.id)
    expect(reversal.entries.map((e) => e.entryType)).toEqual(['CREDIT', 'DEBIT'])
    expect(reversal.entries.map((e) => e.accountId)).toEqual(posted.entries.map((e) => e.accountId))

    const original = getTransactions().find((t) => t.id === posted.transaction.id)
    expect(original?.status).toBe('VOID')

    const after = JSON.stringify(
      getLedgerEntries().filter((e) => e.transactionId === posted.transaction.id)
    )
    expect(after).toBe(before)

    // Saldo bersih kembali nol setelah pembalikan.
    expect(recomputeBalances().get(accountId('10100'))).toBe(0)
  })

  it('menolak reversal ganda dan transaksi yang sudah VOID', async () => {
    const posted = await postTransaction({
      mutationType: 'EXPENSE',
      amount: 400_000,
      transactionDate: '2026-01-09',
      description: 'Server',
      sourceAccountId: accountId('10200'),
      categoryAccountId: accountId('50200'),
    })
    await reverseTransaction(posted.transaction.id)
    await expect(reverseTransaction(posted.transaction.id)).rejects.toBeInstanceOf(
      ImmutableLedgerError
    )
  })
})

describe('verifyChain (FR-040)', () => {
  it('rantai valid setelah beberapa transaksi, entri pertama memakai genesis hash', async () => {
    await postTransaction({
      mutationType: 'INCOME',
      amount: 1_000_000,
      transactionDate: '2026-02-01',
      description: 'Jasa',
      destinationAccountId: accountId('10200'),
      categoryAccountId: accountId('40100'),
    })
    await postTransaction({
      mutationType: 'TRANSFER',
      amount: 300_000,
      transactionDate: '2026-02-02',
      description: 'Top up e-wallet',
      sourceAccountId: accountId('10200'),
      destinationAccountId: accountId('10300'),
    })

    const entries = getLedgerEntries()
    expect(entries[0]?.prevHash).toBe(GENESIS_HASH)
    for (let i = 1; i < entries.length; i += 1) {
      expect(entries[i]?.prevHash).toBe(entries[i - 1]?.entryHash)
    }

    const result = await verifyChain()
    expect(result).toEqual({ valid: true, brokenAt: null, checked: entries.length })
  })

  it('mendeteksi entri yang dirusak secara sintetis', async () => {
    await postTransaction({
      mutationType: 'INCOME',
      amount: 1_000_000,
      transactionDate: '2026-02-03',
      description: 'Jasa',
      destinationAccountId: accountId('10200'),
      categoryAccountId: accountId('40100'),
    })

    const tampered = getLedgerEntries() as LedgerEntry[]
    const victim = tampered[1] as LedgerEntry
    victim.amount = 9_999_999
    localStorage.setItem(KEYS.ledgerEntries, JSON.stringify(tampered))

    const result = await verifyChain()
    expect(result.valid).toBe(false)
    expect(result.brokenAt).toBe(victim.id)
  })
})

describe('sentinel (FR-030..FR-032)', () => {
  async function piutang(amount: number, date: string, desc: string): Promise<void> {
    await postTransaction({
      mutationType: 'INCOME',
      amount,
      transactionDate: date,
      description: desc,
      destinationAccountId: accountId('10400'),
      categoryAccountId: accountId('40100'),
    })
  }

  it('mengelompokkan piutang ke bucket 0-29/30-59/60-89/90+', async () => {
    await piutang(100_000, '2026-03-20', 'Invoice A') // 11 hari
    await piutang(200_000, '2026-02-20', 'Invoice B') // 39 hari
    await piutang(300_000, '2026-01-20', 'Invoice C') // 70 hari
    await piutang(400_000, '2025-11-20', 'Invoice D') // 131 hari

    const aging = agingReceivables('2026-03-31')
    expect(aging.buckets['0-29'].total).toBe(100_000)
    expect(aging.buckets['30-59'].total).toBe(200_000)
    expect(aging.buckets['60-89'].total).toBe(300_000)
    expect(aging.buckets['90+'].total).toBe(400_000)
    expect(aging.total).toBe(1_000_000)
    expect(aging.buckets['90+'].items).toHaveLength(1)

    expect(sentinelSummary('2026-03-31').agingOverdueCount).toBe(3)
  })

  it('mendeteksi pengeluaran duplikat hanya di dalam jendela 48 jam', async () => {
    await postTransaction({
      mutationType: 'EXPENSE',
      amount: 750_000,
      transactionDate: '2026-04-01T09:00:00.000Z',
      description: '  Sewa Server  ',
      sourceAccountId: accountId('10200'),
      categoryAccountId: accountId('50200'),
    })

    const cocok = detectDuplicateOutflow({
      amount: 750_000,
      description: 'sewa server',
      transactionDate: '2026-04-02T09:00:00.000Z',
    })
    expect(cocok).toHaveLength(1)

    const diLuarJendela = detectDuplicateOutflow({
      amount: 750_000,
      description: 'sewa server',
      transactionDate: '2026-04-05T09:00:00.000Z',
    })
    expect(diLuarJendela).toHaveLength(0)

    const bedaNominal = detectDuplicateOutflow({
      amount: 750_001,
      description: 'sewa server',
      transactionDate: '2026-04-02T09:00:00.000Z',
    })
    expect(bedaNominal).toHaveLength(0)
  })

  it('menandai pengeluaran di atas 1 juta tanpa lampiran sebagai Unverified', async () => {
    const tanpaBukti = await postTransaction({
      mutationType: 'EXPENSE',
      amount: 2_000_000,
      transactionDate: '2026-04-10',
      description: 'Gaji tim',
      sourceAccountId: accountId('10200'),
      categoryAccountId: accountId('60100'),
    })
    await postTransaction({
      mutationType: 'EXPENSE',
      amount: 3_000_000,
      transactionDate: '2026-04-11',
      description: 'Subkontraktor',
      sourceAccountId: accountId('10200'),
      categoryAccountId: accountId('50100'),
      attachmentId: 'att-1',
    })
    await postTransaction({
      mutationType: 'EXPENSE',
      amount: 500_000,
      transactionDate: '2026-04-12',
      description: 'Kecil',
      sourceAccountId: accountId('10100'),
      categoryAccountId: accountId('60300'),
    })

    const ghosts = ghostExpenses()
    expect(ghosts).toHaveLength(1)
    expect(ghosts[0]?.transactionId).toBe(tanpaBukti.transaction.id)
    expect(ghosts[0]?.status).toBe('Unverified')
    expect(tanpaBukti.transaction.isVerified).toBe(false)
  })
})
