// Laporan keuangan — fungsi domain murni atas baris ledger.
// Formula: docs/22_ACCOUNTING_SPEC.md bagian 7; FR-020..FR-024.

import type { Account, EntryType, LedgerEntry, Transaction } from '@/types'
import { monthKey, toISODate } from '@/lib/date'
import { getAccounts, getLedgerEntries, getTransactions } from '@/repositories/db'

export interface DateRange {
  from: string
  to: string
}

export interface ReportLine {
  code: string
  name: string
  amount: number
}

export interface ProfitAndLoss {
  revenueOperating: number
  cogs: number
  grossProfit: number
  opex: number
  operatingProfit: number
  revenueNonOperating: number
  netProfit: number
  lines: ReportLine[]
}

export interface BalanceSheet {
  assets: number
  liabilities: number
  equity: number
  retainedEarnings: number
  isBalanced: boolean
  difference: number
  assetLines: ReportLine[]
  liabilityLines: ReportLine[]
  equityLines: ReportLine[]
}

export interface CashFlowItem {
  transactionId: string
  date: string
  description: string
  accountCode: string
  contraAccountCode: string
  /** Positif = penerimaan kas, negatif = pengeluaran kas. */
  amount: number
  activity: CashFlowActivity
}

export type CashFlowActivity = 'OPERATING' | 'INVESTING' | 'FINANCING' | 'EXCLUDED'

export interface CashFlow {
  operating: number
  investing: number
  financing: number
  netChange: number
  openingBalance: number
  closingBalance: number
  inflows: CashFlowItem[]
  outflows: CashFlowItem[]
}

export interface GeneralLedgerRow {
  id: string
  sequenceNum: number
  transactionId: string
  transactionDate: string
  description: string
  accountId: string
  accountCode: string
  accountName: string
  entryType: EntryType
  amount: number
  runningBalance: number
  status: Transaction['status']
}

export interface GeneralLedgerFilter {
  accountId?: string
  from?: string
  to?: string
  entryType?: EntryType
}

export interface DashboardSummary {
  totalCash: number
  assetBalances: ReportLine[]
  monthIncome: number
  monthExpense: number
  transactionCount: number
  month: string
}

/** Kode akun kas/bank yang dipantau laporan arus kas (spec 7.3). */
export const CASH_CODES = ['10100', '10200', '10300'] as const

const dateOf = (iso: string): string => iso.slice(0, 10)

function codeNum(code: string): number {
  const n = Number(code)
  return Number.isFinite(n) ? n : -1
}

function inRange(code: string, lo: number, hi: number): boolean {
  const n = codeNum(code)
  return n >= lo && n <= hi
}

interface Ctx {
  accounts: Map<string, Account>
  transactions: Map<string, Transaction>
  entries: LedgerEntry[]
}

/**
 * Baris ledger yang boleh diagregasi laporan: transaksi VOID dikecualikan
 * (spec bagian 7), berikut transaksi pembaliknya — agar net efek koreksi
 * benar-benar nol seperti contoh spec bagian 5.2.
 */
function loadContext(): Ctx {
  const accounts = new Map<string, Account>()
  for (const a of getAccounts()) accounts.set(a.id, a)

  const allTx = getTransactions()
  const voided = new Set(allTx.filter((t) => t.status === 'VOID').map((t) => t.id))
  const excluded = new Set<string>(voided)
  for (const t of allTx) {
    if (t.reversesTransactionId !== null && voided.has(t.reversesTransactionId)) {
      excluded.add(t.id)
    }
  }

  const transactions = new Map<string, Transaction>()
  for (const t of allTx) {
    if (!excluded.has(t.id) && t.status === 'POSTED') transactions.set(t.id, t)
  }

  const entries = getLedgerEntries()
    .filter((e) => transactions.has(e.transactionId))
    .sort((a, b) => a.sequenceNum - b.sequenceNum)

  return { accounts, transactions, entries }
}

interface WalkRow {
  entry: LedgerEntry
  account: Account
  transaction: Transaction
}

function rows(ctx: Ctx): WalkRow[] {
  const out: WalkRow[] = []
  for (const entry of ctx.entries) {
    const account = ctx.accounts.get(entry.accountId)
    const transaction = ctx.transactions.get(entry.transactionId)
    if (account && transaction) out.push({ entry, account, transaction })
  }
  return out
}

