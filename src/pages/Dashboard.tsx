import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import StatCard from '@/components/ui/StatCard'
import DataTable, { type Column } from '@/components/ui/DataTable'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import { useLedger } from '@/hooks/useLedger'
import { formatIDR } from '@/lib/money'
import { formatDateID } from '@/lib/date'
import type { Transaction, TransactionStatus } from '@/types'

const STATUS_VARIANT: Record<TransactionStatus, 'posted' | 'draft' | 'void'> = {
  POSTED: 'posted',
  DRAFT: 'draft',
  VOID: 'void',
}

const MUTATION_LABEL: Record<Transaction['mutationType'], string> = {
  INCOME: 'Pemasukan',
  EXPENSE: 'Pengeluaran',
  TRANSFER: 'Transfer',
  DEBT_PAYMENT: 'Bayar Utang',
}

/** Arah mutasi menentukan warna dan tanda nominal pada ringkasan. */
function signedAmount(tx: Transaction): number {
  if (tx.mutationType === 'INCOME') return tx.amount
  if (tx.mutationType === 'TRANSFER') return 0
  return -tx.amount
}

export default function Dashboard() {
  const { ready, summary, sentinel, transactions, accounts } = useLedger()

  const recent = useMemo(
    () => [...transactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
    [transactions]
  )

  const assetRows = useMemo(() => {
    const byCode = new Map(accounts.map((a) => [a.code, a.name] as const))
    return (summary?.assetBalances ?? []).map((line) => ({
      code: line.code,
      name: byCode.get(line.code) ?? line.name,
      amount: line.amount,
    }))
  }, [summary, accounts])

  const netProfit = (summary?.monthIncome ?? 0) - (summary?.monthExpense ?? 0)

  const columns: ReadonlyArray<Column<Transaction>> = [
    {
      key: 'transactionDate',
      header: 'Tanggal',
      render: (row) => (
        <span className="num whitespace-nowrap">{formatDateID(row.transactionDate)}</span>
      ),
    },
    {
      key: 'description',
      header: 'Deskripsi',
      render: (row) => (
        <span className="block max-w-[22rem] truncate">
          {row.description || <span className="text-muted-foreground">Tanpa deskripsi</span>}
        </span>
      ),
    },
    {
      key: 'mutationType',
      header: 'Jenis',
      render: (row) => (
        <span className="font-mono text-xs">{MUTATION_LABEL[row.mutationType]}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>,
    },
    {
      key: 'amount',
      header: 'Nominal',
      align: 'right',
      render: (row) => {
        const signed = signedAmount(row)
        const tone =
          signed > 0 ? 'text-positive' : signed < 0 ? 'text-negative' : 'text-muted-foreground'
        return (
          <span className={`num whitespace-nowrap ${tone}`}>
            {formatIDR(signed === 0 ? row.amount : signed)}
          </span>
        )
      },
    },
  ]

  return (
    <section className="space-y-10">
      {/* Hero ledger */}
      <div className="panel ledger-grid p-8 md:p-12">
        <p className="kicker">Fintrack Core — Ringkasan Buku Besar ————</p>
        <h1 className="mt-5 max-w-3xl">Meja kerja keuangan Anda hari ini</h1>
        <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Setiap mutasi dicatat sebagai jurnal double-entry yang berantai dan dapat diaudit. Koreksi
          tidak pernah menghapus baris — hanya menerbitkan jurnal pembalik.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/transaksi" className="btn-primary min-h-[40px]">
            Catat Transaksi
          </Link>
          <Link to="/buku-besar" className="btn-ghost min-h-[40px]">
            Buka Buku Besar
          </Link>
        </div>
      </div>

      {/* Baris statistik */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          kicker="Total Kas & Bank"
          value={formatIDR(summary?.totalCash ?? 0)}
          hint="Saldo gabungan akun 10100–10300."
        />
        <StatCard
          kicker="Pemasukan Bulan Ini"
          value={formatIDR(summary?.monthIncome ?? 0)}
          delta={{ value: summary?.month ?? '—', direction: 'positive', label: 'periode' }}
        />
        <StatCard
          kicker="Pengeluaran Bulan Ini"
          value={formatIDR(summary?.monthExpense ?? 0)}
          delta={{ value: summary?.month ?? '—', direction: 'negative', label: 'periode' }}
        />
        <StatCard
          kicker="Laba Bersih Bulan Ini"
          value={formatIDR(netProfit)}
          delta={{
            value: netProfit === 0 ? 'Impas' : netProfit > 0 ? 'Surplus' : 'Defisit',
            direction: netProfit > 0 ? 'positive' : netProfit < 0 ? 'negative' : 'neutral',
          }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Saldo per akun aset */}
        <div className="panel p-6">
          <p className="kicker">Saldo Akun Aset ————</p>
          <div className="rule-line mt-4" />
          {assetRows.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Belum ada saldo tercatat pada akun aset.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-rule/30">
              {assetRows.map((row) => (
                <li key={row.code} className="flex items-baseline justify-between gap-4 py-3">
                  <span className="min-w-0">
                    <span className="num font-mono text-xs text-muted-foreground">{row.code}</span>
                    <span className="ml-3 text-sm text-foreground">{row.name}</span>
                  </span>
                  <span
                    className={`num shrink-0 font-mono text-sm ${row.amount < 0 ? 'text-negative' : 'text-foreground'}`}
                  >
                    {formatIDR(row.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Panel sentinel */}
        <div className="panel p-6">
          <p className="kicker">Cash Leakage Sentinel ————</p>
          <div className="rule-line mt-4" />
          {!sentinel || sentinel.totalWarnings === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Tidak ada anomali terdeteksi. Piutang dan bukti bayar dalam kondisi tertib.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              <li className="border-[1.5px] border-warning p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Badge variant="unverified">Piutang Jatuh Tempo</Badge>
                  <span className="num font-mono text-sm text-warning">
                    {formatIDR(sentinel.agingOverdueTotal)}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {sentinel.agingOverdueCount} piutang berumur 30 hari ke atas. Bucket: 30-59 (
                  {sentinel.agingBuckets['30-59']}), 60-89 ({sentinel.agingBuckets['60-89']}), 90+ (
                  {sentinel.agingBuckets['90+']}).
                </p>
                <Link
                  to="/sentinel"
                  className="btn-ghost mt-4 min-h-[40px] border-warning text-warning"
                >
                  Lihat Detail Piutang
                </Link>
              </li>
              <li className="border-[1.5px] border-warning p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Badge variant="unverified">Ghost Expense</Badge>
                  <span className="num font-mono text-sm text-warning">
                    {formatIDR(sentinel.ghostExpenseTotal)}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {sentinel.ghostExpenseCount} pengeluaran di atas Rp 1.000.000 belum memiliki
                  lampiran bukti bayar.
                </p>
                <Link
                  to="/sentinel"
                  className="btn-ghost mt-4 min-h-[40px] border-warning text-warning"
                >
                  Lihat Temuan Ghost Expense
                </Link>
              </li>
            </ul>
          )}
        </div>
      </div>

      {/* Transaksi terbaru */}
      <div>
        <p className="kicker mb-3">Transaksi Terbaru ————</p>
        <div className="rule-line mb-5" />
        {ready && recent.length === 0 ? (
          <EmptyState
            title="Buku besar masih kosong"
            description="Belum ada satu pun jurnal tercatat. Mulai dengan mencatat transaksi pertama Anda untuk membuka ringkasan, laporan, dan pemantauan sentinel."
            action={
              <Link to="/transaksi" className="btn-primary min-h-[40px]">
                Catat Transaksi Pertama
              </Link>
            }
          />
        ) : (
          <DataTable
            columns={columns}
            rows={recent}
            getRowKey={(row) => row.id}
            caption="Delapan entri terakhir"
            emptyTitle="Belum ada transaksi"
            emptyDescription="Catat transaksi pertama untuk mengisi buku besar."
          />
        )}
      </div>
    </section>
  )
}
