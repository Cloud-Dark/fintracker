// Data contoh untuk peragaan aplikasi (demo/onboarding).
//
// Seluruh transaksi diposting melalui `postTransaction` pada kernel akuntansi,
// bukan ditulis langsung ke penyimpanan. Dengan demikian data contoh tetap
// tunduk pada invarian debit = kredit, rantai hash SHA-256, dan alokasi
// sequence monotonic yang sama seperti input pengguna sungguhan.
//
// Tanggal dihitung relatif terhadap hari pemuatan agar bucket aging piutang
// (0-29 / 30-59 / 60-89 / 90+) dan jendela duplikat 48 jam selalu bermakna,
// tidak peduli kapan data contoh dimuat.

import { postTransaction } from '@/domain/kernel'
import { toISODate } from '@/lib/date'
import type { MutationType } from '@/types'
import { bootstrap, getAccounts, getCategories, getTransactions } from './db'

/** Kode akun yang dipakai skenario data contoh. */
const KAS_TUNAI = '10100'
const KAS_BANK = '10200'
const E_WALLET = '10300'
const PIUTANG = '10400'
const UTANG_USAHA = '20100'

/** Penanda agar pemuatan data contoh tidak berjalan dua kali. */
const DEMO_MARKER = 'Setoran modal awal pemilik'

interface DemoTx {
  /** Hari ke belakang dari hari ini; 0 berarti hari ini. */
  daysAgo: number
  mutationType: MutationType
  amount: number
  description: string
  /** Nama kategori sesuai DEFAULT_CATEGORIES; null untuk TRANSFER dan DEBT_PAYMENT. */
  category: string | null
  /** Kode akun sumber (EXPENSE, TRANSFER, DEBT_PAYMENT). */
  fromCode?: string
  /** Kode akun tujuan (INCOME, TRANSFER). */
  toCode?: string
}

/**
 * Skenario sebuah agensi perangkat lunak kecil sepanjang kurang lebih empat
 * bulan. Disusun agar setiap fitur aplikasi memiliki data yang menghidupinya:
 *
 * - Laba rugi: pendapatan jasa dan produk melawan HPP serta beban operasional.
 * - Neraca: kas pada tiga dompet, piutang usaha, dan modal disetor.
 * - Arus kas: pemasukan, pengeluaran, dan transfer antar-dompet.
 * - Aging piutang: empat penjualan kredit yang jatuh pada keempat bucket.
 * - Ghost expense: pengeluaran di atas Rp 1.000.000 tanpa lampiran bukti.
 * - Deteksi duplikat: dua langganan identik berselang 24 jam.
 */