function withinRange(date: string, range: DateRange): boolean {
  const d = dateOf(date)
  return d >= dateOf(range.from) && d <= dateOf(range.to)
}

function pushLine(map: Map<string, ReportLine>, account: Account, amount: number): void {
  const prev = map.get(account.code)
  if (prev) prev.amount += amount
  else map.set(account.code, { code: account.code, name: account.name, amount })
}

function sortedLines(map: Map<string, ReportLine>): ReportLine[] {
  return [...map.values()]
    .filter((l) => l.amount !== 0)
    .sort((a, b) => a.code.localeCompare(b.code))
}

/** FR-022 — Laba Rugi Multi-Step. */
export function profitAndLoss(range: DateRange): ProfitAndLoss {
  const ctx = loadContext()
  const lines = new Map<string, ReportLine>()

  let revenueOperating = 0
  let revenueNonOperating = 0
  let cogs = 0
  let opex = 0

  for (const { entry, account, transaction } of rows(ctx)) {
    if (!withinRange(transaction.transactionDate, range)) continue
    const code = account.code
    const debit = entry.entryType === 'DEBIT' ? entry.amount : 0
    const credit = entry.entryType === 'CREDIT' ? entry.amount : 0

    if (inRange(code, 40100, 40199)) {
      revenueOperating += credit
      pushLine(lines, account, credit)
    } else if (inRange(code, 40200, 49999)) {
      revenueNonOperating += credit
      pushLine(lines, account, credit)
    } else if (inRange(code, 50000, 59999)) {
      cogs += debit
      pushLine(lines, account, debit)
    } else if (inRange(code, 60000, 69999)) {
      opex += debit
      pushLine(lines, account, debit)
    }
  }

  const grossProfit = revenueOperating - cogs
  const operatingProfit = grossProfit - opex
  const netProfit = operatingProfit + revenueNonOperating

  return {
    revenueOperating,
    cogs,
    grossProfit,
    opex,
    operatingProfit,
    revenueNonOperating,
    netProfit,
    lines: sortedLines(lines),
  }
}

/** FR-023 — Neraca per tanggal tertentu. */
export function balanceSheet(asOf: string): BalanceSheet {
  const ctx = loadContext()
  const cutoff = dateOf(asOf)

  const assetLines = new Map<string, ReportLine>()
  const liabilityLines = new Map<string, ReportLine>()
  const equityLines = new Map<string, ReportLine>()

  let assets = 0
  let liabilities = 0
  let equityPosted = 0
  let revenue = 0
  let expense = 0

  for (const { entry, account, transaction } of rows(ctx)) {
    if (dateOf(transaction.transactionDate) > cutoff) continue
    const debit = entry.entryType === 'DEBIT' ? entry.amount : 0
    const credit = entry.entryType === 'CREDIT' ? entry.amount : 0
    const code = account.code

    if (inRange(code, 10000, 19999)) {
      const saldo = debit - credit
      assets += saldo
      pushLine(assetLines, account, saldo)
    } else if (inRange(code, 20000, 29999)) {
      const saldo = credit - debit
      liabilities += saldo
      pushLine(liabilityLines, account, saldo)
    } else if (inRange(code, 30000, 39999)) {
      const saldo = credit - debit
      equityPosted += saldo
      pushLine(equityLines, account, saldo)
    } else if (inRange(code, 40000, 49999)) {
      revenue += credit - debit
    } else if (inRange(code, 50000, 69999)) {
      expense += debit - credit
    }
  }

  // Laba berjalan belum ditutup ke 30200, jadi ditambahkan ke ekuitas.
  const retainedEarnings = revenue - expense
  if (retainedEarnings !== 0) {
    equityLines.set('39999', {
      code: '39999',
      name: 'Laba (Rugi) Berjalan',
      amount: retainedEarnings,
    })
  }
  const equity = equityPosted + retainedEarnings
  const difference = assets - (liabilities + equity)

  return {
    assets,
    liabilities,
    equity,
    retainedEarnings,
    isBalanced: difference === 0,
    difference,
    assetLines: sortedLines(assetLines),
    liabilityLines: sortedLines(liabilityLines),
    equityLines: sortedLines(equityLines),
  }
}

