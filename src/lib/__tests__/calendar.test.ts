import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  buildMonthGrid,
  daysInMonth,
  firstWeekdayIndex,
  isOutOfRange,
  monthLabel,
  monthOf,
  parseISO,
  toISO,
} from '@/lib/calendar'

describe('toISO dan parseISO', () => {
  it('membentuk ISO dengan zero padding', () => {
    expect(toISO(2026, 9, 7)).toBe('2026-09-07')
    expect(toISO(2026, 12, 31)).toBe('2026-12-31')
  })

  it('membaca ISO yang sah', () => {
    expect(parseISO('2026-09-19')).toEqual({ year: 2026, month: 9, day: 19 })
  })

  it('menolak bentuk yang tidak sah', () => {
    expect(parseISO('')).toBeNull()
    expect(parseISO('2026-9-19')).toBeNull()
    expect(parseISO('19-09-2026')).toBeNull()
    expect(parseISO('2026-09-19T00:00:00Z')).toBeNull()
  })

  it('menolak tanggal yang tidak ada, bukan menggulirkannya', () => {
    // Konstruktor Date diam-diam mengubah 30 Februari menjadi 1 Maret.
    expect(parseISO('2026-02-30')).toBeNull()
    expect(parseISO('2026-13-01')).toBeNull()
    expect(parseISO('2025-02-29')).toBeNull()
  })

  it('menerima 29 Februari pada tahun kabisat', () => {
    expect(parseISO('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 })
  })

  it('bolak-balik antara toISO dan parseISO', () => {
    const iso = toISO(2026, 2, 28)
    expect(parseISO(iso)).toEqual({ year: 2026, month: 2, day: 28 })
  })
})

describe('daysInMonth', () => {
  it('menghitung panjang bulan biasa', () => {
    expect(daysInMonth(2026, 1)).toBe(31)
    expect(daysInMonth(2026, 4)).toBe(30)
    expect(daysInMonth(2026, 12)).toBe(31)
  })

  it('membedakan Februari kabisat dan bukan kabisat', () => {
    expect(daysInMonth(2026, 2)).toBe(28)
    expect(daysInMonth(2024, 2)).toBe(29)
    // 2000 kabisat, 1900 tidak — aturan abad.
    expect(daysInMonth(2000, 2)).toBe(29)
    expect(daysInMonth(1900, 2)).toBe(28)
  })
})

describe('firstWeekdayIndex', () => {
  it('memakai Senin sebagai kolom nol', () => {
    // 1 September 2026 jatuh pada hari Selasa, sehingga berada di kolom 1.
    expect(firstWeekdayIndex(2026, 9)).toBe(1)
    // 1 Februari 2026 jatuh pada hari Minggu, kolom terakhir.
    expect(firstWeekdayIndex(2026, 2)).toBe(6)
  })

  it('selalu menghasilkan indeks dalam rentang 0 sampai 6', () => {
    for (let month = 1; month <= 12; month += 1) {
      const index = firstWeekdayIndex(2026, month)
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThanOrEqual(6)
    }
  })
})

describe('buildMonthGrid', () => {
  it('selalu berisi 42 sel agar tinggi panel tidak berubah', () => {
    for (let month = 1; month <= 12; month += 1) {
      expect(buildMonthGrid(2026, month)).toHaveLength(42)
    }
    // Februari 2026 dimulai Minggu: kasus terpadat bagi kisi enam pekan.
    expect(buildMonthGrid(2026, 2)).toHaveLength(42)
  })

  it('menandai hari milik bulan berjalan saja sebagai inMonth', () => {
    const grid = buildMonthGrid(2026, 9)
    expect(grid.filter((d) => d.inMonth)).toHaveLength(30)
  })

  it('mengisi awal kisi dengan ekor bulan sebelumnya', () => {
    const grid = buildMonthGrid(2026, 9)
    // September 2026 mulai Selasa, jadi satu sel diisi 31 Agustus.
    expect(grid[0]).toEqual({ iso: '2026-08-31', day: 31, inMonth: false })
    expect(grid[1]).toEqual({ iso: '2026-09-01', day: 1, inMonth: true })
  })

  it('mengisi akhir kisi dengan awal bulan berikutnya', () => {
    const grid = buildMonthGrid(2026, 9)
    expect(grid[grid.length - 1]?.inMonth).toBe(false)
    expect(grid[grid.length - 1]?.iso.startsWith('2026-10')).toBe(true)
  })

  it('menghasilkan deret ISO yang berurutan tanpa lompatan', () => {
    const grid = buildMonthGrid(2026, 3)
    for (let i = 1; i < grid.length; i += 1) {
      expect(grid[i]?.iso).toBe(addDays(grid[i - 1]?.iso ?? '', 1))
    }
  })
})

describe('addMonths', () => {
  it('bergeser dalam tahun yang sama', () => {
    expect(addMonths({ year: 2026, month: 5 }, 2)).toEqual({ year: 2026, month: 7 })
  })

  it('membawa tahun saat melewati Desember', () => {
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 })
  })

  it('membawa tahun saat mundur melewati Januari', () => {
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 })
    expect(addMonths({ year: 2026, month: 1 }, -13)).toEqual({ year: 2024, month: 12 })
  })
})

