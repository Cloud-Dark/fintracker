import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import SectionHeader from '@/components/ui/SectionHeader'
import StatCard from '@/components/ui/StatCard'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import { useLedger } from '@/hooks/useLedger'
import {
  agingReceivables,
  ghostExpenses,
  DUPLICATE_WINDOW_HOURS,
  GHOST_EXPENSE_THRESHOLD,
  type AgingBucketKey,
  type AgingItem,
  type AgingReceivables,
  type GhostExpense,
} from '@/domain/sentinel'
import { formatIDR } from '@/lib/money'
import { formatDateID } from '@/lib/date'

const BUCKET_KEYS: ReadonlyArray<AgingBucketKey> = ['0-29', '30-59', '60-89', '90+']

const BUCKET_LABEL: Record<AgingBucketKey, string> = {
  '0-29': '0–29 hari',
  '30-59': '30–59 hari',
  '60-89': '60–89 hari',
  '90+': '90 hari ke atas',
}

const BUCKET_NOTE: Record<AgingBucketKey, string> = {
  '0-29': 'Belum jatuh tempo',
  '30-59': 'Perlu ditagih',
  '60-89': 'Tertunggak',
  '90+': 'Kritis',
}

/** Bucket 90+ ditandai paling mencolok; penanda tetap disertai teks, bukan warna saja. */
function bucketTone(key: AgingBucketKey, hasItems: boolean): string {
  if (!hasItems) return ''
  if (key === '90+') return 'bg-negative/10 font-bold text-negative'
  if (key === '60-89') return 'text-warning'
  return ''
}

function bucketBadgeVariant(key: AgingBucketKey): 'warning' | 'unverified' | 'neutral' {
  if (key === '90+') return 'warning'
  if (key === '60-89') return 'unverified'
  return 'neutral'
}

/**
 * Wadah tabel lebar: berbingkai, bisa digeser, dan dapat difokuskan lewat
 * keyboard. `maxHeight` mengaktifkan gulir menegak untuk daftar panjang seperti
 * rincian piutang dan pengeluaran tanpa bukti, sehingga tabel tidak mendorong
 * tombol tindakan di bawahnya keluar layar.
 */