const DEMO_TRANSACTIONS: readonly DemoTx[] = [
  // -- Permodalan awal --
  {
    daysAgo: 120,
    mutationType: 'INCOME',
    amount: 75_000_000,
    description: DEMO_MARKER,
    category: 'Pendapatan Lain-lain',
    toCode: KAS_BANK,
  },

  // -- Penjualan kredit: satu per bucket aging --
  {
    daysAgo: 100,
    mutationType: 'INCOME',
    amount: 18_500_000,
    description: 'Invoice 2026-011 PT Sinar Rekadaya (termin 30 hari)',
    category: 'Penjualan Jasa',
    toCode: PIUTANG,
  },
  {
    daysAgo: 70,
    mutationType: 'INCOME',
    amount: 12_750_000,
    description: 'Invoice 2026-018 CV Bumi Aksara (termin 30 hari)',
    category: 'Penjualan Jasa',
    toCode: PIUTANG,
  },
  {
    daysAgo: 45,
    mutationType: 'INCOME',
    amount: 9_200_000,
    description: 'Invoice 2026-024 Koperasi Tani Makmur (termin 30 hari)',
    category: 'Penjualan Jasa',
    toCode: PIUTANG,
  },
  {
    daysAgo: 12,
    mutationType: 'INCOME',
    amount: 6_400_000,
    description: 'Invoice 2026-031 PT Nusa Data Prima (termin 30 hari)',
    category: 'Penjualan Jasa',
    toCode: PIUTANG,
  },

  // Pelunasan penuh piutang tertua; alokasi FIFO memindahkannya keluar bucket.
  {
    daysAgo: 66,
    mutationType: 'TRANSFER',
    amount: 18_500_000,
    description: 'Pelunasan Invoice 2026-011 masuk rekening operasional',
    category: null,
    fromCode: PIUTANG,
    toCode: KAS_BANK,
  },

  // -- Penjualan tunai --
  {
    daysAgo: 92,
    mutationType: 'INCOME',
    amount: 7_500_000,
    description: 'Pembayaran tunai jasa audit sistem Toko Harum Sari',
    category: 'Penjualan Jasa',
    toCode: E_WALLET,
  },
  {
    daysAgo: 58,
    mutationType: 'INCOME',
    amount: 4_250_000,
    description: 'Penjualan lisensi template dasbor (12 unit)',
    category: 'Penjualan Produk',
    toCode: E_WALLET,
  },
  {
    daysAgo: 31,
    mutationType: 'INCOME',
    amount: 11_300_000,
    description: 'Retainer bulanan pemeliharaan PT Sinar Rekadaya',
    category: 'Penjualan Jasa',
    toCode: KAS_BANK,
  },
  {
    daysAgo: 8,
    mutationType: 'INCOME',
    amount: 5_900_000,
    description: 'Penjualan lisensi template dasbor (16 unit)',
    category: 'Penjualan Produk',
    toCode: E_WALLET,
  },
  {
    daysAgo: 21,
    mutationType: 'INCOME',
    amount: 412_000,
    description: 'Bunga giro rekening operasional',
    category: 'Pendapatan Bunga',
    toCode: KAS_BANK,
  },

  // -- Transfer antar-dompet --
  {
    daysAgo: 89,
    mutationType: 'TRANSFER',
    amount: 5_000_000,
    description: 'Pengisian kas kecil kantor dari rekening operasional',
    category: null,
    fromCode: KAS_BANK,
    toCode: KAS_TUNAI,
  },
  {
    daysAgo: 40,
    mutationType: 'TRANSFER',
    amount: 6_000_000,
    description: 'Penarikan saldo e-wallet ke rekening operasional',
    category: null,
    fromCode: E_WALLET,
    toCode: KAS_BANK,
  },
  {
    daysAgo: 5,
    mutationType: 'TRANSFER',
    amount: 2_500_000,
    description: 'Pengisian ulang kas kecil kantor',
    category: null,
    fromCode: KAS_BANK,
    toCode: KAS_TUNAI,
  },

  // -- Beban pokok jasa --
  {
    daysAgo: 95,
    mutationType: 'EXPENSE',
    amount: 8_400_000,
    description: 'Termin 1 subkontraktor integrasi API',
    category: 'Subkontraktor & Freelancer',
    fromCode: KAS_BANK,
  },
  {
    daysAgo: 62,
    mutationType: 'EXPENSE',
    amount: 6_150_000,
    description: 'Termin 2 subkontraktor integrasi API',
    category: 'Subkontraktor & Freelancer',
    fromCode: KAS_BANK,
  },
  {
    daysAgo: 30,
    mutationType: 'EXPENSE',
    amount: 3_900_000,
    description: 'Jasa desainer lepas untuk pustaka komponen',
    category: 'Subkontraktor & Freelancer',
    fromCode: KAS_BANK,
  },
  {
    daysAgo: 88,
    mutationType: 'EXPENSE',
    amount: 2_450_000,
    description: 'Sewa server dedicated klien kuartal berjalan',
    category: 'Server & Infrastruktur Klien',
    fromCode: KAS_BANK,
  },
  {
    daysAgo: 27,
    mutationType: 'EXPENSE',
    amount: 2_450_000,
    description: 'Sewa server dedicated klien kuartal berikutnya',
    category: 'Server & Infrastruktur Klien',
    fromCode: KAS_BANK,
  },

  // -- Beban operasional: gaji tiga periode --
  {
    daysAgo: 90,
    mutationType: 'EXPENSE',
    amount: 14_000_000,
    description: 'Gaji tim periode pertama',
    category: 'Gaji & Upah Tim',
    fromCode: KAS_BANK,
  },
  {
    daysAgo: 60,
    mutationType: 'EXPENSE',
    amount: 14_000_000,
    description: 'Gaji tim periode kedua',
    category: 'Gaji & Upah Tim',
    fromCode: KAS_BANK,
  },
  {
    daysAgo: 29,
    mutationType: 'EXPENSE',
    amount: 15_500_000,
    description: 'Gaji tim periode ketiga (tambahan satu personel)',
    category: 'Gaji & Upah Tim',
    fromCode: KAS_BANK,
  },

  // -- Marketing --
  {
    daysAgo: 75,
    mutationType: 'EXPENSE',
    amount: 3_200_000,
    description: 'Iklan berbayar akuisisi klien kuartal berjalan',
    category: 'Marketing & Customer Acquisition',
    fromCode: KAS_BANK,
  },
  {
    daysAgo: 18,
    mutationType: 'EXPENSE',
    amount: 1_850_000,
    description: 'Produksi materi studi kasus dan portofolio',
    category: 'Marketing & Customer Acquisition',
    fromCode: E_WALLET,
  },

  // -- Langganan perangkat lunak: pasangan duplikat berselang 24 jam --
  {
    daysAgo: 15,
    mutationType: 'EXPENSE',
    amount: 1_450_000,
    description: 'Langganan tahunan paket kolaborasi tim',
    category: 'Software & Cloud Tools',
    fromCode: KAS_BANK,
  },
  {
    daysAgo: 14,
    mutationType: 'EXPENSE',
    amount: 1_450_000,
    description: 'Langganan tahunan paket kolaborasi tim',
    category: 'Software & Cloud Tools',
    fromCode: KAS_BANK,
  },
  {
    daysAgo: 47,
    mutationType: 'EXPENSE',
    amount: 890_000,
    description: 'Perpanjangan domain dan sertifikat TLS',
    category: 'Software & Cloud Tools',
    fromCode: KAS_BANK,
  },

  // -- Administrasi, sebagian dibayar dari kas tunai --
  {
    daysAgo: 80,
    mutationType: 'EXPENSE',
    amount: 1_200_000,
    description: 'Perlengkapan kantor dan alat tulis',
    category: 'Administrasi & Umum',
    fromCode: KAS_TUNAI,
  },
  {
    daysAgo: 36,
    mutationType: 'EXPENSE',
    amount: 675_000,
    description: 'Konsumsi rapat klien dan transportasi lokal',
    category: 'Administrasi & Umum',
    fromCode: KAS_TUNAI,
  },
  {
    daysAgo: 3,
    mutationType: 'EXPENSE',
    amount: 430_000,
    description: 'Jasa kurir dokumen kontrak',
    category: 'Administrasi & Umum',
    fromCode: KAS_TUNAI,
  },

  // -- Pajak dan pelunasan utang usaha --
  {
    daysAgo: 55,
    mutationType: 'EXPENSE',
    amount: 4_100_000,
    description: 'Beban pajak penghasilan badan terutang',
    category: 'Pajak & Beban Akrual',
    fromCode: KAS_BANK,
  },
  {
    daysAgo: 24,
    mutationType: 'DEBT_PAYMENT',
    amount: 2_300_000,
    description: 'Pelunasan sebagian utang vendor perangkat keras',
    category: null,
    fromCode: KAS_BANK,
  },
]

