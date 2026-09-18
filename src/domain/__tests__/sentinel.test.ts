import { beforeEach, describe, expect, it } from 'vitest'

import { bootstrap, getAccounts, getTransactions } from '@/repositories/db'
import { postTransaction } from '@/domain/kernel'
import {
  DUPLICATE_WINDOW_HOURS,
  GHOST_EXPENSE_THRESHOLD,
  RECEIVABLE_CODE,
  agingReceivables,
  detectDuplicateOutflow,
  ghostExpenses,
  sentinelSummary,
  type AgingBucketKey,
} from '@/domain/sentinel'

function accountId(code: string): string {
  const acc = getAccounts().find((a) => a.code === code)
  if (!acc) throw new Error(`Akun ${code} tidak ada pada seed.`)
  return acc.id
}

beforeEach(() => {
  localStorage.clear()
  bootstrap()
})

/** Tanggal acuan tetap; seluruh uji deterministik dan tidak memakai waktu nyata. */
const AS_OF = '2026-06-30'

/**
 * Tanggal transaksi yang berjarak persis `ageDays` hari sebelum AS_OF,
 * dihitung dari kalender (bukan dari jam berjalan).
 */
const TANGGAL_UMUR: Record<number, string> = {
  0: '2026-06-30',
  29: '2026-06-01',
  30: '2026-05-31',
  59: '2026-05-02',
  60: '2026-05-01',
  89: '2026-04-02',
  90: '2026-04-01',
  200: '2025-12-12',
}

/** Piutang: INCOME yang mendebit 10400 (Piutang Usaha) dan mengkredit pendapatan. */
async function piutang(amount: number, date: string, desc: string): Promise<string> {
  const { transaction } = await postTransaction({
    mutationType: 'INCOME',
    amount,
    transactionDate: date,
    description: desc,
    destinationAccountId: accountId(RECEIVABLE_CODE),
    categoryAccountId: accountId('40100'),
  })
  return transaction.id
}

/** Pelunasan: TRANSFER dari 10400 ke bank -> mengkredit (mengurangi) piutang. */
async function lunasi(amount: number, date: string, desc: string): Promise<void> {
  await postTransaction({
    mutationType: 'TRANSFER',
    amount,
    transactionDate: date,
    description: desc,
    sourceAccountId: accountId(RECEIVABLE_CODE),
    destinationAccountId: accountId('10200'),
  })
}

async function beban(
  amount: number,
  date: string,
  desc: string,
  attachmentId: string | null = null
): Promise<string> {
  const { transaction } = await postTransaction({
    mutationType: 'EXPENSE',
    amount,
    transactionDate: date,
    description: desc,
    sourceAccountId: accountId('10200'),
    categoryAccountId: accountId('60300'),
    attachmentId,
  })
  return transaction.id
}

