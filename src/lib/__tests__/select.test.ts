import { describe, expect, it } from 'vitest'
import { filterOptions, labelOf, nextHighlight, type SelectOption } from '@/lib/select'

const OPTIONS: ReadonlyArray<SelectOption> = [
  { value: 'a', label: '10100 · Kas Tunai' },
  { value: 'b', label: '10200 · Kas Bank' },
  { value: 'c', label: '10400 · Piutang Usaha' },
  { value: 'd', label: 'Gaji & Upah Tim' },
]

describe('filterOptions', () => {
  it('mengembalikan seluruh opsi apa adanya saat kueri kosong', () => {
    expect(filterOptions(OPTIONS, '')).toBe(OPTIONS)
    expect(filterOptions(OPTIONS, '   ')).toBe(OPTIONS)
  })

  it('mencocokkan tanpa memandang besar kecil huruf', () => {
    expect(filterOptions(OPTIONS, 'KAS').map((o) => o.value)).toEqual(['a', 'b'])
  })

  it('mengabaikan pemisah pada label sehingga kode dan nama dapat diketik menyatu', () => {
    // Pengguna tidak perlu mengetik karakter "·" yang memisahkan kode dan nama.
    expect(filterOptions(OPTIONS, '10100 kas').map((o) => o.value)).toEqual(['a'])
    expect(filterOptions(OPTIONS, '10100kas').map((o) => o.value)).toEqual(['a'])
  })

  it('mencari pada hint, bukan hanya label', () => {
    const withHint: ReadonlyArray<SelectOption> = [
      { value: 'x', label: 'Kas Tunai', hint: '10100' },
    ]
    expect(filterOptions(withHint, '10100').map((o) => o.value)).toEqual(['x'])
  })

  it('mengembalikan daftar kosong bila tidak ada yang cocok', () => {
    expect(filterOptions(OPTIONS, 'zzz')).toEqual([])
  })

  it('mempertahankan urutan asal, tidak mengurutkan ulang berdasarkan peringkat', () => {
    expect(filterOptions(OPTIONS, '10').map((o) => o.value)).toEqual(['a', 'b', 'c'])
  })
})

describe('nextHighlight', () => {
  it('mengembalikan -1 pada daftar kosong', () => {
    expect(nextHighlight(0, 0, 1)).toBe(-1)
    expect(nextHighlight(-1, 0, -1)).toBe(-1)
  })

  it('memulai dari ujung yang sesuai arah bila belum ada sorotan', () => {
    expect(nextHighlight(-1, 4, 1)).toBe(0)
    expect(nextHighlight(-1, 4, -1)).toBe(3)
  })

  it('membungkus di kedua ujung daftar', () => {
    expect(nextHighlight(3, 4, 1)).toBe(0)
    expect(nextHighlight(0, 4, -1)).toBe(3)
  })

  it('bergerak satu langkah di tengah daftar', () => {
    expect(nextHighlight(1, 4, 1)).toBe(2)
    expect(nextHighlight(2, 4, -1)).toBe(1)
  })
})

describe('labelOf', () => {
  it('mengembalikan label opsi terpilih', () => {
    expect(labelOf(OPTIONS, 'c')).toBe('10400 · Piutang Usaha')
  })

  it('mengembalikan null bila nilai tidak ada dalam daftar', () => {
    // Terjadi ketika nilai tersimpan menunjuk akun yang sudah dinonaktifkan.
    expect(labelOf(OPTIONS, 'tidak-ada')).toBeNull()
    expect(labelOf(OPTIONS, '')).toBeNull()
  })
})
