// Semua nominal adalah integer rupiah utuh (TR-006).

const idGrouping = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function group(n: number): string {
  return idGrouping.format(n)
}

export function formatIDR(value: number, opts?: { sign?: boolean }): string {
  if (!Number.isFinite(value)) return 'Rp 0'
  const rounded = Math.round(value)
  if (rounded < 0) {
    // Gaya akuntansi: nilai negatif dalam kurung.
    return `(Rp ${group(Math.abs(rounded))})`
  }
  const prefix = opts?.sign && rounded > 0 ? '+' : ''
  return `${prefix}Rp ${group(rounded)}`
}

function compactAbs(abs: number): string {
  const units: Array<[number, string]> = [
    [1_000_000_000_000, 'T'],
    [1_000_000_000, 'M'],
    [1_000_000, 'jt'],
    [1_000, 'rb'],
  ]
  for (const [base, suffix] of units) {
    if (abs >= base) {
      const scaled = abs / base
      // Satu desimal bila < 100 agar tetap ringkas namun informatif.
      const text =
        scaled >= 100
          ? String(Math.round(scaled))
          : new Intl.NumberFormat('id-ID', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 1,
            }).format(scaled)
      return `${text} ${suffix}`
    }
  }
  return group(abs)
}

export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return 'Rp 0'
  const rounded = Math.round(value)
  const body = compactAbs(Math.abs(rounded))
  return rounded < 0 ? `(Rp ${body})` : `Rp ${body}`
}

export function parseIDR(input: string): number {
  if (typeof input !== 'string') return NaN
  let s = input.trim()
  if (s === '') return NaN

  let negative = false
  if (/^\(.*\)$/.test(s)) {
    negative = true
    s = s.slice(1, -1).trim()
  }
  s = s.replace(/^rp\.?/i, '').trim()
  if (s.startsWith('-')) {
    negative = true
    s = s.slice(1).trim()
  } else if (s.startsWith('+')) {
    s = s.slice(1).trim()
  }

  // Buang pemisah ribuan (titik/spasi); koma desimal tidak didukung karena
  // nominal selalu rupiah utuh.
  s = s.replace(/[.\s]/g, '')
  if (!/^\d+$/.test(s)) return NaN

  const n = Number(s)
  if (!Number.isSafeInteger(n)) return NaN
  return negative ? -n : n
}

export function assertPositiveInt(value: number, field: string): void {
  if (!Number.isInteger(value) || value <= 0 || !Number.isSafeInteger(value)) {
    throw new Error(`${field} harus bilangan bulat positif, diterima: ${String(value)}`)
  }
}