describe('addDays', () => {
  it('bergeser di dalam bulan', () => {
    expect(addDays('2026-09-19', 1)).toBe('2026-09-20')
    expect(addDays('2026-09-19', -1)).toBe('2026-09-18')
  })

  it('melewati batas bulan dan tahun', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('menangani Februari kabisat', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
  })

  it('bergeser satu pekan untuk navigasi menegak', () => {
    expect(addDays('2026-09-19', 7)).toBe('2026-09-26')
    expect(addDays('2026-09-01', -7)).toBe('2026-08-25')
  })

  it('mengembalikan masukan apa adanya bila ISO tidak sah', () => {
    expect(addDays('bukan-tanggal', 1)).toBe('bukan-tanggal')
  })
})

describe('monthOf', () => {
  it('mengambil bulan dari ISO yang sah', () => {
    expect(monthOf('2026-03-15', { year: 2000, month: 1 })).toEqual({ year: 2026, month: 3 })
  })

  it('jatuh ke cadangan bila nilai kosong atau tidak sah', () => {
    const fallback = { year: 2026, month: 9 }
    expect(monthOf('', fallback)).toBe(fallback)
    expect(monthOf('2026-02-31', fallback)).toBe(fallback)
  })
})

describe('isOutOfRange', () => {
  it('mengizinkan semuanya bila batas tidak diberikan', () => {
    expect(isOutOfRange('2026-09-19')).toBe(false)
  })

  it('memperlakukan kedua batas sebagai inklusif', () => {
    expect(isOutOfRange('2026-09-01', '2026-09-01', '2026-09-30')).toBe(false)
    expect(isOutOfRange('2026-09-30', '2026-09-01', '2026-09-30')).toBe(false)
  })

  it('menolak di luar batas', () => {
    expect(isOutOfRange('2026-08-31', '2026-09-01', '2026-09-30')).toBe(true)
    expect(isOutOfRange('2026-10-01', '2026-09-01', '2026-09-30')).toBe(true)
  })

  it('menerapkan hanya satu sisi bila hanya satu batas diberikan', () => {
    expect(isOutOfRange('2026-01-01', undefined, '2026-09-30')).toBe(false)
    expect(isOutOfRange('2027-01-01', undefined, '2026-09-30')).toBe(true)
  })
})

describe('monthLabel', () => {
  it('menyusun nama bulan Indonesia beserta tahun', () => {
    expect(monthLabel({ year: 2026, month: 9 })).toBe('September 2026')
    expect(monthLabel({ year: 2026, month: 1 })).toBe('Januari 2026')
    expect(monthLabel({ year: 2026, month: 12 })).toBe('Desember 2026')
  })
})
