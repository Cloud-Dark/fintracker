// Logika murni untuk komponen SearchSelect.
//
// Dipisah dari berkas komponen karena dua alasan: aturan ESLint
// `react-refresh/only-export-components` melarang berkas komponen mengekspor
// nilai non-komponen, dan pemisahan ini membuat perilaku pencarian serta
// navigasi papan tik dapat diuji tanpa merender apa pun.

export interface SelectOption {
  value: string
  label: string
  /** Keterangan sekunder, misalnya kode akun. Ikut dicari. */
  hint?: string
}

/**
 * Normalisasi untuk pembandingan: huruf kecil, dan seluruh karakter selain
 * huruf serta angka dibuang. Dengan begitu "10100 · Kas" tetap cocok dicari
 * dengan "10100kas" maupun "10100 kas", dan pemisah "·"/"—" yang dipakai pada
 * label akun tidak perlu diketik pengguna.
 */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

/**
 * Menyaring opsi berdasarkan kueri. Kueri kosong mengembalikan seluruh opsi
 * apa adanya sehingga urutan asal (yang bermakna, misalnya urut kode akun)
 * tidak pernah diacak oleh peringkat kecocokan.
 */
export function filterOptions(
  options: ReadonlyArray<SelectOption>,
  query: string
): ReadonlyArray<SelectOption> {
  const needle = normalize(query)
  if (!needle) return options
  return options.filter((option) =>
    normalize(`${option.label} ${option.hint ?? ''}`).includes(needle)
  )
}

/**
 * Menghitung indeks sorotan berikutnya dengan pembungkusan di kedua ujung.
 * Daftar kosong mengembalikan -1 supaya pemanggil tahu tidak ada yang disorot.
 */
export function nextHighlight(current: number, length: number, delta: number): number {
  if (length === 0) return -1
  if (current < 0) return delta > 0 ? 0 : length - 1
  return (current + delta + length) % length
}

/** Label opsi terpilih, atau null bila nilai tidak ada dalam daftar. */
export function labelOf(options: ReadonlyArray<SelectOption>, value: string): string | null {
  return options.find((option) => option.value === value)?.label ?? null
}