export interface DemoDataResult {
  posted: number
  skipped: boolean
}

/** Jumlah transaksi yang akan diposting oleh `loadDemoData`. */
export const DEMO_TRANSACTION_COUNT = DEMO_TRANSACTIONS.length

/** Data contoh dianggap sudah ada bila transaksi penandanya ditemukan. */
export function hasDemoData(): boolean {
  return getTransactions().some((tx) => tx.description === DEMO_MARKER)
}

function requireAccountId(byCode: Map<string, string>, code: string): string {
  const id = byCode.get(code)
  if (!id) {
    throw new Error(`Akun dengan kode ${code} tidak ditemukan pada Chart of Accounts.`)
  }
  return id
}

/**
 * Memposting seluruh transaksi contoh secara berurutan. Idempoten: pemanggilan
 * kedua tidak menambah apa pun selama transaksi penanda masih ada.
 *
 * Kegagalan pada satu transaksi dilempar ke pemanggil; transaksi yang terlanjur
 * tercatat tetap sah karena masing-masing diposting dalam unit-of-work sendiri.
 */
export async function loadDemoData(): Promise<DemoDataResult> {
  bootstrap()
  if (hasDemoData()) return { posted: 0, skipped: true }

  const accountIdByCode = new Map(getAccounts().map((a) => [a.code, a.id]))
  const categoryByName = new Map(getCategories().map((c) => [c.name, c]))
  const today = new Date()

  let posted = 0
  for (const demo of DEMO_TRANSACTIONS) {
    const date = new Date(today)
    date.setDate(date.getDate() - demo.daysAgo)

    let categoryId: string | null = null
    let categoryAccountId: string | null = null

    if (demo.mutationType === 'DEBT_PAYMENT') {
      categoryAccountId = requireAccountId(accountIdByCode, UTANG_USAHA)
    } else if (demo.category) {
      const category = categoryByName.get(demo.category)
      if (!category) throw new Error(`Kategori "${demo.category}" tidak ditemukan.`)
      categoryId = category.id
      categoryAccountId = requireAccountId(accountIdByCode, category.defaultAccountCode)
    }

    await postTransaction({
      mutationType: demo.mutationType,
      amount: demo.amount,
      transactionDate: toISODate(date),
      description: demo.description,
      categoryId,
      categoryAccountId,
      sourceAccountId: demo.fromCode ? requireAccountId(accountIdByCode, demo.fromCode) : null,
      destinationAccountId: demo.toCode ? requireAccountId(accountIdByCode, demo.toCode) : null,
    })
    posted += 1
  }

  return { posted, skipped: false }
}
