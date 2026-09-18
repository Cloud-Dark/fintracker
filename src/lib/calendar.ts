// Logika murni kalender untuk komponen DatePicker.
//
// Dipisah dari berkas komponen agar dapat diuji sebagai fungsi biasa, dan agar
// aturan ESLint `react-refresh/only-export-components` tidak dilanggar.
//
// Seluruh tanggal diwakili string ISO `YYYY-MM-DD`, bentuk yang sama dengan
// yang disimpan pada buku besar. Objek `Date` hanya dipakai sebagai alat hitung
// sementara di dalam berkas ini, dan selalu dibentuk dengan konstruktor
// komponen lokal — bukan `new Date(string)` — supaya tidak ada pergeseran zona
// waktu yang membuat tanggal mundur satu hari.

export const MONTH_NAMES_ID: ReadonlyArray<string> = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

/** Kepala kolom kalender, dimulai Senin sesuai kebiasaan kalender Indonesia. */
export const WEEKDAY_NAMES_ID: ReadonlyArray<string> = ['Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb', 'Mg']

export interface YearMonth {
  year: number
  /** 1 sampai 12. */
  month: number
}

export interface CalendarDay {
  iso: string
  day: number
  /** Salah bila hari ini milik bulan sebelum atau sesudah bulan yang dilihat. */
  inMonth: boolean
}

/** Membentuk ISO dari komponen tanggal tanpa melalui parsing string. */
export function toISO(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Membaca ISO menjadi komponen tanggal, atau null bila bentuknya tidak sah
 * maupun tanggalnya tidak ada (misalnya `2026-02-30`). Pemeriksaan keberadaan
 * dilakukan dengan membentuk ulang `Date` lalu membandingkan komponennya,
 * karena konstruktor `Date` diam-diam menggulirkan tanggal berlebih.
 */
export function parseISO(iso: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const probe = new Date(year, month - 1, day)
  if (probe.getFullYear() !== year || probe.getMonth() !== month - 1 || probe.getDate() !== day) {
    return null
  }
  return { year, month, day }
}

/** Jumlah hari pada satu bulan; hari ke-0 bulan berikutnya adalah hari terakhir bulan ini. */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * Indeks kolom hari pertama bulan, dengan Senin sebagai kolom 0.
 * `getDay()` memakai Minggu sebagai 0, sehingga perlu digeser.
 */
export function firstWeekdayIndex(year: number, month: number): number {
  return (new Date(year, month - 1, 1).getDay() + 6) % 7
}

/**
 * Menyusun kisi enam pekan berisi 42 hari. Jumlahnya sengaja tetap agar tinggi
 * panel kalender tidak berubah saat pengguna berpindah bulan — pergeseran
 * tinggi membuat tombol di bawahnya melompat.
 */
export function buildMonthGrid(year: number, month: number): ReadonlyArray<CalendarDay> {
  const lead = firstWeekdayIndex(year, month)
  const total = daysInMonth(year, month)
  const grid: CalendarDay[] = []

  const prev = addMonths({ year, month }, -1)
  const prevTotal = daysInMonth(prev.year, prev.month)
  for (let i = lead - 1; i >= 0; i -= 1) {
    const day = prevTotal - i
    grid.push({ iso: toISO(prev.year, prev.month, day), day, inMonth: false })
  }

  for (let day = 1; day <= total; day += 1) {
    grid.push({ iso: toISO(year, month, day), day, inMonth: true })
  }

  const next = addMonths({ year, month }, 1)
  let day = 1
  while (grid.length < 42) {
    grid.push({ iso: toISO(next.year, next.month, day), day, inMonth: false })
    day += 1
  }

  return grid
}

/** Menggeser bulan dengan pembawaan tahun ke kedua arah. */
export function addMonths(current: YearMonth, delta: number): YearMonth {
  const zeroBased = current.year * 12 + (current.month - 1) + delta
  return { year: Math.floor(zeroBased / 12), month: (((zeroBased % 12) + 12) % 12) + 1 }
}

/**
 * Menggeser tanggal sejumlah hari, dipakai navigasi papan tik pada kisi.
 * Penjumlahan dilakukan lewat `Date` lokal sehingga batas bulan dan tahun
 * kabisat tertangani tanpa perhitungan manual.
 */
export function addDays(iso: string, delta: number): string {
  const parts = parseISO(iso)
  if (!parts) return iso
  const moved = new Date(parts.year, parts.month - 1, parts.day + delta)
  return toISO(moved.getFullYear(), moved.getMonth() + 1, moved.getDate())
}

/** Bulan yang sebaiknya ditampilkan saat panel dibuka. */
export function monthOf(iso: string, fallback: YearMonth): YearMonth {
  const parts = parseISO(iso)
  return parts ? { year: parts.year, month: parts.month } : fallback
}

/** Benar bila `iso` berada di luar rentang `min`–`max`; batas kosong berarti tak terbatas. */
export function isOutOfRange(iso: string, min?: string, max?: string): boolean {
  if (min && iso < min) return true
  if (max && iso > max) return true
  return false
}

/** Label kepala panel, misalnya "September 2026". */
export function monthLabel({ year, month }: YearMonth): string {
  return `${MONTH_NAMES_ID[month - 1]} ${year}`
}
