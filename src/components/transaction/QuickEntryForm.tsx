import { useId, useMemo, useState, type FormEvent } from 'react'
import { useLedger } from '@/hooks/useLedger'
import { detectDuplicateOutflow } from '@/domain/sentinel'
import { formatIDR, parseIDR } from '@/lib/money'
import { formatDateID, toISODate } from '@/lib/date'
import type { Account, MutationType, Transaction } from '@/types'

export type QuickEntryFormProps = {
  /** Dipanggil setelah transaksi berhasil diposting. */
  onPosted?: () => void
  onCancel?: () => void
}

type MutationOption = {
  value: MutationType
  label: string
  /** Penjelasan singkat arah arus dana. */
  hint: string
}

const MUTATIONS: ReadonlyArray<MutationOption> = [
  { value: 'INCOME', label: 'Pemasukan', hint: 'Dana masuk ke akun kas/bank tujuan.' },
  { value: 'EXPENSE', label: 'Pengeluaran', hint: 'Dana keluar dari akun kas/bank sumber.' },
  { value: 'TRANSFER', label: 'Transfer', hint: 'Pemindahan dana antar akun kas/bank sendiri.' },
  { value: 'DEBT_PAYMENT', label: 'Bayar Utang', hint: 'Pelunasan Utang Usaha dari akun kas/bank.' },
]

/** Ambang bukti bayar (FR-032). */
const GHOST_THRESHOLD = 1_000_000
const PAYABLE_CODE = '20100'
/** Akun kas/bank yang boleh menjadi sumber/tujuan mutasi. */
const CASH_CODES = new Set(['10100', '10200', '10300'])

type FieldErrors = Partial<Record<'amount' | 'sourceAccountId' | 'destinationAccountId' | 'categoryId' | 'transactionDate', string>>

/** Format ribuan saat mengetik; nilai tersimpan tetap integer. */
function groupDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  if (digits === '') return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function needsSource(type: MutationType): boolean {
  return type === 'EXPENSE' || type === 'TRANSFER' || type === 'DEBT_PAYMENT'
}

function needsDestination(type: MutationType): boolean {
  return type === 'INCOME' || type === 'TRANSFER'
}

function needsCategory(type: MutationType): boolean {
  return type === 'INCOME' || type === 'EXPENSE'
}