function ScrollableTable({
  label,
  children,
  maxHeight,
}: {
  label: string
  children: React.ReactNode
  maxHeight?: string
}) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      style={maxHeight ? { maxHeight } : undefined}
      className={[
        'scroll-ledger w-full overflow-x-auto border border-border bg-card',
        maxHeight ? 'overflow-y-auto' : '',
        'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}

export default function Sentinel() {
  const { sentinel, transactions } = useLedger()

  // Dihitung ulang setiap kali daftar transaksi berubah agar sinkron dengan buku besar.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `transactions` sengaja dipakai sebagai penanda invalidasi; agingReceivables() membaca penyimpanan, bukan argumen.
  const aging: AgingReceivables = useMemo(() => agingReceivables(), [transactions])
  // eslint-disable-next-line react-hooks/exhaustive-deps -- idem: penanda invalidasi untuk pembacaan penyimpanan.
  const ghosts: ReadonlyArray<GhostExpense> = useMemo(() => ghostExpenses(), [transactions])

  const ghostTotal = useMemo(() => ghosts.reduce((sum, g) => sum + g.amount, 0), [ghosts])

  const sortedAgingItems: ReadonlyArray<AgingItem> = useMemo(
    () => [...aging.items].sort((a, b) => b.ageDays - a.ageDays),
    [aging]
  )

  const overdueTotal = sentinel?.agingOverdueTotal ?? 0
  const overdueCount = sentinel?.agingOverdueCount ?? 0
  const critical = aging.buckets['90+']

  return (
    <section>
      <SectionHeader
        kicker="Sentinel — Pemantauan Kebocoran Kas"
        title="Cash Leakage Sentinel"
        description="Tiga pemeriksaan berjalan atas buku besar lokal: umur piutang, dugaan pengeluaran ganda, dan pengeluaran besar tanpa bukti bayar. Semua temuan bersifat peringatan, tidak pernah memblokir pencatatan."
        action={
          <Link to="/transaksi" className="btn-primary min-h-[40px]">
            Buka Transaksi
          </Link>
        }
      />

      {/* Hero ringkas */}
      <div className="panel ledger-grid mb-8 p-6 md:p-8">
        <p className="kicker">Posisi per {formatDateID(aging.asOf)} ————</p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Piutang yang menua, tagihan yang mungkin terbayar dua kali, dan pengeluaran besar tanpa
          lampiran adalah tiga jalur paling umum kas menghilang tanpa jejak. Halaman ini menampilkan
          ketiganya apa adanya.
        </p>
        <p className="mt-5 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Total temuan aktif:{' '}
          <span className="num font-bold text-foreground">{sentinel?.totalWarnings ?? 0}</span>
        </p>
      </div>

      {/* Tiga statistik utama */}
      <div className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          kicker="Piutang Jatuh Tempo"
          value={formatIDR(overdueTotal)}
          delta={{
            value: `${overdueCount} piutang`,
            direction: overdueCount > 0 ? 'negative' : 'neutral',
            label: '≥ 30 hari',
          }}
          hint="Sisa piutang usaha yang belum lunas dan sudah berumur 30 hari atau lebih."
        />
        <StatCard
          kicker="Dugaan Pengeluaran Ganda"
          value="Saat Pencatatan"
          delta={{ value: `Jendela ±${DUPLICATE_WINDOW_HOURS} jam`, direction: 'neutral' }}
          hint="Pemeriksaan duplikat dijalankan sebelum jurnal disimpan, bukan sebagai daftar riwayat."
        />
        <StatCard
          kicker="Ghost Expense"
          value={formatIDR(ghostTotal)}
          delta={{
            value: `${ghosts.length} pengeluaran`,
            direction: ghosts.length > 0 ? 'negative' : 'neutral',
            label: 'tanpa bukti',
          }}
          hint={`Pengeluaran di atas ${formatIDR(GHOST_EXPENSE_THRESHOLD)} yang belum memiliki lampiran.`}
        />
      </div>

      <div className="flex flex-col gap-12">
        {/* ——— Seksi 1: Umur Piutang ——— */}
        <div>
          <h2 id="umur-piutang" className="text-2xl md:text-3xl">
            Umur Piutang
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Piutang usaha (akun 10400) yang belum lunas, dikelompokkan berdasarkan umur sejak
            tanggal transaksi. Pelunasan dialokasikan pada piutang tertua lebih dulu, sehingga hanya
            sisa yang belum tertutup yang muncul di sini.
          </p>
          <div className="rule-line mt-5 mb-6" />

          {aging.items.length === 0 ? (
            <EmptyState
              title="Tidak ada temuan"
              description="Tidak ada piutang usaha yang masih terbuka. Seluruh tagihan sudah tertutup oleh pelunasan."
              action={
                <Link to="/buku-besar" className="btn-ghost min-h-[40px]">
                  Telusuri Buku Besar
                </Link>
              }
            />
          ) : (
            <div className="flex flex-col gap-6">
              {/* Ringkasan per bucket */}
              <ScrollableTable label="Tabel ringkasan umur piutang per kelompok umur, dapat digeser mendatar">
                <table className="w-full min-w-[560px] border-collapse text-sm">
                  <caption className="kicker px-4 py-3 text-left">
                    Ringkasan per kelompok umur — total {formatIDR(aging.total)}
                  </caption>
                  <thead>
                    <tr className="border-b-[1.5px] border-border">
                      <th
                        scope="col"
                        className="px-4 py-3 text-left font-mono text-[0.625rem] font-bold uppercase tracking-[0.18em] text-muted-foreground"
                      >
                        Kelompok Umur
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left font-mono text-[0.625rem] font-bold uppercase tracking-[0.18em] text-muted-foreground"
                      >
                        Keterangan
                      </th>
                      <th
                        scope="col"
                        className="num px-4 py-3 text-right font-mono text-[0.625rem] font-bold uppercase tracking-[0.18em] text-muted-foreground"
                      >
                        Jumlah Item
                      </th>
                      <th
                        scope="col"
                        className="num px-4 py-3 text-right font-mono text-[0.625rem] font-bold uppercase tracking-[0.18em] text-muted-foreground"
                      >
                        Total Nominal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {BUCKET_KEYS.map((key) => {
                      const bucket = aging.buckets[key]
                      const hasItems = bucket.items.length > 0
                      return (
                        <tr
                          key={key}
                          className={[
                            'border-b border-rule/30 last:border-b-0',
                            key === '90+' && hasItems ? 'border-l-[3px] border-l-negative' : '',
                            bucketTone(key, hasItems),
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          <th
                            scope="row"
                            className="px-4 py-3 text-left font-mono text-xs uppercase tracking-[0.18em]"
                          >
                            {BUCKET_LABEL[key]}
                          </th>
                          <td className="px-4 py-3">
                            {hasItems ? (
                              <Badge variant={bucketBadgeVariant(key)}>{BUCKET_NOTE[key]}</Badge>
                            ) : (
                              <span className="font-mono text-xs text-muted-foreground">
                                Kosong
                              </span>
                            )}
                          </td>
                          <td className="num px-4 py-3 text-right">{bucket.items.length}</td>
                          <td className="num px-4 py-3 text-right">{formatIDR(bucket.total)}</td>
                        </tr>
                      )
                    })}
                    <tr className="border-t-[1.5px] border-border bg-muted font-bold">
                      <th
                        scope="row"
                        className="px-4 py-3 text-left font-mono text-xs uppercase tracking-[0.18em]"
                      >
                        Total
                      </th>
                      <td className="px-4 py-3" />
                      <td className="num px-4 py-3 text-right">{aging.items.length}</td>
                      <td className="num px-4 py-3 text-right font-display font-black">
                        {formatIDR(aging.total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </ScrollableTable>

              {critical.items.length > 0 && (
                <div className="border-[1.5px] border-negative p-4" role="note">
                  <p className="kicker mb-2 text-negative">
                    <span aria-hidden="true">! </span>Perhatian Utama — 90 Hari ke Atas
                  </p>
                  <p className="text-sm leading-relaxed text-foreground">
                    <span className="num font-bold">{critical.items.length}</span> piutang senilai{' '}
                    <span className="num font-bold">{formatIDR(critical.total)}</span> sudah
                    melewati 90 hari. Piutang pada rentang ini paling berisiko tidak tertagih dan
                    sebaiknya ditindaklanjuti lebih dulu.
                  </p>
                </div>
              )}

              {/* Rincian per piutang */}
              <ScrollableTable
                label="Tabel rincian setiap piutang yang belum lunas, dapat digeser"
                maxHeight="60vh"
              >
                <table className="w-full min-w-[680px] border-collapse text-sm">
                  <caption className="kicker px-4 py-3 text-left">
                    Rincian piutang — {sortedAgingItems.length} entri, diurutkan dari yang tertua
                  </caption>
                  <thead>
                    <tr className="border-b-[1.5px] border-border">
                      <th
                        scope="col"
                        className="px-4 py-3 text-left font-mono text-[0.625rem] font-bold uppercase tracking-[0.18em] text-muted-foreground"
                      >
                        Kontak / Deskripsi
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left font-mono text-[0.625rem] font-bold uppercase tracking-[0.18em] text-muted-foreground"
                      >
                        Tanggal
                      </th>
                      <th
                        scope="col"
                        className="num px-4 py-3 text-right font-mono text-[0.625rem] font-bold uppercase tracking-[0.18em] text-muted-foreground"
                      >
                        Umur (hari)
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left font-mono text-[0.625rem] font-bold uppercase tracking-[0.18em] text-muted-foreground"
                      >
                        Kelompok
                      </th>
                      <th
                        scope="col"
                        className="num px-4 py-3 text-right font-mono text-[0.625rem] font-bold uppercase tracking-[0.18em] text-muted-foreground"
                      >
                        Sisa Nominal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAgingItems.map((item) => (
                      <tr
                        key={item.entryId}
                        className={[
                          'border-b border-rule/30 last:border-b-0 hover:bg-muted',
                          item.bucket === '90+'
                            ? 'border-l-[3px] border-l-negative bg-negative/5'
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <td className="px-4 py-3">
                          <span className="block min-w-[12rem] max-w-[22rem] truncate">
                            {item.description || (
                              <span className="text-muted-foreground">Tanpa deskripsi</span>
                            )}
                          </span>
                        </td>
                        <td className="num whitespace-nowrap px-4 py-3">
                          {formatDateID(item.transactionDate)}
                        </td>
                        <td
                          className={[
                            'num px-4 py-3 text-right',
                            item.bucket === '90+' ? 'font-bold text-negative' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          {item.ageDays}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={bucketBadgeVariant(item.bucket)}>
                            {BUCKET_LABEL[item.bucket]}
                          </Badge>
                        </td>
                        <td className="num whitespace-nowrap px-4 py-3 text-right">
                          {formatIDR(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollableTable>

              <div className="flex flex-wrap gap-3">
                <Link to="/buku-besar" className="btn-ghost min-h-[40px]">
                  Telusuri Buku Besar
                </Link>
                <Link to="/transaksi" className="btn-ghost min-h-[40px]">
                  Catat Pelunasan
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ——— Seksi 2: Pengeluaran Ganda ——— */}
        <div>
          <h2 id="pengeluaran-ganda" className="text-2xl md:text-3xl">
            Pengeluaran Ganda
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Pemeriksaan duplikat membandingkan nominal dan deskripsi pengeluaran dalam jendela waktu
            tertentu.
          </p>
          <div className="rule-line mt-5 mb-6" />

          {/* Sengaja bukan daftar: modul sentinel hanya menyediakan pemeriksaan pra-simpan,
              sehingga tidak ada riwayat duplikat yang jujur untuk ditampilkan di sini. */}
          <div className="panel p-6">
            <Badge variant="neutral">Pemeriksaan Pra-Simpan</Badge>
            <h3 className="mt-4 font-display text-xl font-black tracking-[-0.01em] md:text-2xl">
              Deteksi berjalan saat pencatatan, bukan sebagai daftar retroaktif
            </h3>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Saat Anda menyimpan sebuah pengeluaran, sistem mencari pengeluaran lain yang sudah
              diposting dengan nominal identik dan deskripsi yang sama (tanpa membedakan huruf
              besar-kecil) dalam rentang ±{DUPLICATE_WINDOW_HOURS} jam dari tanggal transaksi. Bila
              ada yang cocok, formulir menampilkan peringatan beserta daftar transaksi yang mirip —
              dan Anda tetap boleh melanjutkan, karena pembayaran kembar yang sah memang mungkin
              terjadi.
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Modul sentinel tidak menyimpan riwayat hasil pemeriksaan tersebut. Karena itu halaman
              ini tidak menampilkan daftar dugaan duplikat lama: menampilkannya berarti mengarang
              data yang tidak dimiliki aplikasi.
            </p>

            <dl className="mt-6 grid grid-cols-1 border-l border-t border-border sm:grid-cols-3">
              <div className="border-b border-r border-border p-4">
                <dt className="kicker">Jendela Waktu</dt>
                <dd className="num mt-2 font-mono text-sm">±{DUPLICATE_WINDOW_HOURS} jam</dd>
              </div>
              <div className="border-b border-r border-border p-4">
                <dt className="kicker">Kriteria Cocok</dt>
                <dd className="mt-2 font-mono text-sm">Nominal + deskripsi</dd>
              </div>
              <div className="border-b border-r border-border p-4">
                <dt className="kicker">Sifat Peringatan</dt>
                <dd className="mt-2 font-mono text-sm">Tidak memblokir</dd>
              </div>
            </dl>

            <Link to="/transaksi" className="btn-ghost mt-6 min-h-[40px]">
              Catat Transaksi untuk Menguji
            </Link>
          </div>
        </div>

        {/* ——— Seksi 3: Ghost Expense ——— */}
        <div>
          <h2 id="ghost-expense" className="text-2xl md:text-3xl">
            Ghost Expense
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Pengeluaran bernilai di atas {formatIDR(GHOST_EXPENSE_THRESHOLD)} yang sudah diposting
            namun belum memiliki lampiran bukti bayar. Tanpa bukti, pengeluaran sebesar ini sulit
            diaudit ulang dan mudah disalahartikan saat rekonsiliasi.
          </p>
          <div className="rule-line mt-5 mb-6" />

          {ghosts.length === 0 ? (
            <EmptyState
              title="Tidak ada temuan"
              description={`Setiap pengeluaran di atas ${formatIDR(GHOST_EXPENSE_THRESHOLD)} sudah disertai bukti bayar. Tidak ada yang perlu ditindaklanjuti.`}
              action={
                <Link to="/transaksi" className="btn-ghost min-h-[40px]">
                  Buka Transaksi
                </Link>
              }
            />
          ) : (
            <div className="flex flex-col gap-6">
              <ScrollableTable
                label="Tabel pengeluaran besar tanpa bukti bayar, dapat digeser"
                maxHeight="60vh"
              >
                <table className="w-full min-w-[620px] border-collapse text-sm">
                  <caption className="kicker px-4 py-3 text-left">
                    {ghosts.length} pengeluaran tanpa bukti — total {formatIDR(ghostTotal)}
                  </caption>
                  <thead>
                    <tr className="border-b-[1.5px] border-border">
                      <th
                        scope="col"
                        className="px-4 py-3 text-left font-mono text-[0.625rem] font-bold uppercase tracking-[0.18em] text-muted-foreground"
                      >
                        Deskripsi
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left font-mono text-[0.625rem] font-bold uppercase tracking-[0.18em] text-muted-foreground"
                      >
                        Tanggal
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left font-mono text-[0.625rem] font-bold uppercase tracking-[0.18em] text-muted-foreground"
                      >
                        Status Bukti
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left font-mono text-[0.625rem] font-bold uppercase tracking-[0.18em] text-muted-foreground"
                      >
                        Alasan Ditandai
                      </th>
                      <th
                        scope="col"
                        className="num px-4 py-3 text-right font-mono text-[0.625rem] font-bold uppercase tracking-[0.18em] text-muted-foreground"
                      >
                        Nominal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ghosts.map((ghost) => (
                      <tr
                        key={ghost.transactionId}
                        className="border-b border-rule/30 last:border-b-0 hover:bg-muted"
                      >
                        <td className="px-4 py-3">
                          <span className="block min-w-[10rem] max-w-[20rem] truncate">
                            {ghost.description || (
                              <span className="text-muted-foreground">Tanpa deskripsi</span>
                            )}
                          </span>
                        </td>
                        <td className="num whitespace-nowrap px-4 py-3">
                          {formatDateID(ghost.transactionDate)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="unverified">{ghost.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                          Nominal melewati {formatIDR(GHOST_EXPENSE_THRESHOLD)} dan tidak ada
                          lampiran bukti bayar.
                        </td>
                        <td className="num whitespace-nowrap px-4 py-3 text-right text-warning">
                          {formatIDR(ghost.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollableTable>

              <div className="flex flex-wrap gap-3">
                <Link to="/transaksi" className="btn-ghost min-h-[40px]">
                  Buka Transaksi Terkait
                </Link>
                <Link to="/buku-besar" className="btn-ghost min-h-[40px]">
                  Telusuri Buku Besar
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