describe('agingReceivables (FR-030) — batas bucket', () => {
  it.each<[number, AgingBucketKey]>([
    [29, '0-29'],
    [30, '30-59'],
    [59, '30-59'],
    [60, '60-89'],
    [89, '60-89'],
    [90, '90+'],
  ])('umur %i hari masuk bucket %s', async (umur, bucket) => {
    await piutang(1_000_000, TANGGAL_UMUR[umur] as string, `Invoice ${String(umur)}`)

    const aging = agingReceivables(AS_OF)

    expect(aging.items).toHaveLength(1)
    expect(aging.items[0]?.ageDays).toBe(umur)
    expect(aging.items[0]?.bucket).toBe(bucket)
    expect(aging.buckets[bucket].total).toBe(1_000_000)
    expect(aging.buckets[bucket].items).toHaveLength(1)

    // Bucket lain kosong.
    const lain = (['0-29', '30-59', '60-89', '90+'] as const).filter((b) => b !== bucket)
    for (const b of lain) {
      expect(aging.buckets[b].total).toBe(0)
      expect(aging.buckets[b].items).toHaveLength(0)
    }
  })

  it('total per bucket menjumlahkan beberapa piutang dengan benar', async () => {
    await piutang(100_000, TANGGAL_UMUR[29] as string, 'A29')
    await piutang(200_000, TANGGAL_UMUR[30] as string, 'B30')
    await piutang(300_000, TANGGAL_UMUR[59] as string, 'C59')
    await piutang(400_000, TANGGAL_UMUR[60] as string, 'D60')
    await piutang(500_000, TANGGAL_UMUR[89] as string, 'E89')
    await piutang(600_000, TANGGAL_UMUR[90] as string, 'F90')
    await piutang(700_000, TANGGAL_UMUR[200] as string, 'G200')

    const aging = agingReceivables(AS_OF)

    expect(aging.asOf).toBe(AS_OF)
    expect(aging.buckets['0-29'].total).toBe(100_000)
    expect(aging.buckets['30-59'].total).toBe(200_000 + 300_000)
    expect(aging.buckets['60-89'].total).toBe(400_000 + 500_000)
    expect(aging.buckets['90+'].total).toBe(600_000 + 700_000)
    expect(aging.total).toBe(2_800_000)

    expect(aging.buckets['0-29'].items).toHaveLength(1)
    expect(aging.buckets['30-59'].items).toHaveLength(2)
    expect(aging.buckets['60-89'].items).toHaveLength(2)
    expect(aging.buckets['90+'].items).toHaveLength(2)

    // Jumlah tiap bucket = total, dan setiap bucket menyimpan key-nya sendiri.
    const jumlahBucket = (['0-29', '30-59', '60-89', '90+'] as const).reduce((s, b) => {
      expect(aging.buckets[b].bucket).toBe(b)
      return s + aging.buckets[b].total
    }, 0)
    expect(jumlahBucket).toBe(aging.total)
    expect(aging.items).toHaveLength(7)
  })

  it('piutang yang sudah lunas tidak ikut terhitung', async () => {
    await piutang(1_000_000, TANGGAL_UMUR[90] as string, 'Invoice lunas (tertua)')
    await piutang(250_000, TANGGAL_UMUR[29] as string, 'Invoice belum lunas')

    // Pelunasan FIFO: melunasi invoice tertua lebih dulu.
    await lunasi(1_000_000, TANGGAL_UMUR[0] as string, 'Pelunasan invoice tertua')

    const aging = agingReceivables(AS_OF)

    expect(aging.total).toBe(250_000)
    expect(aging.items).toHaveLength(1)
    expect(aging.items[0]?.description).toBe('Invoice belum lunas')
    expect(aging.buckets['90+'].total).toBe(0)
    expect(aging.buckets['90+'].items).toHaveLength(0)
    expect(aging.buckets['0-29'].total).toBe(250_000)
  })

  it('pelunasan sebagian hanya menyisakan saldo yang belum tertutup', async () => {
    await piutang(1_000_000, TANGGAL_UMUR[60] as string, 'Invoice sebagian')
    await lunasi(400_000, TANGGAL_UMUR[0] as string, 'Cicilan pertama')

    const aging = agingReceivables(AS_OF)

    expect(aging.total).toBe(600_000)
    expect(aging.items).toHaveLength(1)
    expect(aging.items[0]?.amount).toBe(600_000)
    expect(aging.buckets['60-89'].total).toBe(600_000)
  })

  it('tanpa piutang sama sekali, seluruh bucket nol', () => {
    const aging = agingReceivables(AS_OF)
    expect(aging.total).toBe(0)
    expect(aging.items).toEqual([])
    for (const b of ['0-29', '30-59', '60-89', '90+'] as const) {
      expect(aging.buckets[b]).toEqual({ bucket: b, total: 0, items: [] })
    }
  })

  it('mutasi ke akun non-piutang tidak ikut ter-aging', async () => {
    await postTransaction({
      mutationType: 'INCOME',
      amount: 5_000_000,
      transactionDate: TANGGAL_UMUR[90] as string,
      description: 'Tunai, bukan piutang',
      destinationAccountId: accountId('10200'),
      categoryAccountId: accountId('40100'),
    })

    expect(agingReceivables(AS_OF).total).toBe(0)
  })
})