export default function QuickEntryForm({ onPosted, onCancel }: QuickEntryFormProps) {
  const { accounts, categories, post } = useLedger()
  const uid = useId()

  const [mutationType, setMutationType] = useState<MutationType>('EXPENSE')
  const [amountText, setAmountText] = useState('')
  const [sourceAccountId, setSourceAccountId] = useState('')
  const [destinationAccountId, setDestinationAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [transactionDate, setTransactionDate] = useState(() => toISODate(new Date()))
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [duplicates, setDuplicates] = useState<ReadonlyArray<Transaction>>([])
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const amount = parseIDR(amountText)
  const hasAmount = Number.isSafeInteger(amount) && amount > 0

  const cashAccounts = useMemo<ReadonlyArray<Account>>(
    () => accounts.filter((a) => a.isActive && CASH_CODES.has(a.code)),
    [accounts],
  )

  const accountByCode = useMemo(() => {
    const map = new Map<string, Account>()
    for (const a of accounts) map.set(a.code, a)
    return map
  }, [accounts])

  const visibleCategories = useMemo(() => {
    if (!needsCategory(mutationType)) return []
    const wanted = mutationType === 'INCOME' ? 'INCOME' : 'EXPENSE'
    return categories.filter((c) => c.isActive && c.type === wanted)
  }, [categories, mutationType])

  const showGhostNotice = mutationType === 'EXPENSE' && hasAmount && amount > GHOST_THRESHOLD

  function resetWarnings() {
    setDuplicates([])
    setDuplicateAcknowledged(false)
  }

  function handleMutationChange(next: MutationType) {
    setMutationType(next)
    setCategoryId('')
    setErrors({})
    resetWarnings()
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {}
    if (!hasAmount) next.amount = 'Nominal wajib diisi berupa bilangan bulat rupiah lebih besar dari nol.'
    if (!transactionDate || Number.isNaN(Date.parse(transactionDate))) {
      next.transactionDate = 'Tanggal transaksi tidak valid.'
    }
    if (needsSource(mutationType) && sourceAccountId === '') {
      next.sourceAccountId = 'Pilih akun kas/bank sumber.'
    }
    if (needsDestination(mutationType) && destinationAccountId === '') {
      next.destinationAccountId = 'Pilih akun kas/bank tujuan.'
    }
    if (mutationType === 'TRANSFER' && sourceAccountId !== '' && sourceAccountId === destinationAccountId) {
      next.destinationAccountId = 'Akun sumber dan tujuan transfer tidak boleh sama.'
    }
    if (needsCategory(mutationType) && categoryId === '') {
      next.categoryId = 'Pilih kategori transaksi.'
    }
    return next
  }

  /** Akun lawan hasil resolusi kategori (pendapatan/beban) atau Utang Usaha. */
  function resolveCategoryAccountId(): string | null {
    if (mutationType === 'DEBT_PAYMENT') {
      return accountByCode.get(PAYABLE_CODE)?.id ?? null
    }
    if (!needsCategory(mutationType)) return null
    const category = categories.find((c) => c.id === categoryId)
    if (!category) return null
    return accountByCode.get(category.defaultAccountCode)?.id ?? null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    // FR-031: peringatan duplikat non-blocking — pengguna melanjutkan secara sadar.
    if (mutationType === 'EXPENSE' && !duplicateAcknowledged) {
      const matches = detectDuplicateOutflow({
        amount,
        description,
        transactionDate,
      })
      if (matches.length > 0) {
        setDuplicates(matches)
        return
      }
    }

    setSubmitting(true)
    const result = await post({
      mutationType,
      amount,
      transactionDate,
      description: description.trim(),
      categoryId: needsCategory(mutationType) ? categoryId : null,
      sourceAccountId: needsSource(mutationType) ? sourceAccountId : null,
      destinationAccountId: needsDestination(mutationType) ? destinationAccountId : null,
      categoryAccountId: resolveCategoryAccountId(),
    })
    setSubmitting(false)

    if (result) {
      setAmountText('')
      setDescription('')
      setCategoryId('')
      resetWarnings()
      setErrors({})
      onPosted?.()
    }
  }

  const activeMutation = MUTATIONS.find((m) => m.value === mutationType) as MutationOption
  const amountId = `${uid}-amount`
  const dateId = `${uid}-date`
  const sourceId = `${uid}-source`
  const destinationId = `${uid}-destination`
  const categorySelectId = `${uid}-category`
  const descriptionId = `${uid}-description`

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Pemilih tipe mutasi: segmented kotak siku, bukan pill. */}
      <fieldset>
        <legend className="kicker mb-3">Tipe Mutasi</legend>
        <div className="grid grid-cols-2 border-l border-t border-border sm:grid-cols-4">
          {MUTATIONS.map((option) => {
            const active = option.value === mutationType
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleMutationChange(option.value)}
                aria-pressed={active}
                className={[
                  'min-h-[44px] border-b border-r border-border px-3 py-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] transition-colors duration-200 ease-editorial',
                  active ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground hover:bg-muted',
                ].join(' ')}
              >
                {option.label}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{activeMutation.hint}</p>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Nominal */}
        <div>
          <label htmlFor={amountId} className="kicker mb-2 block">
            Nominal (Rp)
          </label>
          <input
            id={amountId}
            name="amount"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            value={amountText}
            onChange={(e) => {
              setAmountText(groupDigits(e.target.value))
              resetWarnings()
            }}
            aria-invalid={errors.amount ? true : undefined}
            aria-describedby={errors.amount ? `${amountId}-error` : undefined}
            className="field num min-h-[44px] text-right font-mono text-base"
          />
          {errors.amount && (
            <p id={`${amountId}-error`} role="alert" className="mt-2 text-xs text-negative">
              {errors.amount}
            </p>
          )}
        </div>

        {/* Tanggal */}
        <div>
          <label htmlFor={dateId} className="kicker mb-2 block">
            Tanggal
          </label>
          <input
            id={dateId}
            name="transactionDate"
            type="date"
            value={transactionDate}
            onChange={(e) => {
              setTransactionDate(e.target.value)
              resetWarnings()
            }}
            aria-invalid={errors.transactionDate ? true : undefined}
            aria-describedby={errors.transactionDate ? `${dateId}-error` : undefined}
            className="field num min-h-[44px]"
          />
          {errors.transactionDate && (
            <p id={`${dateId}-error`} role="alert" className="mt-2 text-xs text-negative">
              {errors.transactionDate}
            </p>
          )}
        </div>

        {needsSource(mutationType) && (
          <div>
            <label htmlFor={sourceId} className="kicker mb-2 block">
              Akun Sumber
            </label>
            <select
              id={sourceId}
              name="sourceAccountId"
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              aria-invalid={errors.sourceAccountId ? true : undefined}
              aria-describedby={errors.sourceAccountId ? `${sourceId}-error` : undefined}
              className="field min-h-[44px]"
            >
              <option value="">— Pilih akun —</option>
              {cashAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} · {a.name}
                </option>
              ))}
            </select>
            {errors.sourceAccountId && (
              <p id={`${sourceId}-error`} role="alert" className="mt-2 text-xs text-negative">
                {errors.sourceAccountId}
              </p>
            )}
          </div>
        )}

        {needsDestination(mutationType) && (
          <div>
            <label htmlFor={destinationId} className="kicker mb-2 block">
              Akun Tujuan
            </label>
            <select
              id={destinationId}
              name="destinationAccountId"
              value={destinationAccountId}
              onChange={(e) => setDestinationAccountId(e.target.value)}
              aria-invalid={errors.destinationAccountId ? true : undefined}
              aria-describedby={errors.destinationAccountId ? `${destinationId}-error` : undefined}
              className="field min-h-[44px]"
            >
              <option value="">— Pilih akun —</option>
              {cashAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} · {a.name}
                </option>
              ))}
            </select>
            {errors.destinationAccountId && (
              <p id={`${destinationId}-error`} role="alert" className="mt-2 text-xs text-negative">
                {errors.destinationAccountId}
              </p>
            )}
          </div>
        )}

        {needsCategory(mutationType) && (
          <div className="sm:col-span-2">
            <label htmlFor={categorySelectId} className="kicker mb-2 block">
              Kategori
            </label>
            <select
              id={categorySelectId}
              name="categoryId"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              aria-invalid={errors.categoryId ? true : undefined}
              aria-describedby={errors.categoryId ? `${categorySelectId}-error` : undefined}
              className="field min-h-[44px]"
            >
              <option value="">— Pilih kategori —</option>
              {visibleCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <p id={`${categorySelectId}-error`} role="alert" className="mt-2 text-xs text-negative">
                {errors.categoryId}
              </p>
            )}
          </div>
        )}

        <div className="sm:col-span-2">
          <label htmlFor={descriptionId} className="kicker mb-2 block">
            Deskripsi (opsional)
          </label>
          <input
            id={descriptionId}
            name="description"
            type="text"
            autoComplete="off"
            placeholder="Contoh: Pembayaran server bulan berjalan"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              resetWarnings()
            }}
            className="field min-h-[44px]"
          />
        </div>
      </div>

      {/* FR-032 — catatan bukti bayar untuk pengeluaran besar. */}
      {showGhostNotice && (
        <div className="border-[1.5px] border-warning bg-warning/10 p-4">
          <p className="kicker mb-1 text-warning">
            <span aria-hidden="true">!</span> Bukti Bayar Diperlukan
          </p>
          <p className="text-xs leading-relaxed text-foreground">
            Pengeluaran {formatIDR(amount)} melampaui ambang {formatIDR(GHOST_THRESHOLD)}. Tanpa lampiran bukti bayar,
            transaksi ini akan tercatat berstatus <span className="font-mono uppercase">Unverified</span> dan muncul
            pada daftar Ghost Expense di panel sentinel.
          </p>
        </div>
      )}

      {/* FR-031 — peringatan duplikat, tetap bisa dilanjutkan secara sadar. */}
      {duplicates.length > 0 && (
        <div className="border-[1.5px] border-warning bg-warning/10 p-4" role="alert">
          <p className="kicker mb-2 text-warning">
            <span aria-hidden="true">!</span> Dugaan Pengeluaran Duplikat
          </p>
          <p className="text-xs leading-relaxed text-foreground">
            Ditemukan {duplicates.length} pengeluaran dengan nominal dan deskripsi identik dalam 48 jam terakhir:
          </p>
          <ul className="mt-3 space-y-1 border-t border-border pt-3">
            {duplicates.map((tx) => (
              <li key={tx.id} className="flex flex-wrap items-baseline justify-between gap-2 font-mono text-xs">
                <span className="num text-muted-foreground">{formatDateID(tx.transactionDate)}</span>
                <span className="min-w-0 flex-1 truncate text-foreground">{tx.description || '—'}</span>
                <span className="num text-negative">{formatIDR(tx.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-ghost min-h-[40px] border-warning text-warning"
              onClick={() => {
                setDuplicateAcknowledged(true)
                setDuplicates([])
              }}
            >
              Bukan duplikat, lanjutkan
            </button>
            <button type="button" className="btn-ghost min-h-[40px]" onClick={() => setDuplicates([])}>
              Periksa lagi
            </button>
          </div>
        </div>
      )}

      <div className="rule-line" />

      <div className="flex flex-wrap items-center justify-end gap-3">
        {onCancel && (
          <button type="button" className="btn-ghost min-h-[40px]" onClick={onCancel}>
            Batal
          </button>
        )}
        <button type="submit" className="btn-primary min-h-[40px]" disabled={submitting}>
          {submitting ? 'Memposting…' : 'Posting Jurnal'}
        </button>
      </div>
    </form>
  )
}
