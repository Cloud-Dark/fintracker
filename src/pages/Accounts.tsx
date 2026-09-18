import { useCallback, useEffect, useMemo, useState } from 'react'
import DataTable, { type Column } from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import SectionHeader from '@/components/ui/SectionHeader'
import {
  bootstrap,
  getAccounts,
  getCategories,
  getLedgerEntries,
  saveAccounts,
  saveCategories,
} from '@/repositories/db'
import { isDebitNormal } from '@/domain/kernel'
import { useToast } from '@/hooks/useToast'
import { uuidv7 } from '@/lib/uuid'
import { formatIDR } from '@/lib/money'
import type { Account, AccountType, Category, CategoryType } from '@/types'

const ACCOUNT_TYPES: ReadonlyArray<{ value: AccountType; label: string }> = [
  { value: 'ASSET', label: 'Aset' },
  { value: 'LIABILITY', label: 'Liabilitas' },
  { value: 'EQUITY', label: 'Ekuitas' },
  { value: 'REVENUE', label: 'Pendapatan' },
  { value: 'EXPENSE', label: 'Beban' },
]

const TYPE_LABEL: Record<AccountType, string> = {
  ASSET: 'Aset',
  LIABILITY: 'Liabilitas',
  EQUITY: 'Ekuitas',
  REVENUE: 'Pendapatan',
  EXPENSE: 'Beban',
}

