import { useMemo, useState } from 'react'
import SectionHeader from '@/components/ui/SectionHeader'
import DataTable, { type Column } from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import QuickEntryForm from '@/components/transaction/QuickEntryForm'
import { useLedger } from '@/hooks/useLedger'
import { formatIDR } from '@/lib/money'
import { formatDateID, monthKey, toISODate } from '@/lib/date'
import type { Account, Category, MutationType, Transaction, TransactionStatus } from '@/types'

const STATUS_VARIANT: Record<TransactionStatus, 'posted' | 'draft' | 'void'> = {
  POSTED: 'posted',
  DRAFT: 'draft',
  VOID: 'void',
}

const MUTATION_LABEL: Record<MutationType, string> = {
  INCOME: 'Pemasukan',
  EXPENSE: 'Pengeluaran',
  TRANSFER: 'Transfer',
  DEBT_PAYMENT: 'Bayar Utang',
}

const MUTATION_VALUES: ReadonlyArray<MutationType> = ['INCOME', 'EXPENSE', 'TRANSFER', 'DEBT_PAYMENT']
const STATUS_VALUES: ReadonlyArray<TransactionStatus> = ['POSTED', 'DRAFT', 'VOID']

/** Arah mutasi menentukan tanda dan warna nominal. */
function signedAmount(tx: Transaction): number {
  if (tx.mutationType === 'INCOME') return tx.amount
  if (tx.mutationType === 'TRANSFER') return 0
  return -tx.amount
}