describe('detectDuplicateOutflow (FR-031) — jendela 48 jam', () => {
  const ASLI = '2026-04-01T09:00:00.000Z'

  beforeEach(async () => {
    await beban(750_000, ASLI, '  Sewa Server  ')
  })

  it('terdeteksi di dalam jendela 48 jam (termasuk tepat 48 jam, dua arah)', () => {
    expect(DUPLICATE_WINDOW_HOURS).toBe(48)

    const dalam = [
      '2026-04-01T09:00:00.000Z', // 0 jam
      '2026-04-02T09:00:00.000Z', // +24 jam
      '2026-04-03T09:00:00.000Z', // +48 jam tepat (inklusif)
      '2026-03-30T09:00:00.000Z', // -48 jam tepat (inklusif)
    ]
    for (const tanggal of dalam) {
      const hit = detectDuplicateOutflow({
        amount: 750_000,
        description: 'sewa server',
        transactionDate: tanggal,
      })
      expect(hit).toHaveLength(1)
      expect(hit[0]?.description).toBe('  Sewa Server  ')
    }
  })

  it('TIDAK terdeteksi di luar jendela 48 jam', () => {
    const luar = [
      '2026-04-03T09:00:00.001Z', // +48 jam lewat 1 ms
      '2026-04-05T09:00:00.000Z', // +96 jam
      '2026-03-30T08:59:59.999Z', // -48 jam kurang 1 ms
      '2026-03-25T09:00:00.000Z', // -168 jam
    ]
    for (const tanggal of luar) {
      expect(
        detectDuplicateOutflow({
          amount: 750_000,
          description: 'sewa server',
          transactionDate: tanggal,
        })
      ).toHaveLength(0)
    }
  })

  it('tidak terdeteksi bila nominal berbeda', () => {
    for (const amount of [750_001, 749_999, 1_500_000]) {
      expect(
        detectDuplicateOutflow({
          amount,
          description: 'sewa server',
          transactionDate: '2026-04-02T09:00:00.000Z',
        })
      ).toHaveLength(0)
    }
  })

  it('tidak terdeteksi bila deskripsi/vendor berbeda', () => {
    expect(
      detectDuplicateOutflow({
        amount: 750_000,
        description: 'Sewa Kantor',
        transactionDate: '2026-04-02T09:00:00.000Z',
      })
    ).toHaveLength(0)
  })

  it('mengabaikan transaksi non-EXPENSE dan status bukan POSTED', async () => {
    await postTransaction({
      mutationType: 'INCOME',
      amount: 750_000,
      transactionDate: '2026-04-02T09:00:00.000Z',
      description: 'Sewa Server',
      destinationAccountId: accountId('10200'),
      categoryAccountId: accountId('40100'),
    })

    const hit = detectDuplicateOutflow({
      amount: 750_000,
      description: 'sewa server',
      transactionDate: '2026-04-02T09:00:00.000Z',
    })
    expect(hit).toHaveLength(1)
    expect(hit[0]?.mutationType).toBe('EXPENSE')
  })

  it('mengecualikan transaksi yang disebut pada excludeTransactionId', () => {
    const existing = getTransactions().find((t) => t.mutationType === 'EXPENSE')
    expect(existing).toBeDefined()

    expect(
      detectDuplicateOutflow({
        amount: 750_000,
        description: 'sewa server',
        transactionDate: '2026-04-02T09:00:00.000Z',
        excludeTransactionId: existing?.id,
      })
    ).toHaveLength(0)
  })

  it('tanggal kandidat tidak valid tidak pernah dianggap duplikat', () => {
    expect(
      detectDuplicateOutflow({
        amount: 750_000,
        description: 'sewa server',
        transactionDate: 'bukan-tanggal',
      })
    ).toHaveLength(0)
  })

  it('CATATAN: akun sumber TIDAK ikut dibandingkan (lihat laporan temuan)', async () => {
    // DuplicateCandidate tidak punya field akun, sehingga pengeluaran dengan
    // nominal + deskripsi sama dari akun kas yang berbeda tetap dilaporkan
    // sebagai kandidat duplikat. Uji ini mendokumentasikan perilaku nyata.
    await postTransaction({
      mutationType: 'EXPENSE',
      amount: 750_000,
      transactionDate: '2026-04-02T09:00:00.000Z',
      description: 'Sewa Server',
      sourceAccountId: accountId('10100'), // kas tunai, berbeda dari 10200
      categoryAccountId: accountId('60300'),
    })

    const hit = detectDuplicateOutflow({
      amount: 750_000,
      description: 'sewa server',
      transactionDate: '2026-04-02T09:00:00.000Z',
    })
    expect(hit).toHaveLength(2)
    expect(new Set(hit.map((t) => t.sourceAccountId)).size).toBe(2)
  })
})

describe('ghostExpenses (FR-032) — ambang Rp 1.000.000', () => {
  it('hanya pengeluaran DI ATAS Rp 1.000.000 tanpa bukti yang ditandai', async () => {
    expect(GHOST_EXPENSE_THRESHOLD).toBe(1_000_000)

    const hantu = await beban(1_000_001, '2026-04-10', 'Sedikit di atas ambang')
    await beban(1_000_000, '2026-04-11', 'Tepat di ambang, tidak ditandai')
    await beban(999_999, '2026-04-12', 'Di bawah ambang')
    await beban(5_000_000, '2026-04-13', 'Besar tapi sudah ada bukti', 'att-1')

    const ghosts = ghostExpenses()

    expect(ghosts).toHaveLength(1)
    expect(ghosts[0]?.transactionId).toBe(hantu)
    expect(ghosts[0]?.amount).toBe(1_000_001)
    expect(ghosts[0]?.status).toBe('Unverified')
    expect(ghosts[0]?.transactionDate).toBe('2026-04-10')
    expect(ghosts[0]?.description).toBe('Sedikit di atas ambang')
  })

  it('pengeluaran terverifikasi (punya attachmentId) tidak ditandai', async () => {
    await beban(2_000_000, '2026-04-14', 'Gaji tim', 'att-bukti')
    await beban(3_000_000, '2026-04-15', 'Subkontraktor', 'att-bukti-2')

    expect(ghostExpenses()).toEqual([])
    for (const tx of getTransactions()) expect(tx.isVerified).toBe(true)
  })

  it('attachmentId berupa string kosong diperlakukan sama dengan tanpa bukti', async () => {
    await beban(2_000_000, '2026-04-16', 'Bukti kosong', '')
    expect(ghostExpenses()).toHaveLength(1)
  })

  it('pemasukan besar tanpa bukti bukan ghost expense', async () => {
    await postTransaction({
      mutationType: 'INCOME',
      amount: 9_000_000,
      transactionDate: '2026-04-17',
      description: 'Pendapatan besar',
      destinationAccountId: accountId('10200'),
      categoryAccountId: accountId('40100'),
    })
    expect(ghostExpenses()).toEqual([])
  })

  it('diurutkan dari tanggal terbaru ke terlama', async () => {
    await beban(2_000_000, '2026-04-10', 'Lama')
    await beban(2_000_000, '2026-04-20', 'Baru')
    await beban(2_000_000, '2026-04-15', 'Tengah')

    expect(ghostExpenses().map((g) => g.description)).toEqual(['Baru', 'Tengah', 'Lama'])
  })
})

