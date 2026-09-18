// Uji penyusunan deret nomor halaman. Logika ini murni sehingga dapat diuji
// tanpa merender komponen, menghindari penambahan dependensi pengujian DOM.

import { describe, expect, it } from 'vitest'
import { buildPages } from '@/lib/pagination'

describe('buildPages', () => {
  it('menampilkan seluruh nomor tanpa elipsis bila halaman sedikit', () => {
    expect(buildPages(1, 1)).toEqual([1])
    expect(buildPages(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('memotong bagian kanan ketika halaman aktif berada di awal', () => {
    expect(buildPages(2, 20)).toEqual([1, 2, 3, 'gap', 20])
  })

  it('memotong bagian kiri ketika halaman aktif berada di akhir', () => {
    expect(buildPages(19, 20)).toEqual([1, 'gap', 18, 19, 20])
  })

  it('memotong kedua sisi ketika halaman aktif berada di tengah', () => {
    expect(buildPages(10, 20)).toEqual([1, 'gap', 9, 10, 11, 'gap', 20])
  })

  it('selalu menyertakan halaman pertama, terakhir, dan halaman aktif', () => {
    for (let page = 1; page <= 30; page += 1) {
      const pages = buildPages(page, 30)
      expect(pages[0]).toBe(1)
      expect(pages[pages.length - 1]).toBe(30)
      // Halaman aktif wajib dapat dijangkau langsung, bukan tersembunyi elipsis.
      expect(pages).toContain(page)
    }
  })

  it('tidak pernah menghasilkan dua elipsis berdampingan', () => {
    for (let page = 1; page <= 30; page += 1) {
      const pages = buildPages(page, 30)
      for (let i = 1; i < pages.length; i += 1) {
        expect(pages[i] === 'gap' && pages[i - 1] === 'gap').toBe(false)
      }
    }
  })
})
