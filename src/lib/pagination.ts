// Logika penomoran halaman, dipisah dari komponen agar dapat diuji sebagai
// fungsi murni dan agar berkas komponen hanya mengekspor komponen.

/** Penanda pemotongan deret nomor halaman. */
export type PageToken = number | 'gap'

/**
 * Menyusun deret nomor halaman dengan elipsis, selalu menyertakan halaman
 * pertama, terakhir, dan tetangga langsung halaman aktif. Nilai `'gap'`
 * menandai pemotongan sehingga deret tidak pernah melebar tanpa batas.
 */
export function buildPages(page: number, pageCount: number): ReadonlyArray<PageToken> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)

  const pages: (number | 'gap')[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(pageCount - 1, page + 1)

  if (start > 2) pages.push('gap')
  for (let i = start; i <= end; i += 1) pages.push(i)
  if (end < pageCount - 1) pages.push('gap')

  pages.push(pageCount)
  return pages
}
