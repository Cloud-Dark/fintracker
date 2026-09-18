import { useCallback, useEffect, useMemo, useState } from 'react'
import DataTable, { type Column } from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'
import { bootstrap, getAccounts, getLedgerEntries } from '@/repositories/db'
import { generalLedger, type GeneralLedgerFilter, type GeneralLedgerRow } from '@/domain/reporting'
import { verifyChain, type ChainVerification } from '@/domain/kernel'
import { formatIDR } from '@/lib/money'
import { formatDateID, startOfMonth, toISODate } from '@/lib/date'
import type { Account, EntryType, TransactionStatus } from '@/types'

type EntryFilter = EntryType | 'ALL'

/** Potong hash rantai jadi 8 karakter agar tetap terbaca pada kolom sempit. */
function shortHash(value: string): string {
  if (!value) return '—'
  return `${value.slice(0, 8)}…`
}

const STATUS_VARIANT: Record<TransactionStatus, 'posted' | 'draft' | 'void'> = {
  POSTED: 'posted',
  DRAFT: 'draft',
  VOID: 'void',
}

export default function GeneralLedger() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState('')
  const [from, setFrom] = useState(() => toISODate(startOfMonth(new Date())))
  const [to, setTo] = useState(() => toISODate(new Date()))
  const [entryType, setEntryType] = useState<EntryFilter>('ALL')
  const [verification, setVerification] = useState<ChainVerification | null>(null)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    bootstrap()
    setAccounts(getAccounts())
  }, [])

  const rows = useMemo<GeneralLedgerRow[]>(() => {
    const filter: GeneralLedgerFilter = {}
    if (accountId) filter.accountId = accountId
    if (from) filter.from = from
    if (to) filter.to = to
    if (entryType !== 'ALL') filter.entryType = entryType
    return generalLedger(filter)
  }, [accountId, from, to, entryType])

  // Peta baris ledger -> pasangan hash rantai untuk kolom audit.
  const hashById = useMemo(() => {
    const map = new Map<string, { prevHash: string; entryHash: string }>()
    for (const entry of getLedgerEntries()) {
      map.set(entry.id, { prevHash: entry.prevHash, entryHash: entry.entryHash })
    }
    return map
  }, [rows])

  const totals = useMemo(() => {
    let debit = 0
    let credit = 0
    for (const row of rows) {
      if (row.entryType === 'DEBIT') debit += row.amount
      else credit += row.amount
    }
    return { debit, credit, difference: debit - credit }
  }, [rows])

  const onVerify = useCallback(() => {
    setVerifying(true)
    void verifyChain()
      .then((result) => setVerification(result))
      .catch(() => setVerification({ valid: false, brokenAt: null, checked: 0 }))
      .finally(() => setVerifying(false))
  }, [])

  const columns: ReadonlyArray<Column<GeneralLedgerRow>> = useMemo(
    () => [
      {
        key: 'sequenceNum',
        header: 'No. Urut',
        align: 'right',
        render: (row) => <span className="font-mono text-xs">{row.sequenceNum}</span>,
      },
      {
        key: 'transactionDate',
        header: 'Tanggal',
        render: (row) => <span className="num whitespace-nowrap">{formatDateID(row.transactionDate)}</span>,
      },
      {
        key: 'description',
        header: 'Deskripsi',
        render: (row) => (
          <div className="min-w-[12rem]">
            <span className="block">{row.description || '—'}</span>
            <Badge variant={STATUS_VARIANT[row.status]} className="mt-1">
              {row.status}
            </Badge>
          </div>
        ),
      },
      {
        key: 'account',
        header: 'Akun',
        render: (row) => (
          <div className="min-w-[11rem]">
            <span className="num font-mono text-xs text-muted-foreground">{row.accountCode}</span>
            <span className="block">{row.accountName}</span>
          </div>
        ),
      },
      {
        key: 'debit',
        header: 'Debit',
        align: 'right',
        render: (row) => (row.entryType === 'DEBIT' ? formatIDR(row.amount) : '—'),
      },
      {
        key: 'credit',
        header: 'Kredit',
        align: 'right',
        render: (row) => (row.entryType === 'CREDIT' ? formatIDR(row.amount) : '—'),
      },
      {
        key: 'runningBalance',
        header: 'Saldo Berjalan',
        align: 'right',
        render: (row) => (
          <span className={row.runningBalance < 0 ? 'text-negative' : undefined}>
            {formatIDR(row.runningBalance)}
          </span>
        ),
      },
      {
        key: 'hash',
        header: 'Rantai (prev → entry)',
        render: (row) => {
          const hashes = hashById.get(row.id)
          return (
            <span className="whitespace-nowrap font-mono text-[0.625rem] text-muted-foreground">
              {shortHash(hashes?.prevHash ?? '')} <span aria-hidden="true">→</span>{' '}
              {shortHash(hashes?.entryHash ?? '')}
            </span>
          )
        },
      },
    ],
    [hashById],
  )

  const balanced = totals.difference === 0

  return (
    <section>
      <SectionHeader
        kicker="Ledger — Buku Besar"
        title="Buku Besar"
        description="Seluruh baris jurnal tercatat berurutan dan tidak dapat diubah. Saring per akun, rentang tanggal, atau sisi entri."
        action={
          <button type="button" className="btn-signal min-h-[40px]" onClick={onVerify} disabled={verifying}>
            {verifying ? 'Memeriksa…' : 'Verifikasi Integritas'}
          </button>
        }
      />

      <div className="panel mb-6 p-5">
        <p className="kicker mb-4">Filter</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="gl-account" className="kicker mb-2 block">
              Akun
            </label>
            <select
              id="gl-account"
              className="field"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
            >
              <option value="">Semua akun</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} — {account.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="gl-from" className="kicker mb-2 block">
              Dari Tanggal
            </label>
            <input
              id="gl-from"
              type="date"
              className="field num"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="gl-to" className="kicker mb-2 block">
              Sampai Tanggal
            </label>
            <input
              id="gl-to"
              type="date"
              className="field num"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="gl-entry" className="kicker mb-2 block">
              Tipe Entri
            </label>
            <select
              id="gl-entry"
              className="field"
              value={entryType}
              onChange={(event) => setEntryType(event.target.value as EntryFilter)}
            >
              <option value="ALL">Semua</option>
              <option value="DEBIT">Debit</option>
              <option value="CREDIT">Kredit</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ringkasan total — grid berbingkai */}
      <div className="mb-6 grid grid-cols-1 border-l border-t border-border sm:grid-cols-3">
        <div className="border-b border-r border-border p-5">
          <p className="kicker">Total Debit</p>
          <p className="num mt-3 font-display text-2xl font-black tracking-[-0.02em]">{formatIDR(totals.debit)}</p>
        </div>
        <div className="border-b border-r border-border p-5">
          <p className="kicker">Total Kredit</p>
          <p className="num mt-3 font-display text-2xl font-black tracking-[-0.02em]">{formatIDR(totals.credit)}</p>
        </div>
        <div className={['border-b border-r border-border p-5', balanced ? '' : 'bg-warning/10'].join(' ')}>
          <p className="kicker">Selisih</p>
          <p
            className={[
              'num mt-3 font-display text-2xl font-black tracking-[-0.02em]',
              balanced ? 'text-muted-foreground' : 'text-negative',
            ].join(' ')}
          >
            {formatIDR(totals.difference)}
          </p>
          {!balanced && (
            <p className="mt-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-negative">
              ! Galat — debit dan kredit tidak seimbang
            </p>
          )}
        </div>
      </div>

      {verification && (
        <div
          className={['panel mb-6 border-[1.5px] p-5', verification.valid ? 'border-positive' : 'border-negative'].join(
            ' ',
          )}
          role="status"
        >
          <p className="kicker mb-2">Verifikasi Rantai Hash</p>
          {verification.valid ? (
            <p className="text-sm">
              Rantai valid. <span className="num font-mono">{verification.checked}</span> entri diperiksa tanpa
              penyimpangan.
            </p>
          ) : (
            <p className="text-sm text-negative">
              Rantai rusak setelah <span className="num font-mono">{verification.checked}</span> entri diperiksa. Entri
              pertama yang rusak:{' '}
              <span className="font-mono">{verification.brokenAt ?? 'tidak teridentifikasi'}</span>
            </p>
          )}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        caption={`Buku besar — ${rows.length} baris jurnal pada rentang terpilih`}
        emptyTitle="Tidak ada baris jurnal"
        emptyDescription="Tidak ada entri buku besar yang cocok dengan filter saat ini."
      />
    </section>
  )
}