export default function Transactions() {
  const { transactions, accounts, categories, reverse } = useLedger()

  const [entryOpen, setEntryOpen] = useState(false)
  const [reversalTarget, setReversalTarget] = useState<Transaction | null>(null)
  const [reversing, setReversing] = useState(false)

  const [month, setMonth] = useState('')
  const [mutationFilter, setMutationFilter] = useState<'' | MutationType>('')
  const [statusFilter, setStatusFilter] = useState<'' | TransactionStatus>('')
  const [search, setSearch] = useState('')

  const accountById = useMemo(() => {
    const map = new Map<string, Account>()
    for (const a of accounts) map.set(a.id, a)
    return map
  }, [accounts])

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>()
    for (const c of categories) map.set(c.id, c)
    return map
  }, [categories])

  const months = useMemo(() => {
    const set = new Set<string>()
    for (const tx of transactions) set.add(monthKey(tx.transactionDate))
    set.add(monthKey(toISODate(new Date())))
    return [...set].sort((a, b) => b.localeCompare(a))
  }, [transactions])

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return [...transactions]
      .filter((tx) => {
        if (month !== '' && monthKey(tx.transactionDate) !== month) return false
        if (mutationFilter !== '' && tx.mutationType !== mutationFilter) return false
        if (statusFilter !== '' && tx.status !== statusFilter) return false
        if (needle !== '' && !tx.description.toLowerCase().includes(needle)) return false
        return true
      })
      .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate) || b.createdAt.localeCompare(a.createdAt))
  }, [transactions, month, mutationFilter, statusFilter, search])

  /** Akun kas/bank yang terlibat, ditampilkan sebagai kolom Akun. */
  function accountLabel(tx: Transaction): string {
    const source = accountById.get(tx.sourceAccountId)
    const destination = accountById.get(tx.destinationAccountId)
    if (tx.mutationType === 'TRANSFER' && source && destination) {
      return `${source.code} → ${destination.code}`
    }
    const used = tx.mutationType === 'INCOME' ? destination : source
    return used ? `${used.code} · ${used.name}` : '—'
  }

  async function confirmReversal() {
    if (!reversalTarget) return
    setReversing(true)
    const result = await reverse(reversalTarget.id)
    setReversing(false)
    if (result) setReversalTarget(null)
  }

  const columns: ReadonlyArray<Column<Transaction>> = [
    {
      key: 'transactionDate',
      header: 'Tanggal',
      render: (row) => <span className="num whitespace-nowrap">{formatDateID(row.transactionDate)}</span>,
    },
    {
      key: 'description',
      header: 'Deskripsi',
      render: (row) => (
        <span className="block max-w-[20rem] truncate">
          {row.description || <span className="text-muted-foreground">Tanpa deskripsi</span>}
        </span>
      ),
    },
    {
      key: 'categoryId',
      header: 'Kategori',
      render: (row) => (
        <span className="text-sm">
          {categoryById.get(row.categoryId)?.name ?? (
            <span className="font-mono text-xs text-muted-foreground">{MUTATION_LABEL[row.mutationType]}</span>
          )}
        </span>
      ),
    },
    {
      key: 'account',
      header: 'Akun',
      render: (row) => <span className="num font-mono text-xs text-muted-foreground">{accountLabel(row)}</span>,
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
        const tone = signed > 0 ? 'text-positive' : signed < 0 ? 'text-negative' : 'text-muted-foreground'
        return <span className={`num whitespace-nowrap ${tone}`}>{formatIDR(signed === 0 ? row.amount : signed)}</span>
      },
    },
    {
      key: 'aksi',
      header: 'Aksi',
      align: 'right',
      render: (row) =>
        row.status === 'POSTED' ? (
          <button
            type="button"
            className="btn-ghost min-h-[36px] px-3 py-1"
            aria-label={`Balik transaksi ${row.description || formatDateID(row.transactionDate)}`}
            onClick={() => setReversalTarget(row)}
          >
            Balik
          </button>
        ) : (
          <span className="font-mono text-xs text-muted-foreground">—</span>
        ),
    },
  ]

  return (
    <section>
      <SectionHeader
        kicker="Ledger — Daftar Transaksi"
        title="Riwayat mutasi tercatat"
        description="Seluruh jurnal yang pernah diposting. Koreksi dilakukan dengan menerbitkan jurnal pembalik, bukan menghapus baris."
        action={
          <button type="button" className="btn-primary min-h-[40px]" onClick={() => setEntryOpen(true)}>
            Catat Transaksi
          </button>
        }
      />

      {/* Filter */}
      <div className="panel mb-6 grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <label htmlFor="filter-bulan" className="kicker mb-2 block">
            Bulan
          </label>
          <select
            id="filter-bulan"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="field num min-h-[40px]"
          >
            <option value="">Semua bulan</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-mutasi" className="kicker mb-2 block">
            Tipe Mutasi
          </label>
          <select
            id="filter-mutasi"
            value={mutationFilter}
            onChange={(e) => setMutationFilter(e.target.value as '' | MutationType)}
            className="field min-h-[40px]"
          >
            <option value="">Semua tipe</option>
            {MUTATION_VALUES.map((m) => (
              <option key={m} value={m}>
                {MUTATION_LABEL[m]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-status" className="kicker mb-2 block">
            Status
          </label>
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as '' | TransactionStatus)}
            className="field min-h-[40px]"
          >
            <option value="">Semua status</option>
            {STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-cari" className="kicker mb-2 block">
            Cari Deskripsi
          </label>
          <input
            id="filter-cari"
            type="search"
            autoComplete="off"
            placeholder="Kata kunci deskripsi"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field min-h-[40px]"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        caption={`${rows.length} entri ditampilkan`}
        emptyTitle="Tidak ada transaksi yang cocok"
        emptyDescription="Ubah filter di atas, atau catat transaksi baru untuk mengisi buku besar."
        emptyAction={
          <button type="button" className="btn-primary min-h-[40px]" onClick={() => setEntryOpen(true)}>
            Catat Transaksi
          </button>
        }
      />

      {/* Modal pencatatan */}
      <Modal
        open={entryOpen}
        onClose={() => setEntryOpen(false)}
        kicker="Quick Entry — Jurnal Baru"
        title="Catat Transaksi"
        description="Satu masukan single-entry akan diuraikan menjadi pasangan Debit/Kredit yang seimbang."
        actions={<span className="sr-only">Aksi berada di dalam formulir</span>}
      >
        <QuickEntryForm onPosted={() => setEntryOpen(false)} onCancel={() => setEntryOpen(false)} />
      </Modal>

      {/* Modal konfirmasi pembalikan */}
      <Modal
        open={reversalTarget !== null}
        onClose={() => setReversalTarget(null)}
        kicker="Konfirmasi Pembalikan Jurnal"
        title="Terbitkan jurnal pembalik?"
        description="Transaksi asal tidak dihapus. Statusnya berubah menjadi VOID dan sistem menerbitkan jurnal pembalik dengan sisi Debit/Kredit yang ditukar, sehingga efek bersihnya nol dan jejak audit tetap utuh."
        actions={
          <>
            <button type="button" className="btn-ghost min-h-[40px]" onClick={() => setReversalTarget(null)}>
              Batal
            </button>
            <button
              type="button"
              className="btn-ghost min-h-[40px] border-negative text-negative"
              onClick={confirmReversal}
              disabled={reversing}
            >
              {reversing ? 'Memproses…' : 'Terbitkan Pembalik'}
            </button>
          </>
        }
      >
        {reversalTarget && (
          <dl className="border border-border">
            <div className="flex items-baseline justify-between gap-4 border-b border-rule/30 px-4 py-3">
              <dt className="kicker">Tanggal</dt>
              <dd className="num font-mono text-sm">{formatDateID(reversalTarget.transactionDate)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-rule/30 px-4 py-3">
              <dt className="kicker">Deskripsi</dt>
              <dd className="min-w-0 truncate text-sm">{reversalTarget.description || '—'}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-rule/30 px-4 py-3">
              <dt className="kicker">Tipe</dt>
              <dd className="font-mono text-xs">{MUTATION_LABEL[reversalTarget.mutationType]}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 px-4 py-3">
              <dt className="kicker">Nominal</dt>
              <dd className="num font-mono text-sm">{formatIDR(reversalTarget.amount)}</dd>
            </div>
          </dl>
        )}
      </Modal>
    </section>
  )
}
