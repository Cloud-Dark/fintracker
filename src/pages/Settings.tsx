import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import SectionHeader from '@/components/ui/SectionHeader'
import { bootstrap, exportBackup, importBackup, resetAll } from '@/repositories/db'
import { DEMO_TRANSACTION_COUNT, hasDemoData, loadDemoData } from '@/repositories/demoData'
import { estimateUsage } from '@/repositories/storage'
import { verifyChain, type ChainVerification } from '@/domain/kernel'
import {
  agingReceivables,
  ghostExpenses,
  type AgingReceivables,
  type GhostExpense,
} from '@/domain/sentinel'
import { useToast } from '@/hooks/useToast'
import { formatIDR } from '@/lib/money'
import { formatDateID } from '@/lib/date'
import type { BackupEnvelope } from '@/types'

const APP_VERSION = __APP_VERSION__
const RESET_PHRASE = 'HAPUS SEMUA'
const WARNING_RATIO = 0.8

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function Settings() {
  const { push } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [usage, setUsage] = useState(() => ({ bytes: 0, ratio: 0 }))
  const [verification, setVerification] = useState<ChainVerification | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [pendingImport, setPendingImport] = useState<{
    envelope: BackupEnvelope
    fileName: string
  } | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetPhrase, setResetPhrase] = useState('')
  const [sentinelTick, setSentinelTick] = useState(0)
  const [demoLoaded, setDemoLoaded] = useState(false)
  const [demoRunning, setDemoRunning] = useState(false)

  const refreshUsage = useCallback(() => setUsage(estimateUsage()), [])

  useEffect(() => {
    bootstrap()
    refreshUsage()
    setDemoLoaded(hasDemoData())
  }, [refreshUsage])

  // eslint-disable-next-line react-hooks/exhaustive-deps -- `sentinelTick` adalah penanda invalidasi manual; fungsi domain membaca penyimpanan.
  const ghosts: GhostExpense[] = useMemo(() => ghostExpenses(), [sentinelTick])
  // eslint-disable-next-line react-hooks/exhaustive-deps -- idem.
  const aging: AgingReceivables = useMemo(() => agingReceivables(), [sentinelTick])

  const onExport = useCallback(() => {
    try {
      const envelope = exportBackup()
      const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `fintrack-backup-${envelope.exportedAt.slice(0, 10)}.json`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      push({
        title: 'Cadangan diunduh',
        description: 'Berkas JSON berisi seluruh data lokal.',
        variant: 'success',
      })
    } catch (error) {
      push({
        title: 'Gagal mengekspor cadangan',
        description: error instanceof Error ? error.message : 'Kesalahan tidak diketahui.',
        variant: 'error',
      })
    }
  }, [push])

  const onPickFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return

      void file
        .text()
        .then((text) => {
          const parsed: unknown = JSON.parse(text)
          if (parsed === null || typeof parsed !== 'object' || !('data' in parsed)) {
            throw new Error('Struktur berkas cadangan tidak dikenali.')
          }
          setPendingImport({ envelope: parsed as BackupEnvelope, fileName: file.name })
        })
        .catch((error: unknown) => {
          push({
            title: 'Berkas cadangan tidak valid',
            description: error instanceof Error ? error.message : 'Berkas bukan JSON yang sah.',
            variant: 'error',
          })
        })
    },
    [push]
  )

  const confirmImport = useCallback(() => {
    if (!pendingImport) return
    try {
      importBackup(pendingImport.envelope)
      setPendingImport(null)
      refreshUsage()
      setDemoLoaded(hasDemoData())
      setSentinelTick((n) => n + 1)
      push({
        title: 'Cadangan dipulihkan',
        description: 'Seluruh data lokal diganti dengan isi berkas cadangan.',
        variant: 'success',
      })
    } catch (error) {
      setPendingImport(null)
      push({
        title: 'Impor ditolak',
        description: error instanceof Error ? error.message : 'Kesalahan tidak diketahui.',
        variant: 'error',
      })
    }
  }, [pendingImport, push, refreshUsage])

  const confirmReset = useCallback(() => {
    if (resetPhrase.trim() !== RESET_PHRASE) return
    try {
      resetAll()
      bootstrap()
      setResetOpen(false)
      setResetPhrase('')
      setVerification(null)
      setDemoLoaded(false)
      refreshUsage()
      setSentinelTick((n) => n + 1)
      push({
        title: 'Data direset',
        description: 'Seluruh data lokal dihapus dan seed awal dipasang kembali.',
        variant: 'success',
      })
    } catch (error) {
      push({
        title: 'Reset gagal',
        description: error instanceof Error ? error.message : 'Kesalahan tidak diketahui.',
        variant: 'error',
      })
    }
  }, [resetPhrase, push, refreshUsage])

  const onLoadDemo = useCallback(() => {
    setDemoRunning(true)
    void loadDemoData()
      .then((result) => {
        setDemoLoaded(true)
        refreshUsage()
        setSentinelTick((n) => n + 1)
        if (result.skipped) {
          push({
            title: 'Data contoh sudah ada',
            description: 'Tidak ada transaksi baru yang ditambahkan.',
            variant: 'info',
          })
          return
        }
        push({
          title: 'Data contoh dimuat',
          description: `${result.posted} transaksi diposting melalui kernel akuntansi.`,
          variant: 'success',
        })
      })
      .catch((error: unknown) => {
        push({
          title: 'Gagal memuat data contoh',
          description: error instanceof Error ? error.message : 'Kesalahan tidak diketahui.',
          variant: 'error',
        })
      })
      .finally(() => setDemoRunning(false))
  }, [push, refreshUsage])

  const onVerify = useCallback(() => {
    setVerifying(true)
    void verifyChain()
      .then((result) => {
        setVerification(result)
        push({
          title: result.valid ? 'Rantai buku besar valid' : 'Rantai buku besar rusak',
          description: `${result.checked} entri diperiksa.`,
          variant: result.valid ? 'success' : 'error',
        })
      })
      .catch(() => setVerification({ valid: false, brokenAt: null, checked: 0 }))
      .finally(() => setVerifying(false))
  }, [push])

  const ratioPercent = Math.min(100, Math.round(usage.ratio * 100))
  const overQuotaWarning = usage.ratio > WARNING_RATIO

  return (
    <section>
      <SectionHeader
        kicker="Pengaturan — Data & Integritas"
        title="Pengaturan"
        description="Cadangan, penyimpanan lokal, verifikasi rantai buku besar, dan peringatan sentinel."
      />

      <div className="flex flex-col gap-10">
        {/* Panel Data */}
        <div className="panel p-6">
          <p className="kicker mb-4">Data — Cadangan & Reset</p>
          <h3 className="font-display text-xl font-black tracking-[-0.01em] md:text-2xl">
            Cadangan Data
          </h3>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Ekspor seluruh data ke berkas JSON bertanda checksum, atau pulihkan dari cadangan
            sebelumnya. Impor akan menimpa seluruh data yang ada saat ini.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="btn-primary min-h-[40px]" onClick={onExport}>
              Ekspor Cadangan JSON
            </button>
            <button
              type="button"
              className="btn-ghost min-h-[40px]"
              onClick={() => fileInputRef.current?.click()}
            >
              Impor Cadangan
            </button>
            <button
              type="button"
              className="btn min-h-[40px] border-negative bg-transparent text-negative hover:bg-muted"
              onClick={() => setResetOpen(true)}
            >
              Reset Seluruh Data
            </button>
          </div>
          <label htmlFor="backup-file" className="sr-only">
            Berkas cadangan JSON
          </label>
          <input
            id="backup-file"
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={onPickFile}
          />
        </div>

        {/* Panel Data Contoh */}
        <div className="panel p-6">
          <p className="kicker mb-4">Data Contoh</p>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="font-display text-xl font-black tracking-[-0.01em] md:text-2xl">
              Muat Data Peragaan
            </h3>
            {demoLoaded && <Badge variant="posted">Sudah dimuat</Badge>}
          </div>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Memposting {DEMO_TRANSACTION_COUNT} transaksi contoh sebuah agensi perangkat lunak
            selama kurang lebih empat bulan: penjualan tunai dan kredit, transfer antar-dompet,
            beban pokok jasa, gaji, marketing, serta pelunasan utang. Seluruhnya diposting melalui
            kernel akuntansi yang sama seperti input manual, sehingga rantai hash dan keseimbangan
            debit-kredit tetap sah.
          </p>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Data ini menghidupkan seluruh laporan sekaligus memicu peringatan sentinel: piutang pada
            beberapa bucket aging, pengeluaran di atas Rp 1.000.000 tanpa bukti bayar, dan sepasang
            langganan identik berselang 24 jam.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-primary min-h-[40px] disabled:opacity-40"
              onClick={onLoadDemo}
              disabled={demoRunning || demoLoaded}
            >
              {demoRunning ? 'Memuat…' : 'Muat Data Contoh'}
            </button>
          </div>
          {demoLoaded && (
            <p className="mt-4 border-[1.5px] border-border bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
              Data contoh hanya dapat dimuat sekali. Untuk memuatnya kembali, jalankan Reset Seluruh
              Data terlebih dahulu. Transaksi contoh tidak dapat dihapus satu per satu karena buku
              besar bersifat append-only; gunakan jurnal pembalik bila perlu membatalkannya.
            </p>
          )}
        </div>

        {/* Panel Penyimpanan */}
        <div className="panel p-6">
          <p className="kicker mb-4">Penyimpanan Lokal</p>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="font-display text-xl font-black tracking-[-0.01em] md:text-2xl">
              Kuota Terpakai
            </h3>
            <p className="num font-mono text-sm">
              {formatBytes(usage.bytes)}{' '}
              <span className="text-muted-foreground">/ 5 MB ({ratioPercent}%)</span>
            </p>
          </div>

          {/* Bar penggunaan bergaya kotak berbingkai, tanpa radius */}
          <div
            className="mt-4 h-5 w-full border-[1.5px] border-border bg-background"
            role="progressbar"
            aria-valuenow={ratioPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Penggunaan penyimpanan lokal"
          >
            <div
              className={['h-full', overQuotaWarning ? 'bg-warning' : 'bg-secondary'].join(' ')}
              style={{ width: `${ratioPercent}%` }}
            />
          </div>

          {overQuotaWarning && (
            <p
              className="mt-4 border-[1.5px] border-warning bg-warning/10 p-3 text-xs text-warning"
              role="alert"
            >
              ! Penyimpanan melewati 80% kuota. Ekspor cadangan lalu pertimbangkan membersihkan data
              lama.
            </p>
          )}

          <button type="button" className="btn-ghost mt-5 min-h-[40px]" onClick={refreshUsage}>
            Hitung Ulang
          </button>
        </div>

        {/* Panel Integritas */}
        <div className="panel p-6">
          <p className="kicker mb-4">Integritas Buku Besar</p>
          <h3 className="font-display text-xl font-black tracking-[-0.01em] md:text-2xl">
            Verifikasi Rantai Hash
          </h3>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Setiap baris ledger menautkan hash baris sebelumnya. Verifikasi memeriksa keseluruhan
            rantai dari entri pertama.
          </p>
          <button
            type="button"
            className="btn-signal mt-6 min-h-[40px]"
            onClick={onVerify}
            disabled={verifying}
          >
            {verifying ? 'Memeriksa…' : 'Verifikasi Sekarang'}
          </button>

          {verification && (
            <div
              className={[
                'mt-5 border-[1.5px] p-4',
                verification.valid ? 'border-positive' : 'border-negative',
              ].join(' ')}
              role="status"
            >
              <p className="kicker mb-2">Hasil Terakhir</p>
              {verification.valid ? (
                <p className="text-sm">
                  Rantai valid. <span className="num font-mono">{verification.checked}</span> entri
                  diperiksa.
                </p>
              ) : (
                <p className="text-sm text-negative">
                  Rantai rusak setelah <span className="num font-mono">{verification.checked}</span>{' '}
                  entri. Entri pertama yang rusak:{' '}
                  <span className="font-mono">
                    {verification.brokenAt ?? 'tidak teridentifikasi'}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Panel Sentinel */}
        <div className="panel p-6">
          <p className="kicker mb-4">Cash Leakage Sentinel</p>
          <div className="grid grid-cols-1 border-l border-t border-border lg:grid-cols-2">
            <div className="border-b border-r border-border p-5">
              <h3
                id="ghost-heading"
                className="font-display text-lg font-black tracking-[-0.005em] md:text-xl"
              >
                Ghost Expenses
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Pengeluaran di atas Rp 1.000.000 tanpa lampiran bukti bayar.
              </p>
              {ghosts.length === 0 ? (
                <p className="mt-4 text-xs text-muted-foreground">
                  Tidak ada pengeluaran tanpa bukti.
                </p>
              ) : (
                <ul aria-labelledby="ghost-heading" className="mt-4 flex flex-col">
                  {ghosts.map((ghost) => (
                    <li
                      key={ghost.transactionId}
                      className="flex items-baseline justify-between gap-3 border-t border-rule/30 py-3 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="block">{ghost.description || '—'}</span>
                        <span className="num font-mono text-[0.625rem] text-muted-foreground">
                          {formatDateID(ghost.transactionDate)}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Badge variant="unverified">{ghost.status}</Badge>
                        <span className="num">{formatIDR(ghost.amount)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/sentinel" className="btn-ghost mt-5 min-h-[40px]">
                Buka Halaman Sentinel
              </Link>
            </div>

            <div className="border-b border-r border-border p-5">
              <h3
                id="aging-heading"
                className="font-display text-lg font-black tracking-[-0.005em] md:text-xl"
              >
                Aging Piutang
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Posisi per {formatDateID(aging.asOf)} — total {formatIDR(aging.total)}.
              </p>
              <ul aria-labelledby="aging-heading" className="mt-4 flex flex-col">
                {(['0-29', '30-59', '60-89', '90+'] as const).map((key) => (
                  <li
                    key={key}
                    className="flex items-baseline justify-between gap-3 border-t border-rule/30 py-3 text-sm"
                  >
                    <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {key} hari
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="num font-mono text-xs text-muted-foreground">
                        {aging.buckets[key].items.length} entri
                      </span>
                      <span
                        className={[
                          'num',
                          key === '90+' && aging.buckets[key].total > 0 ? 'text-negative' : '',
                        ].join(' ')}
                      >
                        {formatIDR(aging.buckets[key].total)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <Link to="/buku-besar" className="btn-ghost mt-5 min-h-[40px]">
                Telusuri Buku Besar
              </Link>
            </div>
          </div>
        </div>

        {/* Panel Tentang */}
        <div className="panel p-6">
          <p className="kicker mb-4">Tentang Aplikasi</p>
          <h3 className="font-display text-xl font-black tracking-[-0.01em] md:text-2xl">
            FinTrack Core
          </h3>
          <dl className="mt-5 grid grid-cols-1 border-l border-t border-border sm:grid-cols-2">
            <div className="border-b border-r border-border p-4">
              <dt className="kicker">Versi Aplikasi</dt>
              <dd className="num mt-2 font-mono text-sm">v{APP_VERSION}</dd>
            </div>
            <div className="border-b border-r border-border p-4">
              <dt className="kicker">Mode Penyimpanan</dt>
              <dd className="mt-2 font-mono text-sm">Lokal (localStorage)</dd>
            </div>
          </dl>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Seluruh data disimpan di peramban perangkat ini saja dan tidak pernah dikirim ke server.
            Data akan hilang bila data situs dibersihkan, peramban dipasang ulang, atau mode privat
            ditutup. Ekspor cadangan secara berkala.
          </p>
        </div>
      </div>

      <Modal
        open={pendingImport !== null}
        onClose={() => setPendingImport(null)}
        kicker="Konfirmasi Impor Cadangan"
        title="Timpa seluruh data lokal?"
        description="Data saat ini akan diganti sepenuhnya oleh isi berkas cadangan. Tindakan ini tidak dapat dibatalkan."
        actions={
          <>
            <button
              type="button"
              className="btn-ghost min-h-[40px]"
              onClick={() => setPendingImport(null)}
            >
              Batal
            </button>
            <button type="button" className="btn-signal min-h-[40px]" onClick={confirmImport}>
              Impor Sekarang
            </button>
          </>
        }
      >
        {pendingImport && (
          <dl className="grid grid-cols-1 border-l border-t border-border">
            <div className="border-b border-r border-border p-3">
              <dt className="kicker">Berkas</dt>
              <dd className="mt-1 break-all font-mono text-xs">{pendingImport.fileName}</dd>
            </div>
            <div className="border-b border-r border-border p-3">
              <dt className="kicker">Diekspor Pada</dt>
              <dd className="num mt-1 font-mono text-xs">
                {pendingImport.envelope.exportedAt ?? '—'}
              </dd>
            </div>
            <div className="border-b border-r border-border p-3">
              <dt className="kicker">Versi Skema</dt>
              <dd className="num mt-1 font-mono text-xs">
                {String(pendingImport.envelope.schemaVersion ?? '—')}
              </dd>
            </div>
          </dl>
        )}
      </Modal>

      <Modal
        open={resetOpen}
        onClose={() => {
          setResetOpen(false)
          setResetPhrase('')
        }}
        kicker="Konfirmasi Reset Data"
        title="Hapus seluruh data lokal?"
        description={`Semua akun, kategori, transaksi, dan baris buku besar akan dihapus permanen. Ketik "${RESET_PHRASE}" untuk mengonfirmasi.`}
        actions={
          <>
            <button
              type="button"
              className="btn-ghost min-h-[40px]"
              onClick={() => {
                setResetOpen(false)
                setResetPhrase('')
              }}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn min-h-[40px] border-negative bg-transparent text-negative hover:bg-muted disabled:opacity-40"
              onClick={confirmReset}
              disabled={resetPhrase.trim() !== RESET_PHRASE}
            >
              Hapus Permanen
            </button>
          </>
        }
      >
        <div>
          <label htmlFor="reset-phrase" className="kicker mb-2 block">
            Ketik {RESET_PHRASE}
          </label>
          <input
            id="reset-phrase"
            className="field font-mono"
            value={resetPhrase}
            autoComplete="off"
            onChange={(event) => setResetPhrase(event.target.value)}
          />
        </div>
      </Modal>
    </section>
  )
}
