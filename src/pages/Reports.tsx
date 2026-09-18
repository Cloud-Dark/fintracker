import { useMemo, useState } from 'react'
import SectionHeader from '@/components/ui/SectionHeader'
import {
  balanceSheet,
  cashFlow,
  profitAndLoss,
  type BalanceSheet,
  type CashFlow,
  type CashFlowActivity,
  type CashFlowItem,
  type ProfitAndLoss,
  type ReportLine,
} from '@/domain/reporting'
import { formatIDR } from '@/lib/money'
import { endOfMonth, formatDateID, startOfMonth, toISODate } from '@/lib/date'

type TabKey = 'laba-rugi' | 'neraca' | 'arus-kas'
type PeriodKey = 'bulan-ini' | 'bulan-lalu' | 'tahun-ini' | 'kustom'

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: 'laba-rugi', label: 'Laba Rugi' },
  { key: 'neraca', label: 'Neraca' },
  { key: 'arus-kas', label: 'Arus Kas' },
]

const PERIODS: ReadonlyArray<{ key: PeriodKey; label: string }> = [
  { key: 'bulan-ini', label: 'Bulan Berjalan' },
  { key: 'bulan-lalu', label: 'Bulan Lalu' },
  { key: 'tahun-ini', label: 'Tahun Berjalan' },
  { key: 'kustom', label: 'Kustom' },
]

function defaultRange(period: PeriodKey): { from: string; to: string } {
  const now = new Date()
  if (period === 'bulan-lalu') {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return { from: toISODate(startOfMonth(prev)), to: toISODate(endOfMonth(prev)) }
  }
  if (period === 'tahun-ini') {
    return { from: `${now.getFullYear()}-01-01`, to: toISODate(now) }
  }
  return { from: toISODate(startOfMonth(now)), to: toISODate(endOfMonth(now)) }
}