function classifyContra(contraCode: string): CashFlowActivity {
  if (inRange(contraCode, 10100, 10399)) return 'EXCLUDED' // transfer antar kas
  if (inRange(contraCode, 40000, 49999)) return 'OPERATING'
  if (inRange(contraCode, 50000, 69999)) return 'OPERATING'
  if (inRange(contraCode, 20000, 29999)) return 'FINANCING'
  if (inRange(contraCode, 30000, 39999)) return 'FINANCING'
  // Aktiva non-kas (mis. piutang / aktiva tetap) diperlakukan investasi.
  if (inRange(contraCode, 10400, 19999)) return 'INVESTING'
  return 'EXCLUDED'
}

/** FR-024 — Arus Kas metode langsung. */
export function cashFlow(range: DateRange): CashFlow {
  const ctx = loadContext()
  const all = rows(ctx)
  const cashCodes = new Set<string>(CASH_CODES)

  // Peta akun lawan per transaksi untuk klasifikasi aktivitas.
  const byTx = new Map<string, WalkRow[]>()
  for (const r of all) {
    const bucket = byTx.get(r.entry.transactionId)
    if (bucket) bucket.push(r)
    else byTx.set(r.entry.transactionId, [r])
  }

  let openingBalance = 0
  let operating = 0
  let investing = 0
  let financing = 0
  const inflows: CashFlowItem[] = []
  const outflows: CashFlowItem[] = []

  for (const r of all) {
    if (!cashCodes.has(r.account.code)) continue
    const signed = r.entry.entryType === 'DEBIT' ? r.entry.amount : -r.entry.amount
    const d = dateOf(r.transaction.transactionDate)

    if (d < dateOf(range.from)) {
      openingBalance += signed
      continue
    }
    if (d > dateOf(range.to)) continue

    const siblings = byTx.get(r.entry.transactionId) ?? []
    const contra = siblings.find((s) => s.entry.id !== r.entry.id)
    const contraCode = contra ? contra.account.code : ''
    const activity = classifyContra(contraCode)

    const item: CashFlowItem = {
      transactionId: r.transaction.id,
      date: d,
      description: r.transaction.description,
      accountCode: r.account.code,
      contraAccountCode: contraCode,
      amount: signed,
      activity,
    }
    if (signed >= 0) inflows.push(item)
    else outflows.push(item)

    if (activity === 'OPERATING') operating += signed
    else if (activity === 'INVESTING') investing += signed
    else if (activity === 'FINANCING') financing += signed
  }

  const netChange = operating + investing + financing
  return {
    operating,
    investing,
    financing,
    netChange,
    openingBalance,
    closingBalance: openingBalance + netChange,
    inflows,
    outflows,
  }
}

/** FR-021 — Buku Besar, terurut sequenceNum. Termasuk baris transaksi VOID. */
export function generalLedger(filter: GeneralLedgerFilter = {}): GeneralLedgerRow[] {
  const accounts = new Map<string, Account>()
  for (const a of getAccounts()) accounts.set(a.id, a)
  const transactions = new Map<string, Transaction>()
  for (const t of getTransactions()) transactions.set(t.id, t)

  const out: GeneralLedgerRow[] = []
  for (const e of [...getLedgerEntries()].sort((a, b) => a.sequenceNum - b.sequenceNum)) {
    const acc = accounts.get(e.accountId)
    const tx = transactions.get(e.transactionId)
    if (!acc || !tx) continue
    if (filter.accountId && e.accountId !== filter.accountId) continue
    if (filter.entryType && e.entryType !== filter.entryType) continue
    const d = dateOf(tx.transactionDate)
    if (filter.from && d < dateOf(filter.from)) continue
    if (filter.to && d > dateOf(filter.to)) continue

    out.push({
      id: e.id,
      sequenceNum: e.sequenceNum,
      transactionId: e.transactionId,
      transactionDate: tx.transactionDate,
      description: tx.description,
      accountId: e.accountId,
      accountCode: acc.code,
      accountName: acc.name,
      entryType: e.entryType,
      amount: e.amount,
      runningBalance: e.runningBalance,
      status: tx.status,
    })
  }
  return out
}

