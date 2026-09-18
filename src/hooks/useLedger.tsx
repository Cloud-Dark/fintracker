import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { bootstrap, getAccounts, getCategories, getTransactions } from '@/repositories/db'
import {
  postTransaction,
  reverseTransaction,
  type PostResult,
  type PostTransactionInput,
} from '@/domain/kernel'
import { dashboardSummary, type DashboardSummary } from '@/domain/reporting'
import { sentinelSummary, type SentinelSummary } from '@/domain/sentinel'
import { useToast } from '@/hooks/useToast'
import type { Account, Category, Transaction } from '@/types'

export type LedgerContextValue = {
  ready: boolean
  accounts: ReadonlyArray<Account>
  categories: ReadonlyArray<Category>
  transactions: ReadonlyArray<Transaction>
  summary: DashboardSummary | null
  sentinel: SentinelSummary | null
  refresh: () => void
  post: (input: PostTransactionInput) => Promise<PostResult | null>
  reverse: (id: string) => Promise<PostResult | null>
}

const LedgerContext = createContext<LedgerContextValue | null>(null)

/** Pesan error domain (ValidationError/LedgerImbalanceError/ImmutableLedgerError) dipakai apa adanya. */
function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Terjadi kesalahan tak terduga saat menulis buku besar.'
}

export function LedgerProvider({ children }: { children: ReactNode }) {
  const { push } = useToast()
  const [ready, setReady] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [sentinel, setSentinel] = useState<SentinelSummary | null>(null)

  const refresh = useCallback(() => {
    setAccounts(getAccounts())
    setCategories(getCategories())
    setTransactions(getTransactions())
    setSummary(dashboardSummary())
    setSentinel(sentinelSummary())
  }, [])

  // Seed idempoten dijalankan sekali saat mount.
  useEffect(() => {
    try {
      bootstrap()
      setAccounts(getAccounts())
      setCategories(getCategories())
      setTransactions(getTransactions())
      setSummary(dashboardSummary())
      setSentinel(sentinelSummary())
    } catch (error) {
      push({
        title: 'Gagal menyiapkan buku besar',
        description: errorMessage(error),
        variant: 'error',
      })
    } finally {
      setReady(true)
    }
  }, [push])

  const post = useCallback(
    async (input: PostTransactionInput): Promise<PostResult | null> => {
      try {
        const result = await postTransaction(input)
        refresh()
        push({
          title: 'Transaksi tercatat',
          description: `Jurnal ${result.entries.length} baris berhasil diposting ke buku besar.`,
          variant: 'success',
        })
        return result
      } catch (error) {
        push({ title: 'Transaksi ditolak', description: errorMessage(error), variant: 'error' })
        return null
      }
    },
    [push, refresh]
  )

  const reverse = useCallback(
    async (id: string): Promise<PostResult | null> => {
      try {
        const result = await reverseTransaction(id)
        refresh()
        push({
          title: 'Jurnal pembalik diterbitkan',
          description: 'Transaksi asal ditandai VOID; baris ledger asal tetap utuh.',
          variant: 'success',
        })
        return result
      } catch (error) {
        push({ title: 'Pembalikan ditolak', description: errorMessage(error), variant: 'error' })
        return null
      }
    },
    [push, refresh]
  )

  const value = useMemo<LedgerContextValue>(
    () => ({
      ready,
      accounts,
      categories,
      transactions,
      summary,
      sentinel,
      refresh,
      post,
      reverse,
    }),
    [ready, accounts, categories, transactions, summary, sentinel, refresh, post, reverse]
  )

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>
}

export function useLedger(): LedgerContextValue {
  const context = useContext(LedgerContext)
  if (!context) throw new Error('useLedger harus dipakai di dalam <LedgerProvider>.')
  return context
}