export default function Accounts() {
  const { push } = useToast()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('EXPENSE')
  const [accountError, setAccountError] = useState<string | null>(null)

  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [categoryType, setCategoryType] = useState<CategoryType>('EXPENSE')
  const [categoryAccountCode, setCategoryAccountCode] = useState('')
  const [categoryError, setCategoryError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setAccounts(getAccounts())
    setCategories(getCategories())
  }, [])

  useEffect(() => {
    bootstrap()
    refresh()
  }, [refresh])

  // Akun yang sudah memiliki baris ledger tidak boleh dihapus (FR-010).
  const usedAccountIds = useMemo(() => {
    const used = new Set<string>()
    for (const entry of getLedgerEntries()) used.add(entry.accountId)
    return used
  }, [accounts])

  const grouped = useMemo(() => {
    return ACCOUNT_TYPES.map((item) => ({
      type: item.value,
      label: item.label,
      rows: accounts
        .filter((account) => account.type === item.value)
        .sort((a, b) => a.code.localeCompare(b.code)),
    })).filter((group) => group.rows.length > 0)
  }, [accounts])

  const toggleAccountActive = useCallback(
    (account: Account) => {
      const next = accounts.map((item) =>
        item.id === account.id
          ? { ...item, isActive: !item.isActive, updatedAt: new Date().toISOString() }
          : item,
      )
      saveAccounts(next)
      setAccounts(next)
      push({
        title: account.isActive ? 'Akun dinonaktifkan' : 'Akun diaktifkan kembali',
        description: `${account.code} — ${account.name}. Baris buku besar yang sudah ada tetap utuh.`,
        variant: 'success',
      })
    },
    [accounts, push],
  )

  const submitAccount = useCallback(() => {
    const trimmedCode = code.trim()
    const trimmedName = name.trim()

    if (!/^\d{4,6}$/.test(trimmedCode)) {
      setAccountError('Kode akun harus berupa 4–6 digit angka.')
      return
    }
    if (accounts.some((account) => account.code === trimmedCode)) {
      setAccountError(`Kode ${trimmedCode} sudah dipakai akun lain.`)
      return
    }
    if (trimmedName.length < 3) {
      setAccountError('Nama akun minimal 3 karakter.')
      return
    }

    const now = new Date().toISOString()
    const created: Account = {
      id: uuidv7(),
      code: trimmedCode,
      name: trimmedName,
      type,
      currency: 'IDR',
      currentBalance: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }
    try {
      const next = [...accounts, created]
      saveAccounts(next)
      setAccounts(next)
      setAccountModalOpen(false)
      setCode('')
      setName('')
      setAccountError(null)
      push({ title: 'Akun ditambahkan', description: `${created.code} — ${created.name}`, variant: 'success' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal menyimpan akun.'
      setAccountError(message)
      push({ title: 'Gagal menambah akun', description: message, variant: 'error' })
    }
  }, [accounts, code, name, type, push])

  const submitCategory = useCallback(() => {
    const trimmed = categoryName.trim()
    if (trimmed.length < 3) {
      setCategoryError('Nama kategori minimal 3 karakter.')
      return
    }
    if (categories.some((c) => c.type === categoryType && c.name.toLowerCase() === trimmed.toLowerCase())) {
      setCategoryError('Kategori dengan nama tersebut sudah ada pada tipe ini.')
      return
    }
    if (!categoryAccountCode) {
      setCategoryError('Pilih akun default untuk kategori ini.')
      return
    }

    const created: Category = {
      id: uuidv7(),
      name: trimmed,
      type: categoryType,
      parentId: null,
      defaultAccountCode: categoryAccountCode,
      isActive: true,
      updatedAt: new Date().toISOString(),
    }
    try {
      const next = [...categories, created]
      saveCategories(next)
      setCategories(next)
      setCategoryModalOpen(false)
      setCategoryName('')
      setCategoryError(null)
      push({ title: 'Kategori ditambahkan', description: created.name, variant: 'success' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal menyimpan kategori.'
      setCategoryError(message)
      push({ title: 'Gagal menambah kategori', description: message, variant: 'error' })
    }
  }, [categories, categoryName, categoryType, categoryAccountCode, push])

  const toggleCategoryActive = useCallback(
    (category: Category) => {
      const next = categories.map((item) =>
        item.id === category.id
          ? { ...item, isActive: !item.isActive, updatedAt: new Date().toISOString() }
          : item,
      )
      saveCategories(next)
      setCategories(next)
      push({
        title: category.isActive ? 'Kategori dinonaktifkan' : 'Kategori diaktifkan kembali',
        description: category.name,
        variant: 'success',
      })
    },
    [categories, push],
  )

  const columns: ReadonlyArray<Column<Account>> = useMemo(
    () => [
      {
        key: 'code',
        header: 'Kode',
        render: (row) => <span className="num font-mono text-xs">{row.code}</span>,
      },
      { key: 'name', header: 'Nama Akun' },
      { key: 'type', header: 'Tipe', render: (row) => TYPE_LABEL[row.type] },
      {
        key: 'normalBalance',
        header: 'Normal Balance',
        render: (row) => (
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">
            {isDebitNormal(row.type) ? 'Debet' : 'Kredit'}
          </span>
        ),
      },
      {
        key: 'currentBalance',
        header: 'Saldo',
        align: 'right',
        render: (row) => (
          <span className={row.currentBalance < 0 ? 'text-negative' : undefined}>
            {formatIDR(row.currentBalance)}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => (
          <Badge variant={row.isActive ? 'posted' : 'draft'}>{row.isActive ? 'Aktif' : 'Nonaktif'}</Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Aksi',
        align: 'right',
        render: (row) => (
          <button
            type="button"
            className="btn-ghost min-h-[40px]"
            onClick={() => toggleAccountActive(row)}
            aria-label={`${row.isActive ? 'Nonaktifkan' : 'Aktifkan'} akun ${row.code} ${row.name}`}
            title={
              usedAccountIds.has(row.id)
                ? 'Akun memiliki baris buku besar — hanya dapat dinonaktifkan, tidak dapat dihapus.'
                : undefined
            }
          >
            {row.isActive ? 'Nonaktifkan' : 'Aktifkan'}
          </button>
        ),
      },
    ],
    [toggleAccountActive, usedAccountIds],
  )

  const incomeCategories = categories.filter((c) => c.type === 'INCOME')
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE')

  const renderCategoryList = (list: ReadonlyArray<Category>, heading: string, headingId: string) => (
    <div className="border-b border-r border-border p-5">
      <h3 id={headingId} className="font-display text-lg font-black tracking-[-0.005em] md:text-xl">
        {heading}
      </h3>
      <div className="mt-4">
        {list.length === 0 ? (
          <p className="text-xs text-muted-foreground">Belum ada kategori pada kelompok ini.</p>
        ) : (
          <ul aria-labelledby={headingId} className="flex flex-col">
            {list.map((category) => (
              <li
                key={category.id}
                className="flex items-center justify-between gap-3 border-t border-rule/30 py-3"
              >
                <span className="min-w-0">
                  <span className="block text-sm">{category.name}</span>
                  <span className="num font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">
                    Akun {category.defaultAccountCode}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <Badge variant={category.isActive ? 'posted' : 'draft'}>
                    {category.isActive ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                  <button
                    type="button"
                    className="btn-ghost min-h-[40px]"
                    onClick={() => toggleCategoryActive(category)}
                    aria-label={`${category.isActive ? 'Nonaktifkan' : 'Aktifkan'} kategori ${category.name}`}
                  >
                    {category.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )

  return (
    <section>
      <SectionHeader
        kicker="Master Data — Akun & Kategori"
        title="Bagan Akun"
        description="Chart of Accounts dan kategori transaksi. Akun yang sudah dipakai pada buku besar hanya dapat dinonaktifkan, tidak dihapus."
        action={
          <button type="button" className="btn-primary min-h-[40px]" onClick={() => setAccountModalOpen(true)}>
            Tambah Akun
          </button>
        }
      />

      <div className="flex flex-col gap-10">
        {grouped.map((group) => (
          <div key={group.type}>
            <SectionHeader kicker={`Kelompok — ${group.label}`} title={group.label} />
            <DataTable
              columns={columns}
              rows={group.rows}
              getRowKey={(row) => row.id}
              caption={`Akun kelompok ${group.label} — ${group.rows.length} akun`}
            />
          </div>
        ))}
      </div>

      <div className="mt-14">
        <SectionHeader
          kicker="Master Data — Kategori"
          title="Kategori Transaksi"
          description="Kategori memetakan transaksi ke akun pendapatan atau beban default saat posting."
          action={
            <button type="button" className="btn-primary min-h-[40px]" onClick={() => setCategoryModalOpen(true)}>
              Tambah Kategori
            </button>
          }
        />
        <div className="grid grid-cols-1 border-l border-t border-border lg:grid-cols-2">
          {renderCategoryList(incomeCategories, 'Pemasukan', 'kategori-income')}
          {renderCategoryList(expenseCategories, 'Pengeluaran', 'kategori-expense')}
        </div>
      </div>

      <Modal
        open={accountModalOpen}
        onClose={() => {
          setAccountModalOpen(false)
          setAccountError(null)
        }}
        kicker="Tambah Akun Baru"
        title="Akun Buku Besar"
        description="Kode akun mengikuti rentang Chart of Accounts dan harus unik."
        actions={
          <>
            <button
              type="button"
              className="btn-ghost min-h-[40px]"
              onClick={() => {
                setAccountModalOpen(false)
                setAccountError(null)
              }}
            >
              Batal
            </button>
            <button type="button" className="btn-signal min-h-[40px]" onClick={submitAccount}>
              Simpan Akun
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="acc-code" className="kicker mb-2 block">
              Kode Akun
            </label>
            <input
              id="acc-code"
              className="field num font-mono"
              value={code}
              inputMode="numeric"
              aria-invalid={accountError !== null}
              aria-describedby={accountError ? 'acc-error' : undefined}
              onChange={(event) => {
                setCode(event.target.value)
                setAccountError(null)
              }}
              placeholder="60400"
            />
          </div>
          <div>
            <label htmlFor="acc-name" className="kicker mb-2 block">
              Nama Akun
            </label>
            <input
              id="acc-name"
              className="field"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setAccountError(null)
              }}
              placeholder="Beban Perjalanan Dinas"
            />
          </div>
          <div>
            <label htmlFor="acc-type" className="kicker mb-2 block">
              Tipe Akun
            </label>
            <select
              id="acc-type"
              className="field"
              value={type}
              onChange={(event) => setType(event.target.value as AccountType)}
            >
              {ACCOUNT_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          {accountError && (
            <p id="acc-error" role="alert" className="border-[1.5px] border-negative p-3 text-xs text-negative">
              {accountError}
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={categoryModalOpen}
        onClose={() => {
          setCategoryModalOpen(false)
          setCategoryError(null)
        }}
        kicker="Tambah Kategori"
        title="Kategori Transaksi"
        description="Kategori menentukan akun default yang dipakai saat transaksi diposting."
        actions={
          <>
            <button
              type="button"
              className="btn-ghost min-h-[40px]"
              onClick={() => {
                setCategoryModalOpen(false)
                setCategoryError(null)
              }}
            >
              Batal
            </button>
            <button type="button" className="btn-signal min-h-[40px]" onClick={submitCategory}>
              Simpan Kategori
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="cat-name" className="kicker mb-2 block">
              Nama Kategori
            </label>
            <input
              id="cat-name"
              className="field"
              value={categoryName}
              aria-invalid={categoryError !== null}
              aria-describedby={categoryError ? 'cat-error' : undefined}
              onChange={(event) => {
                setCategoryName(event.target.value)
                setCategoryError(null)
              }}
              placeholder="Perjalanan Dinas"
            />
          </div>
          <div>
            <label htmlFor="cat-type" className="kicker mb-2 block">
              Tipe Kategori
            </label>
            <select
              id="cat-type"
              className="field"
              value={categoryType}
              onChange={(event) => setCategoryType(event.target.value as CategoryType)}
            >
              <option value="INCOME">Pemasukan</option>
              <option value="EXPENSE">Pengeluaran</option>
            </select>
          </div>
          <div>
            <label htmlFor="cat-account" className="kicker mb-2 block">
              Akun Default
            </label>
            <select
              id="cat-account"
              className="field"
              value={categoryAccountCode}
              onChange={(event) => {
                setCategoryAccountCode(event.target.value)
                setCategoryError(null)
              }}
            >
              <option value="">Pilih akun…</option>
              {accounts
                .filter((account) => account.isActive)
                .map((account) => (
                  <option key={account.id} value={account.code}>
                    {account.code} — {account.name}
                  </option>
                ))}
            </select>
          </div>
          {categoryError && (
            <p id="cat-error" role="alert" className="border-[1.5px] border-negative p-3 text-xs text-negative">
              {categoryError}
            </p>
          )}
        </div>
      </Modal>
    </section>
  )
}