/** FR-020 — ringkasan dashboard untuk bulan berjalan. */
export function dashboardSummary(now: Date = new Date()): DashboardSummary {
  const ctx = loadContext()
  const today = toISODate(now)
  const currentMonth = monthKey(today)
  const sheet = balanceSheet(today)

  const cashCodes = new Set<string>(CASH_CODES)
  const totalCash = sheet.assetLines
    .filter((l) => cashCodes.has(l.code))
    .reduce((sum, l) => sum + l.amount, 0)

  let monthIncome = 0
  let monthExpense = 0
  for (const { entry, account, transaction } of rows(ctx)) {
    if (monthKey(dateOf(transaction.transactionDate)) !== currentMonth) continue
    if (inRange(account.code, 40000, 49999) && entry.entryType === 'CREDIT') {
      monthIncome += entry.amount
    } else if (inRange(account.code, 50000, 69999) && entry.entryType === 'DEBIT') {
      monthExpense += entry.amount
    }
  }

  return {
    totalCash,
    assetBalances: sheet.assetLines,
    monthIncome,
    monthExpense,
    transactionCount: ctx.transactions.size,
    month: currentMonth,
  }
}

// ---------------------------------------------------------------------------
// Neraca Saldo (Trial Balance)
// ---------------------------------------------------------------------------

export interface TrialBalanceLine {
  accountId: string
  code: string
  name: string
  type: Account['type']
  /** Akumulasi sisi debit akun ini. */
  debit: number
  /** Akumulasi sisi kredit akun ini. */
  credit: number
}

export interface TrialBalance {
  lines: TrialBalanceLine[]
  totalDebit: number
  totalCredit: number
  /** `totalDebit - totalCredit`; wajib nol pada buku besar yang sehat. */
  difference: number
  isBalanced: boolean
  /** Jumlah baris ledger yang diikutsertakan dalam penjumlahan. */
  entryCount: number
}

/**
 * Menyusun neraca saldo langsung dari baris ledger, bukan dari `currentBalance`
 * yang tersimpan pada akun.
 *
 * Perbedaan ini yang membuat laporan berfungsi sebagai alat pembuktian: saldo
 * tersimpan adalah nilai turunan yang dapat menyimpang bila penyimpanan
 * disunting dari luar aplikasi, sedangkan penjumlahan ulang atas seluruh baris
 * ledger hanya akan seimbang apabila setiap transaksi memang diposting
 * berpasangan. Karena itu `totalDebit` dan `totalCredit` di sini merupakan
 * pemeriksaan independen terhadap invarian yang ditegakkan `assertBalanced`
 * pada saat penulisan.
 *
 * Baris transaksi berstatus VOID tetap dihitung: buku besar bersifat
 * append-only, pembatalan diwujudkan sebagai jurnal pembalik, dan kedua sisi
 * tersebut sama-sama merupakan fakta historis yang harus tetap seimbang.
 */
export function trialBalance(asOf?: string): TrialBalance {
  const accounts = new Map<string, Account>()
  for (const a of getAccounts()) accounts.set(a.id, a)
  const transactions = new Map<string, Transaction>()
  for (const t of getTransactions()) transactions.set(t.id, t)

  const limit = asOf ? dateOf(asOf) : null
  const acc = new Map<string, TrialBalanceLine>()
  let totalDebit = 0
  let totalCredit = 0
  let entryCount = 0

  for (const e of [...getLedgerEntries()].sort((a, b) => a.sequenceNum - b.sequenceNum)) {
    const account = accounts.get(e.accountId)
    const tx = transactions.get(e.transactionId)
    if (!account || !tx) continue
    if (limit && dateOf(tx.transactionDate) > limit) continue

    let line = acc.get(e.accountId)
    if (!line) {
      line = {
        accountId: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        debit: 0,
        credit: 0,
      }
      acc.set(e.accountId, line)
    }

    if (e.entryType === 'DEBIT') {
      line.debit += e.amount
      totalDebit += e.amount
    } else {
      line.credit += e.amount
      totalCredit += e.amount
    }
    entryCount += 1
  }

  const lines = [...acc.values()].sort((a, b) => a.code.localeCompare(b.code))
  const difference = totalDebit - totalCredit

  return {
    lines,
    totalDebit,
    totalCredit,
    difference,
    isBalanced: difference === 0,
    entryCount,
  }
}
