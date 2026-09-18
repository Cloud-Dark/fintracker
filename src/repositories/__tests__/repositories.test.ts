import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  SCHEMA_VERSION,
  appendLedgerEntries,
  bootstrap,
  exportBackup,
  getAccounts,
  getCategories,
  getLedgerEntries,
  getMeta,
  getTransactions,
  importBackup,
  nextSequence,
  resetAll,
  saveTransactions,
} from '@/repositories/db'
import {
  ALL_KEYS,
  KEYS,
  NS,
  QUOTA_BYTES,
  estimateUsage,
  hasKey,
  readCollection,
  readObject,
  removeKey,
  restore,
  snapshot,
  writeCollection,
  writeObject,
} from '@/repositories/storage'
import { CHART_OF_ACCOUNTS, DEFAULT_CATEGORIES } from '@/repositories/seed'
import { createUnitOfWork } from '@/repositories/unitOfWork'
import type { BackupEnvelope, LedgerEntry, Transaction } from '@/types'

beforeEach(() => {
  localStorage.clear()
  bootstrap()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function makeEntry(over: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: `entry-${String(over.sequenceNum ?? 1)}`,
    transactionId: 'tx-1',
    accountId: 'acc-1',
    entryType: 'DEBIT',
    amount: 1_000,
    runningBalance: 1_000,
    sequenceNum: 1,
    prevHash: '0'.repeat(64),
    entryHash: 'a'.repeat(64),
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

function makeTx(over: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    clientTxId: 'client-1',
    transactionDate: '2026-01-01',
    description: 'Contoh',
    categoryId: 'cat-1',
    mutationType: 'EXPENSE',
    amount: 10_000,
    sourceAccountId: 'acc-1',
    destinationAccountId: '',
    status: 'POSTED',
    reversesTransactionId: null,
    attachmentId: null,
    isVerified: true,
    syncVersion: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

describe('storage — namespace dan round-trip', () => {
  it('semua kunci memakai namespace fintrack:v1', () => {
    expect(NS).toBe('fintrack:v1')
    for (const key of ALL_KEYS) {
      expect(key.startsWith('fintrack:v1:')).toBe(true)
    }
    expect(KEYS.ledgerEntries).toBe('fintrack:v1:ledger_entries')
    expect(new Set(ALL_KEYS).size).toBe(ALL_KEYS.length)
  })

  it('writeCollection/readCollection round-trip persis dan memakai kunci yang benar', () => {
    const rows = [{ a: 1 }, { a: 2 }]
    writeCollection(KEYS.reconciliations, rows)

    expect(readCollection<{ a: number }>(KEYS.reconciliations)).toEqual(rows)
    expect(localStorage.getItem('fintrack:v1:reconciliations')).toBe(JSON.stringify(rows))
    expect(hasKey(KEYS.reconciliations)).toBe(true)

    removeKey(KEYS.reconciliations)
    expect(hasKey(KEYS.reconciliations)).toBe(false)
    expect(readCollection(KEYS.reconciliations)).toEqual([])
  })

  it('writeObject/readObject round-trip persis dan memakai fallback saat kunci kosong', () => {
    writeObject(KEYS.settings, { theme: 'dark', quotaWarningRatio: 0.8 })
    expect(readObject<Record<string, unknown>>(KEYS.settings, { theme: 'light' })).toEqual({
      theme: 'dark',
      quotaWarningRatio: 0.8,
    })

    removeKey(KEYS.settings)
    expect(readObject<Record<string, unknown>>(KEYS.settings, { theme: 'light' })).toEqual({
      theme: 'light',
    })
  })

  it('JSON rusak atau bentuk salah ditangani tanpa melempar', () => {
    localStorage.setItem(KEYS.transactions, '{ini bukan json')
    expect(() => readCollection(KEYS.transactions)).not.toThrow()
    expect(readCollection(KEYS.transactions)).toEqual([])

    // Bentuk valid secara JSON tapi salah tipe.
    localStorage.setItem(KEYS.transactions, '{"bukan":"array"}')
    expect(readCollection(KEYS.transactions)).toEqual([])

    localStorage.setItem(KEYS.settings, '[1,2,3]')
    expect(readObject(KEYS.settings, { ok: true })).toEqual({ ok: true })

    localStorage.setItem(KEYS.settings, 'null')
    expect(readObject(KEYS.settings, { ok: true })).toEqual({ ok: true })

    localStorage.setItem(KEYS.settings, 'rusak-total')
    expect(() => readObject(KEYS.settings, { ok: true })).not.toThrow()
    expect(readObject(KEYS.settings, { ok: true })).toEqual({ ok: true })
  })

  it('snapshot() lalu restore() mengembalikan state persis', () => {
    writeCollection(KEYS.transactions, [makeTx()])
    removeKey(KEYS.settings)
    const snap = snapshot()

    // Hancurkan state.
    writeCollection(KEYS.transactions, [])
    writeCollection(KEYS.accounts, [])
    writeObject(KEYS.settings, { disisipkan: true })

    restore(snap)

    for (const key of ALL_KEYS) {
      expect(localStorage.getItem(key)).toBe(snap[key] ?? null)
    }
    expect(getTransactions()).toHaveLength(1)
    expect(getAccounts()).toHaveLength(CHART_OF_ACCOUNTS.length)
    // Kunci yang semula tidak ada harus kembali tidak ada, bukan menjadi '{}'.
    expect(localStorage.getItem(KEYS.settings)).toBeNull()
  })

  it('snapshot hanya mencakup kunci bernamespace, bukan kunci asing', () => {
    localStorage.setItem('kunci:luar', 'jangan-disentuh')
    const snap = snapshot()
    expect(Object.keys(snap).sort()).toEqual([...ALL_KEYS].sort())

    restore(snap)
    expect(localStorage.getItem('kunci:luar')).toBe('jangan-disentuh')
  })

  it('estimateUsage() mengembalikan bytes dan ratio yang masuk akal', () => {
    localStorage.clear()
    expect(estimateUsage()).toEqual({ bytes: 0, ratio: 0 })

    bootstrap()
    const kosong = estimateUsage()
    expect(kosong.bytes).toBeGreaterThan(0)
    expect(kosong.ratio).toBeCloseTo(kosong.bytes / QUOTA_BYTES, 12)
    expect(kosong.ratio).toBeGreaterThan(0)
    expect(kosong.ratio).toBeLessThan(1)

    // Bytes dihitung sebagai panjang kunci + panjang nilai untuk tiap kunci NS.
    const manual = ALL_KEYS.reduce((sum, key) => {
      const raw = localStorage.getItem(key)
      return raw === null ? sum : sum + key.length + raw.length
    }, 0)
    expect(kosong.bytes).toBe(manual)

    // Menambah data harus menaikkan estimasi.
    saveTransactions(Array.from({ length: 50 }, (_, i) => makeTx({ id: `tx-${String(i)}` })))
    const penuh = estimateUsage()
    expect(penuh.bytes).toBeGreaterThan(kosong.bytes)
    expect(penuh.ratio).toBeGreaterThan(kosong.ratio)
  })
})

describe('seed / bootstrap', () => {
  it('Chart of Accounts memakai kode 5 digit dan normalBalance sesuai tipe', () => {
    const expectedByType = {
      ASSET: 'DEBET',
      EXPENSE: 'DEBET',
      LIABILITY: 'KREDIT',
      EQUITY: 'KREDIT',
      REVENUE: 'KREDIT',
    } as const
    const prefixByType: Record<string, readonly string[]> = {
      ASSET: ['1'],
      LIABILITY: ['2'],
      EQUITY: ['3'],
      REVENUE: ['4'],
      EXPENSE: ['5', '6'],
    }

    for (const def of CHART_OF_ACCOUNTS) {
      expect(def.code).toMatch(/^\d{5}$/)
      expect(def.normalBalance).toBe(expectedByType[def.type])
      expect(prefixByType[def.type]).toContain(def.code[0])
    }
    expect(new Set(CHART_OF_ACCOUNTS.map((d) => d.code)).size).toBe(CHART_OF_ACCOUNTS.length)
  })

  it('bootstrap() men-seed akun, kategori, dan meta', () => {
    const accounts = getAccounts()
    expect(accounts).toHaveLength(CHART_OF_ACCOUNTS.length)
    expect(accounts.map((a) => a.code)).toEqual(CHART_OF_ACCOUNTS.map((d) => d.code))
    for (const acc of accounts) {
      expect(acc.code).toMatch(/^\d{5}$/)
      expect(acc.currency).toBe('IDR')
      expect(acc.currentBalance).toBe(0)
      expect(acc.isActive).toBe(true)
      expect(acc.id).not.toBe('')
    }
    expect(new Set(accounts.map((a) => a.id)).size).toBe(accounts.length)

    expect(getCategories()).toHaveLength(DEFAULT_CATEGORIES.length)
    // Setiap kategori menunjuk kode akun yang benar-benar ada di CoA.
    const codes = new Set(accounts.map((a) => a.code))
    for (const cat of getCategories()) expect(codes.has(cat.defaultAccountCode)).toBe(true)

    const meta = getMeta()
    expect(meta.schemaVersion).toBe(SCHEMA_VERSION)
    expect(meta.lastSequenceNum).toBe(0)
    expect(meta.seededAt).not.toBeNull()
  })

  it('bootstrap() idempoten: pemanggilan kedua tidak menggandakan apa pun', () => {
    const idsAwal = getAccounts().map((a) => a.id)
    const metaAwal = getMeta()

    bootstrap()
    bootstrap()

    expect(getAccounts()).toHaveLength(CHART_OF_ACCOUNTS.length)
    expect(getAccounts().map((a) => a.id)).toEqual(idsAwal)
    expect(getCategories()).toHaveLength(DEFAULT_CATEGORIES.length)
    expect(getMeta()).toEqual(metaAwal)
  })

  it('bootstrap() tidak menimpa data yang sudah ada', () => {
    saveTransactions([makeTx()])
    nextSequence(5)

    bootstrap()

    expect(getTransactions()).toHaveLength(1)
    expect(getMeta().lastSequenceNum).toBe(5)
  })
})

describe('db — nextSequence', () => {
  it('mengalokasikan blok monotonic dan memperbarui meta', () => {
    expect(nextSequence(2)).toBe(1)
    expect(getMeta().lastSequenceNum).toBe(2)
    expect(nextSequence(3)).toBe(3)
    expect(getMeta().lastSequenceNum).toBe(5)
    expect(nextSequence(1)).toBe(6)
    expect(getMeta().lastSequenceNum).toBe(6)
  })

  it('tidak pernah mengembalikan nomor yang sama dua kali', () => {
    const seen = new Set<number>()
    let terakhir = 0
    for (let i = 0; i < 40; i += 1) {
      const count = (i % 4) + 1
      const first = nextSequence(count)
      expect(first).toBeGreaterThan(terakhir)
      for (let n = first; n < first + count; n += 1) {
        expect(seen.has(n)).toBe(false)
        seen.add(n)
      }
      terakhir = first + count - 1
    }
    expect(seen.size).toBe(terakhir)
    expect(Math.min(...seen)).toBe(1)
    expect(Math.max(...seen)).toBe(terakhir)
    expect(getMeta().lastSequenceNum).toBe(terakhir)
  })

  it('menolak count yang bukan bilangan bulat positif tanpa menggeser meta', () => {
    for (const bad of [0, -1, 1.5, Number.NaN]) {
      expect(() => nextSequence(bad)).toThrow()
    }
    expect(getMeta().lastSequenceNum).toBe(0)
  })
})

describe('db — appendLedgerEntries (append-only)', () => {
  it('hanya menambah; entri lama tetap ada dan tidak berubah', () => {
    const batch1 = [
      makeEntry({ sequenceNum: 1 }),
      makeEntry({ sequenceNum: 2, entryType: 'CREDIT' }),
    ]
    appendLedgerEntries(batch1)
    const setelahBatch1 = JSON.stringify(getLedgerEntries())

    appendLedgerEntries([makeEntry({ sequenceNum: 3, transactionId: 'tx-2' })])
    const semua = getLedgerEntries()

    expect(semua).toHaveLength(3)
    expect(JSON.stringify(semua.slice(0, 2))).toBe(setelahBatch1)
    expect(semua.map((e) => e.sequenceNum)).toEqual([1, 2, 3])
  })

  it('batch kosong tidak mengubah apa pun', () => {
    appendLedgerEntries([makeEntry()])
    const sebelum = JSON.stringify(getLedgerEntries())
    appendLedgerEntries([])
    expect(JSON.stringify(getLedgerEntries())).toBe(sebelum)
  })
})

describe('db — export/import backup', () => {
  function isiData(): void {
    saveTransactions([makeTx(), makeTx({ id: 'tx-2', clientTxId: 'client-2', amount: 99_000 })])
    appendLedgerEntries([makeEntry({ sequenceNum: 1 }), makeEntry({ sequenceNum: 2 })])
    nextSequence(2)
  }

  it('exportBackup() lalu importBackup() memulihkan state identik', () => {
    isiData()
    const env = exportBackup()
    const sebelum = JSON.stringify(env.data)

    // Hancurkan state.
    localStorage.clear()
    bootstrap()
    saveTransactions([])
    expect(getTransactions()).toHaveLength(0)

    importBackup(env)

    expect(JSON.stringify(exportBackup().data)).toBe(sebelum)
    expect(getTransactions()).toHaveLength(2)
    expect(getLedgerEntries()).toHaveLength(2)
    expect(getMeta().lastSequenceNum).toBe(2)
    expect(getAccounts().map((a) => a.id)).toEqual(env.data.accounts.map((a) => a.id))
  })

  it('exportBackup() menyertakan checksum yang cocok dengan datanya', () => {
    isiData()
    const env = exportBackup()
    expect(env.formatVersion).toBe(1)
    expect(env.schemaVersion).toBe(SCHEMA_VERSION)
    expect(env.checksum).toMatch(/^[0-9a-f]{64}$/)
    expect(() => importBackup(env)).not.toThrow()
  })

  it('importBackup menolak payload dengan bentuk salah', () => {
    const env = exportBackup()

    expect(() => importBackup(null as unknown as BackupEnvelope)).toThrow()
    expect(() => importBackup({} as unknown as BackupEnvelope)).toThrow()
    expect(() => importBackup('bukan objek' as unknown as BackupEnvelope)).toThrow()
    expect(() => importBackup({ ...env, formatVersion: 2 as unknown as 1 })).toThrow(
      /formatVersion/
    )
    expect(() => importBackup({ ...env, schemaVersion: SCHEMA_VERSION + 1 })).toThrow(
      /schemaVersion/
    )
    expect(() => importBackup({ ...env, schemaVersion: 0 })).toThrow(/schemaVersion/)
    expect(() => importBackup({ ...env, checksum: 'f'.repeat(64) })).toThrow(/Checksum/)
  })

  it('import yang ditolak tidak meninggalkan state parsial', () => {
    isiData()
    const sebelum = snapshot()

    const rusak = exportBackup()
    rusak.data.transactions = []
    // Checksum tidak ikut diperbarui -> harus ditolak sebelum menulis apa pun.
    expect(() => importBackup(rusak)).toThrow(/Checksum/)

    expect(snapshot()).toEqual(sebelum)
    expect(getTransactions()).toHaveLength(2)
  })
})

describe('db — resetAll', () => {
  it('mengosongkan seluruh kunci bernamespace lalu dapat di-bootstrap ulang bersih', () => {
    saveTransactions([makeTx()])
    appendLedgerEntries([makeEntry()])
    nextSequence(7)
    localStorage.setItem('kunci:luar', 'tetap-ada')

    resetAll()

    for (const key of ALL_KEYS) expect(localStorage.getItem(key)).toBeNull()
    expect(getAccounts()).toEqual([])
    expect(getTransactions()).toEqual([])
    expect(getLedgerEntries()).toEqual([])
    expect(localStorage.getItem('kunci:luar')).toBe('tetap-ada')

    bootstrap()

    expect(getAccounts()).toHaveLength(CHART_OF_ACCOUNTS.length)
    expect(getCategories()).toHaveLength(DEFAULT_CATEGORIES.length)
    expect(getTransactions()).toEqual([])
    expect(getLedgerEntries()).toEqual([])
    expect(getMeta().lastSequenceNum).toBe(0)
    expect(getMeta().schemaVersion).toBe(SCHEMA_VERSION)
  })
})

describe('unitOfWork', () => {
  it('commit sukses menuliskan semua perubahan yang di-stage', () => {
    const tx = makeTx({ id: 'tx-uow' })
    createUnitOfWork()
      .stage(KEYS.transactions, [tx])
      .stage(KEYS.ledgerEntries, [makeEntry({ sequenceNum: 9 })])
      .stageObject(KEYS.settings, { theme: 'dark' })
      .commit()

    expect(getTransactions()).toEqual([tx])
    expect(getLedgerEntries()).toHaveLength(1)
    expect(readObject<Record<string, unknown>>(KEYS.settings, {})).toEqual({ theme: 'dark' })
  })

  it('validator dijalankan sebelum menyentuh localStorage; gagal validasi = nol tulisan', () => {
    const sebelum = snapshot()
    const urutan: string[] = []

    expect(() =>
      createUnitOfWork()
        .stage(KEYS.transactions, [makeTx()])
        .validate(() => {
          urutan.push('v1')
        })
        .validate(() => {
          urutan.push('v2')
          throw new Error('validasi gagal')
        })
        .commit()
    ).toThrow('validasi gagal')

    expect(urutan).toEqual(['v1', 'v2'])
    expect(snapshot()).toEqual(sebelum)
    expect(getTransactions()).toEqual([])
  })

  it('flush yang gagal di tengah me-ROLLBACK SELURUHNYA (tidak ada state parsial)', () => {
    // State awal yang harus utuh kembali.
    const txAwal = makeTx({ id: 'tx-awal' })
    saveTransactions([txAwal])
    appendLedgerEntries([makeEntry({ sequenceNum: 1 })])
    const sebelum = snapshot()
    const akunAwal = getAccounts()

    // Gagalkan HANYA penulisan kunci ledger_entries. Kunci lain (termasuk kunci
    // probe milik storage) tetap normal, sehingga kegagalan benar-benar terjadi
    // di tengah urutan flush: accounts & transactions sudah sempat tertulis.
    const asli = Storage.prototype.setItem
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string
    ): void {
      if (key === KEYS.ledgerEntries) {
        throw new Error('QuotaExceededError: kuota localStorage habis')
      }
      asli.call(this, key, value)
    })

    let ditangkap: unknown = null
    try {
      createUnitOfWork()
        .stage(
          KEYS.accounts,
          akunAwal.map((a) => ({ ...a, currentBalance: 123_456 }))
        )
        .stage(KEYS.transactions, [txAwal, makeTx({ id: 'tx-baru', clientTxId: 'c-baru' })])
        .stage(KEYS.ledgerEntries, [makeEntry({ sequenceNum: 1 }), makeEntry({ sequenceNum: 2 })])
        .commit()
    } catch (err) {
      ditangkap = err
    }

    spy.mockRestore()

    // Error asli dilempar ulang, tidak ditelan.
    expect(ditangkap).toBeInstanceOf(Error)
    expect((ditangkap as Error).message).toMatch(/kuota localStorage habis/)

    // Rollback total: SETIAP kunci kembali byte-per-byte seperti semula.
    expect(snapshot()).toEqual(sebelum)
    expect(getTransactions()).toEqual([txAwal])
    expect(getLedgerEntries()).toHaveLength(1)
    expect(getAccounts()).toEqual(akunAwal)
    expect(getAccounts().every((a) => a.currentBalance === 0)).toBe(true)
  })

  it('rollback juga memulihkan kunci yang semula belum ada', () => {
    removeKey(KEYS.settings)
    expect(localStorage.getItem(KEYS.settings)).toBeNull()
    const sebelum = snapshot()

    const asli = Storage.prototype.setItem
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string
    ): void {
      if (key === KEYS.meta) throw new Error('gagal menulis meta')
      asli.call(this, key, value)
    })

    expect(() =>
      createUnitOfWork()
        .stageObject(KEYS.settings, { theme: 'dark' })
        .stageObject(KEYS.meta, { schemaVersion: 1, lastSequenceNum: 99, seededAt: null })
        .commit()
    ).toThrow('gagal menulis meta')

    spy.mockRestore()

    expect(snapshot()).toEqual(sebelum)
    // Kunci yang semula absen harus kembali absen, bukan menyisakan nilai parsial.
    expect(localStorage.getItem(KEYS.settings)).toBeNull()
    expect(getMeta().lastSequenceNum).toBe(0)
  })

  it('stage pada kunci yang sama dua kali memakai nilai terakhir', () => {
    createUnitOfWork()
      .stage(KEYS.transactions, [makeTx({ id: 'lama' })])
      .stage(KEYS.transactions, [makeTx({ id: 'baru' })])
      .commit()

    expect(getTransactions().map((t) => t.id)).toEqual(['baru'])
  })
})