describe('sentinelSummary — gabungan ketiga sinyal', () => {
  it('menghitung aging overdue, bucket, dan ghost expense secara konsisten', async () => {
    // Piutang: 1 belum jatuh tempo (<30 hari), 3 overdue.
    await piutang(100_000, TANGGAL_UMUR[29] as string, 'AR 29 hari')
    await piutang(200_000, TANGGAL_UMUR[30] as string, 'AR 30 hari')
    await piutang(300_000, TANGGAL_UMUR[60] as string, 'AR 60 hari')
    await piutang(400_000, TANGGAL_UMUR[90] as string, 'AR 90 hari')

    // Ghost expense: 2 ditandai, 1 aman karena ada bukti, 1 aman karena kecil.
    await beban(2_000_000, '2026-06-01', 'Hantu A')
    await beban(1_500_000, '2026-06-02', 'Hantu B')
    await beban(4_000_000, '2026-06-03', 'Ada bukti', 'att-ok')
    await beban(500_000, '2026-06-04', 'Kecil')

    const ringkasan = sentinelSummary(AS_OF)
    const aging = agingReceivables(AS_OF)
    const ghosts = ghostExpenses()

    // Aging: hanya umur >= 30 hari yang dihitung overdue.
    expect(ringkasan.agingOverdueCount).toBe(3)
    expect(ringkasan.agingOverdueTotal).toBe(200_000 + 300_000 + 400_000)

    // agingBuckets adalah JUMLAH ITEM per bucket, termasuk yang belum overdue.
    expect(ringkasan.agingBuckets).toEqual({
      '0-29': 1,
      '30-59': 1,
      '60-89': 1,
      '90+': 1,
    })
    const totalItemBucket = Object.values(ringkasan.agingBuckets).reduce((a, b) => a + b, 0)
    expect(totalItemBucket).toBe(aging.items.length)

    expect(ringkasan.ghostExpenseCount).toBe(2)
    expect(ringkasan.ghostExpenseTotal).toBe(3_500_000)
    expect(ringkasan.ghostExpenseCount).toBe(ghosts.length)
    expect(ringkasan.ghostExpenseTotal).toBe(ghosts.reduce((s, g) => s + g.amount, 0))

    expect(ringkasan.totalWarnings).toBe(ringkasan.agingOverdueCount + ringkasan.ghostExpenseCount)
    expect(ringkasan.totalWarnings).toBe(5)
  })

  it('nol peringatan pada buku yang bersih', () => {
    expect(sentinelSummary(AS_OF)).toEqual({
      agingOverdueCount: 0,
      agingOverdueTotal: 0,
      agingBuckets: { '0-29': 0, '30-59': 0, '60-89': 0, '90+': 0 },
      ghostExpenseCount: 0,
      ghostExpenseTotal: 0,
      totalWarnings: 0,
    })
  })

  it('piutang yang sudah lunas menghilang dari ringkasan', async () => {
    await piutang(1_000_000, TANGGAL_UMUR[90] as string, 'AR lunas')
    expect(sentinelSummary(AS_OF).agingOverdueCount).toBe(1)

    await lunasi(1_000_000, TANGGAL_UMUR[0] as string, 'Pelunasan penuh')

    const ringkasan = sentinelSummary(AS_OF)
    expect(ringkasan.agingOverdueCount).toBe(0)
    expect(ringkasan.agingOverdueTotal).toBe(0)
    expect(ringkasan.totalWarnings).toBe(0)
  })
})