/** Unduh CSV di sisi klien; object URL selalu di-revoke setelah dipakai. */
function downloadCsv(fileName: string, table: ReadonlyArray<ReadonlyArray<string | number>>): void {
  const escape = (cell: string | number): string => {
    const text = String(cell)
    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const csv = table.map((row) => row.map(escape).join(';')).join('\r\n')
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

type RowKind = 'detail' | 'subtotal' | 'total'

function LedgerRow({
  label,
  amount,
  kind = 'detail',
  code,
}: {
  label: string
  amount: number
  kind?: RowKind
  code?: string
}) {
  const emphasis = kind !== 'detail'
  return (
    <div
      className={[
        'flex items-baseline justify-between gap-4 px-4 py-2.5',
        emphasis ? 'border-t-[1.5px] border-border font-bold' : 'border-t border-rule/30',
        kind === 'total' ? 'bg-muted' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className={['min-w-0 text-sm', emphasis ? 'font-bold' : ''].join(' ')}>
        {code && <span className="num mr-2 font-mono text-xs text-muted-foreground">{code}</span>}
        {label}
      </span>
      <span
        className={[
          'num shrink-0 text-sm',
          emphasis ? 'font-display font-black' : '',
          amount < 0 ? 'text-negative' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {formatIDR(amount)}
      </span>
    </div>
  )
}

function ReportPanel({
  title,
  meta,
  onExport,
  children,
}: {
  title: string
  meta: string
  onExport: () => void
  children: React.ReactNode
}) {
  return (
    <div className="panel">
      <div className="flex flex-col gap-3 border-b-[1.5px] border-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-xl font-black tracking-[-0.01em] md:text-2xl">{title}</h3>
          <p className="kicker mt-2">{meta}</p>
        </div>
        <button type="button" className="btn-ghost min-h-[40px] shrink-0" onClick={onExport}>
          Unduh CSV
        </button>
      </div>
      <div className="p-1 sm:p-2">{children}</div>
    </div>
  )
}

const ACTIVITY_LABEL: Record<CashFlowActivity, string> = {
  OPERATING: 'Operasi',
  INVESTING: 'Investasi',
  FINANCING: 'Pendanaan',
  EXCLUDED: 'Dikecualikan',
}

export default function Reports() {
  const [tab, setTab] = useState<TabKey>('laba-rugi')
  const [period, setPeriod] = useState<PeriodKey>('bulan-ini')
  const [custom, setCustom] = useState(() => defaultRange('bulan-ini'))

  const range = useMemo(
    () => (period === 'kustom' ? custom : defaultRange(period)),
    [period, custom],
  )

  const pnl: ProfitAndLoss = useMemo(() => profitAndLoss(range), [range])
  const sheet: BalanceSheet = useMemo(() => balanceSheet(range.to), [range])
  const flow: CashFlow = useMemo(() => cashFlow(range), [range])

  const periodLabel = `${formatDateID(range.from)} — ${formatDateID(range.to)}`

  const exportPnl = () => {
    const table: Array<Array<string | number>> = [
      ['Laporan Laba Rugi'],
      ['Periode', range.from, range.to],
      [],
      ['Pos', 'Kode', 'Nominal'],
      ['Pendapatan Operasional', '', pnl.revenueOperating],
      ['Harga Pokok Penjualan', '', pnl.cogs],
      ['Laba Kotor', '', pnl.grossProfit],
      ['Beban Operasional', '', pnl.opex],
      ['Laba Operasi', '', pnl.operatingProfit],
      ['Pendapatan Non-Operasional', '', pnl.revenueNonOperating],
      ['Laba Bersih', '', pnl.netProfit],
      [],
      ['Rincian Akun', 'Kode', 'Nominal'],
      ...pnl.lines.map((line: ReportLine) => [line.name, line.code, line.amount]),
    ]
    downloadCsv(`laba-rugi-${range.from}-${range.to}.csv`, table)
  }

  const exportSheet = () => {
    const table: Array<Array<string | number>> = [
      ['Neraca'],
      ['Per tanggal', range.to],
      [],
      ['Seksi', 'Kode', 'Nama Akun', 'Saldo'],
      ...sheet.assetLines.map((l) => ['ASET', l.code, l.name, l.amount]),
      ['ASET', '', 'Total Aset', sheet.assets],
      ...sheet.liabilityLines.map((l) => ['LIABILITAS', l.code, l.name, l.amount]),
      ['LIABILITAS', '', 'Total Liabilitas', sheet.liabilities],
      ...sheet.equityLines.map((l) => ['EKUITAS', l.code, l.name, l.amount]),
      ['EKUITAS', '', 'Total Ekuitas', sheet.equity],
      [],
      ['Seimbang', sheet.isBalanced ? 'YA' : 'TIDAK'],
      ['Selisih', sheet.difference],
    ]
    downloadCsv(`neraca-${range.to}.csv`, table)
  }

  const exportFlow = () => {
    const items: CashFlowItem[] = [...flow.inflows, ...flow.outflows].sort((a, b) =>
      a.date.localeCompare(b.date),
    )
    const table: Array<Array<string | number>> = [
      ['Laporan Arus Kas (Metode Langsung)'],
      ['Periode', range.from, range.to],
      [],
      ['Saldo Awal Kas', flow.openingBalance],
      ['Arus Kas Operasi', flow.operating],
      ['Arus Kas Investasi', flow.investing],
      ['Arus Kas Pendanaan', flow.financing],
      ['Perubahan Kas Bersih', flow.netChange],
      ['Saldo Akhir Kas', flow.closingBalance],
      [],
      ['Tanggal', 'Deskripsi', 'Akun Kas', 'Akun Lawan', 'Aktivitas', 'Nominal'],
      ...items.map((i) => [
        i.date,
        i.description,
        i.accountCode,
        i.contraAccountCode,
        ACTIVITY_LABEL[i.activity],
        i.amount,
      ]),
    ]
    downloadCsv(`arus-kas-${range.from}-${range.to}.csv`, table)
  }

  return (
    <section>
      <SectionHeader
        kicker="Laporan — Ringkasan Keuangan"
        title="Laporan Keuangan"
        description="Laba rugi multi-step, neraca, dan arus kas metode langsung, dihitung langsung dari baris buku besar."
      />

      {/* Pemilih periode */}
      <div className="panel mb-6 p-5">
        <p className="kicker mb-4">Periode Laporan</p>
        <div className="flex flex-wrap gap-0 border-l border-t border-border">
          {PERIODS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setPeriod(item.key)
                if (item.key !== 'kustom') setCustom(defaultRange(item.key))
              }}
              aria-pressed={period === item.key}
              className={[
                'min-h-[40px] border-b border-r border-border px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] transition-colors duration-200 ease-editorial',
                period === item.key ? 'bg-primary text-primary-foreground' : 'bg-transparent hover:bg-muted',
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </div>

        {period === 'kustom' && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-xl">
            <div>
              <label htmlFor="rep-from" className="kicker mb-2 block">
                Dari Tanggal
              </label>
              <input
                id="rep-from"
                type="date"
                className="field num"
                value={custom.from}
                onChange={(event) => setCustom((prev) => ({ ...prev, from: event.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="rep-to" className="kicker mb-2 block">
                Sampai Tanggal
              </label>
              <input
                id="rep-to"
                type="date"
                className="field num"
                value={custom.to}
                onChange={(event) => setCustom((prev) => ({ ...prev, to: event.target.value }))}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tab kotak berbingkai */}
      <div className="mb-6 flex flex-wrap border-l border-t border-border" role="tablist" aria-label="Jenis laporan">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            id={`tab-${item.key}`}
            aria-selected={tab === item.key}
            aria-controls={`panel-${item.key}`}
            onClick={() => setTab(item.key)}
            className={[
              'min-h-[44px] flex-1 border-b-[1.5px] border-r border-border px-5 py-3 font-mono text-xs uppercase tracking-[0.18em] transition-colors duration-200 ease-editorial sm:flex-none',
              tab === item.key
                ? 'bg-card font-bold text-foreground shadow-hard-xs'
                : 'bg-transparent text-muted-foreground hover:bg-muted',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'laba-rugi' && (
        <div role="tabpanel" id="panel-laba-rugi" aria-labelledby="tab-laba-rugi">
          <ReportPanel title="Laba Rugi Multi-Step" meta={`Periode ${periodLabel}`} onExport={exportPnl}>
            <LedgerRow label="Pendapatan Operasional" amount={pnl.revenueOperating} />
            <LedgerRow label="Harga Pokok Penjualan (HPP)" amount={-pnl.cogs} />
            <LedgerRow label="Laba Kotor" amount={pnl.grossProfit} kind="subtotal" />
            <LedgerRow label="Beban Operasional (OPEX)" amount={-pnl.opex} />
            <LedgerRow label="Laba Operasi" amount={pnl.operatingProfit} kind="subtotal" />
            <LedgerRow label="Pendapatan Non-Operasional" amount={pnl.revenueNonOperating} />
            <LedgerRow label="Laba Bersih" amount={pnl.netProfit} kind="total" />

            {pnl.lines.length > 0 && (
              <div className="mt-6">
                <p className="kicker px-4 py-2">Rincian per Akun</p>
                {pnl.lines.map((line) => (
                  <LedgerRow key={line.code} code={line.code} label={line.name} amount={line.amount} />
                ))}
              </div>
            )}
          </ReportPanel>
        </div>
      )}

      {tab === 'neraca' && (
        <div role="tabpanel" id="panel-neraca" aria-labelledby="tab-neraca">
          <ReportPanel title="Neraca" meta={`Per ${formatDateID(range.to)}`} onExport={exportSheet}>
            {!sheet.isBalanced && (
              <div className="m-3 border-[1.5px] border-negative bg-warning/10 p-4" role="alert">
                <p className="kicker mb-1 text-negative">! Neraca Tidak Seimbang</p>
                <p className="num font-display text-xl font-black text-negative">{formatIDR(sheet.difference)}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Aset tidak sama dengan liabilitas ditambah ekuitas. Jalankan verifikasi integritas pada buku besar.
                </p>
              </div>
            )}

            <p className="kicker px-4 py-2">Aset</p>
            {sheet.assetLines.map((line) => (
              <LedgerRow key={`a-${line.code}`} code={line.code} label={line.name} amount={line.amount} />
            ))}
            <LedgerRow label="Total Aset" amount={sheet.assets} kind="subtotal" />

            <p className="kicker px-4 pt-6 pb-2">Liabilitas</p>
            {sheet.liabilityLines.map((line) => (
              <LedgerRow key={`l-${line.code}`} code={line.code} label={line.name} amount={line.amount} />
            ))}
            <LedgerRow label="Total Liabilitas" amount={sheet.liabilities} kind="subtotal" />

            <p className="kicker px-4 pt-6 pb-2">Ekuitas</p>
            {sheet.equityLines.map((line) => (
              <LedgerRow key={`e-${line.code}`} code={line.code} label={line.name} amount={line.amount} />
            ))}
            <LedgerRow label="Total Ekuitas" amount={sheet.equity} kind="subtotal" />

            <LedgerRow
              label="Total Liabilitas + Ekuitas"
              amount={sheet.liabilities + sheet.equity}
              kind="total"
            />
            <div className="px-4 py-3">
              <span
                className={[
                  'badge',
                  sheet.isBalanced ? 'border-positive text-positive' : 'border-negative text-negative',
                ].join(' ')}
              >
                {sheet.isBalanced ? 'Seimbang' : '! Tidak Seimbang'}
              </span>
            </div>
          </ReportPanel>
        </div>
      )}

      {tab === 'arus-kas' && (
        <div role="tabpanel" id="panel-arus-kas" aria-labelledby="tab-arus-kas">
          <ReportPanel
            title="Arus Kas — Metode Langsung"
            meta={`Periode ${periodLabel}`}
            onExport={exportFlow}
          >
            <LedgerRow label="Saldo Awal Kas" amount={flow.openingBalance} kind="subtotal" />
            <LedgerRow label="Arus Kas dari Aktivitas Operasi" amount={flow.operating} />
            <LedgerRow label="Arus Kas dari Aktivitas Investasi" amount={flow.investing} />
            <LedgerRow label="Arus Kas dari Aktivitas Pendanaan" amount={flow.financing} />
            <LedgerRow label="Perubahan Kas Bersih" amount={flow.netChange} kind="subtotal" />
            <LedgerRow label="Saldo Akhir Kas" amount={flow.closingBalance} kind="total" />

            <div className="mt-6 grid grid-cols-1 gap-0 border-l border-t border-border lg:grid-cols-2">
              <div className="border-b border-r border-border p-4">
                <p className="kicker mb-3">Penerimaan Kas</p>
                {flow.inflows.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Tidak ada penerimaan kas pada periode ini.</p>
                ) : (
                  flow.inflows.map((item) => (
                    <div
                      key={`${item.transactionId}-${item.accountCode}-in`}
                      className="flex items-baseline justify-between gap-3 border-t border-rule/30 py-2 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="num mr-2 font-mono text-[0.625rem] text-muted-foreground">
                          {item.date}
                        </span>
                        {item.description || '—'}
                        <span className="ml-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">
                          {ACTIVITY_LABEL[item.activity]}
                        </span>
                      </span>
                      <span className="num shrink-0 text-positive">{formatIDR(item.amount)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="border-b border-r border-border p-4">
                <p className="kicker mb-3">Pengeluaran Kas</p>
                {flow.outflows.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Tidak ada pengeluaran kas pada periode ini.</p>
                ) : (
                  flow.outflows.map((item) => (
                    <div
                      key={`${item.transactionId}-${item.accountCode}-out`}
                      className="flex items-baseline justify-between gap-3 border-t border-rule/30 py-2 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="num mr-2 font-mono text-[0.625rem] text-muted-foreground">
                          {item.date}
                        </span>
                        {item.description || '—'}
                        <span className="ml-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">
                          {ACTIVITY_LABEL[item.activity]}
                        </span>
                      </span>
                      <span className="num shrink-0 text-negative">{formatIDR(item.amount)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </ReportPanel>
        </div>
      )}
    </section>
  )
}
