// Utilitas tanggal lokal tanpa pustaka (TR-011).

const MONTHS_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
]

const MS_PER_DAY = 86_400_000
const MS_PER_HOUR = 3_600_000

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

// Pembanding hari memakai komponen tanggal UTC agar tidak terpengaruh DST.
function dayNumber(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return Date.UTC(y as number, (m as number) - 1, d as number) / MS_PER_DAY
}

export function daysBetween(aIso: string, bIso: string): number {
  return dayNumber(bIso) - dayNumber(aIso)
}

export function hoursBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso).getTime()
  const b = new Date(bIso).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return NaN
  return (b - a) / MS_PER_HOUR
}

export function formatDateID(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${d} ${MONTHS_ID[m - 1]} ${y}`
}
