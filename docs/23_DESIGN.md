# Filosofi & Sistem Desain — FinTrack Core

> Status: Final
> Terakhir diperbarui: 2026-09-19
> Pemilik: Design Office

Dokumen ini menjelaskan filosofi visual dan aturan sistem desain FinTrack Core. Padanan token siap implementasi ada di [24_DESIGN_TOKEN.md](24_DESIGN_TOKEN.md).

---

## 1. Filosofi: "Ledger Desk"

FinTrack Core mengadopsi turunan DNA **Editorial Brutalism / Operator's Desk** yang disebut **"Ledger Desk"** — antarmuka keuangan yang terasa seperti buku besar cetak dan terminal operator, bukan dashboard SaaS generik.

Premisnya sederhana: aplikasi pencatatan keuangan bekerja dengan angka, bukti, dan keputusan yang harus dapat diaudit. Maka antarmukanya harus terasa seperti dokumen kerja tinta-di-atas-kertas yang tegas dan dapat dipercaya — bukan panel data yang lembut, mengambang, dan dekoratif.

### 1.1 Prinsip Inti

1. **Ink-on-paper.** Kanvas dasar adalah kertas hangat (mint paper, bukan putih murni atau abu-abu netral), tinta near-black untuk teks dan garis tegas.
2. **Satu warna signal.** Mint (`hsl(162 55% 45%)`) adalah satu-satunya warna aksen bermakna — dipakai untuk status "hidup"/aktif, fokus, dan CTA utama. Tidak diobral ke area luas.
3. **Hard edges, bukan soft UI.** Radius nol di semua elemen, border 1–1.5px tegas, offset shadow solid (bukan blur lembut). Efek visual seolah kertas dicetak dan ditumpuk, bukan panel kaca yang melayang.
4. **Hierarki tipografi tajam.** Kontras besar antara display besar (Archivo weight tinggi) dan detail mono kecil (JetBrains Mono uppercase, tracking lebar) — meniru masthead editorial dan label teknis.
5. **Angka sebagai elemen utama.** Nominal Rupiah, saldo, dan variance adalah konten paling penting di halaman manapun — diberi ruang, tabular-nums, dan skema warna keuangan yang konsisten, bukan sekadar teks biasa.

### 1.2 Yang Dilarang

Sesuai DNA yang wajib dipertahankan, hal berikut dilarang di seluruh permukaan FinTrack Core:

- Biru SaaS generik sebagai warna utama/aksen.
- Gradien ungu–cyan atau gradien dekoratif apa pun.
- Soft blur shadow (`box-shadow` blur besar, tanpa offset tegas).
- Font Inter, Roboto, atau Arial sebagai font utama.
- Emoji sebagai ikon fungsional.
- `rounded-full` atau `rounded-3xl` pada kartu, tombol, atau kontainer data.

---

## 2. Bahasa Visual

- **Nada**: presisi, formal, dapat diaudit, tenang di bawah tekanan (menangani uang, bukan menghibur).
- **Atmosfer**: seperti meja kerja bendahara/operator finansial dengan buku besar cetak dan terminal transaksi hidup berdampingan.
- **Rasa**: solid, stabil, cepat dibaca, setiap keputusan (POSTED/VOID/DRAFT) terlihat jelas tanpa ambiguitas.

Warna signal mint diwariskan langsung dari DNA APIPedia/WAPilot agar keluarga produk tetap satu bahasa visual, namun di FinTrack Core mint diberi peran tambahan yang spesifik-keuangan: menandai **nilai positif/pemasukan** dan **status aktif/terverifikasi** — lihat §4.

---

## 3. Prinsip Layout

- **Max width**: 1280px untuk kontainer utama.
- **Grid**: grid 12 kolom, dengan pola **grid berbingkai** — parent memakai `border-t border-l`, setiap child memakai `border-r border-b`, sehingga garis grid terlihat menyatu tanpa duplikasi border.
- **Section padding**: `py-20 md:py-28` (80px mobile / 112px desktop) secara konsisten di setiap section.
- **Content width**: `max-w-3xl` untuk blok teks panjang, `max-w-lg` untuk paragraf penjelasan singkat.
- **Sidebar + kanvas kerja**: layout aplikasi utama memakai sidebar navigasi tetap (lebar tetap, border-r tegas) berdampingan dengan kanvas ledger yang scroll independen.

---

## 4. Aturan Warna Semantik Keuangan

Warna semantik keuangan **tetap berada dalam palet ink + mint**, bukan skema hijau-merah SaaS yang jenuh. Positif memakai mint signal (konsisten dengan seluruh produk), negatif memakai **ember/rust gelap** yang selaras suhu warna kertas hangat, bukan merah alarm generik.

| Peran                    | Nama Token        | Nilai HSL     | Alasan                                                                                                                                  |
| ------------------------ | ----------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Positif / Pemasukan      | `--positive`      | `162 55% 38%` | Mint signal digelapkan sedikit agar tetap terbaca sebagai teks angka (bukan hanya aksen UI) sambil mewarisi identitas brand             |
| Negatif / Pengeluaran    | `--negative`      | `18 45% 32%`  | Ember/rust gelap hangat — kontras dengan mint tanpa memakai merah alarm, tetap sefamili dengan kertas hangat (hue oranye-cokelat gelap) |
| Netral / Tanpa Perubahan | `--neutral-value` | `185 10% 36%` | Sama dengan `--muted-foreground`, dipakai untuk saldo nol atau nilai referensi                                                          |
| Peringatan Sentinel      | `--warning`       | `38 70% 42%`  | Amber gelap untuk anomali/rekonsiliasi tertunda — di antara mint dan rust secara hue, tidak pernah dipakai untuk nilai transaksi biasa  |

Aturan penerapan:

- Warna semantik ini hanya dipakai pada **nilai angka dan indikator status terkait**, tidak pernah sebagai warna background section atau warna dekoratif luas.
- `--positive` dan `--negative` selalu dipasangkan dengan tanda/format akuntansi (lihat §7), bukan hanya warna — agar tidak bergantung pada persepsi warna semata (aksesibilitas).
- `--warning` khusus untuk sentinel/badge peringatan sistem (contoh: saldo tidak seimbang, entri belum diverifikasi), tidak dipakai untuk styling tombol umum.

Definisi lengkap variabel CSS beserta versi dark mode ada di [24_DESIGN_TOKEN.md § 1](24_DESIGN_TOKEN.md#1-token-warna).

---

## 5. Skala Tipografi

Font display/body: **Archivo** (400–900). Font mono/kicker: **JetBrains Mono** (400–700), selalu uppercase dengan tracking lebar.

| Elemen                  | Ukuran Mobile   | Ukuran Desktop                    | Weight  | Line-height | Letter-spacing           |
| ----------------------- | --------------- | --------------------------------- | ------- | ----------- | ------------------------ |
| H1                      | 36px (text-4xl) | 60–72px (md:text-6xl/lg:text-7xl) | 800–900 | 1.08        | -0.03em                  |
| H2                      | 30px (text-3xl) | 48px (md:text-5xl)                | 800     | 1.15        | -0.02em                  |
| H3                      | 24px (text-2xl) | 30px (md:text-3xl)                | 800     | 1.2         | -0.01em                  |
| H4                      | 18px (text-lg)  | 22px (md:text-xl)                 | 700     | 1.25        | -0.005em                 |
| Body                    | 14px (text-sm)  | 16px (text-base)                  | 400     | 1.6         | normal                   |
| Body Large              | 18px (text-lg)  | 20px (text-xl)                    | 400     | 1.6         | normal                   |
| Caption                 | 12px (text-xs)  | 13px                              | 500     | 1.4         | 0.01em                   |
| Mono Kicker             | 10–11px         | 11px                              | 600–700 | 1.3         | 0.18em–0.3em (uppercase) |
| Mono Data (angka tabel) | 13px            | 14px                              | 500     | 1.4         | 0 (tabular-nums wajib)   |

Kicker selalu berupa label uppercase pendek, contoh: `LEDGER — JURNAL UMUM ————`.

---

## 6. Pola Komponen

### 6.1 Sticky Header

- Menempel di atas (`position: sticky; top: 0`), border-b tegas 1.5px, background kertas dengan sedikit backdrop (tanpa blur berlebihan yang melanggar aturan hard edge — gunakan opasitas solid, bukan `backdrop-blur` besar).
- Berisi: wordmark, breadcrumb ledger aktif (mono kicker), status koneksi/sinkronisasi (dot signal berdenyut), theme toggle.
- Scroll progress bar tipis 3px warna signal (opsional, untuk halaman laporan panjang).

### 6.2 Sidebar Navigasi

- Lebar tetap (240–280px desktop), border-r 1.5px tegas, collapse jadi off-canvas di mobile.
- Grup navigasi diberi label mono kicker (`RINGKASAN`, `TRANSAKSI`, `LAPORAN`, `PENGATURAN`).
- Item aktif: background `--muted`, garis kiri 3px warna signal, teks ink tebal (700).

### 6.3 Stat Card (Hard Shadow)

- Border 1–1.5px solid, radius 0, background `--card`.
- Shadow default `hard-shadow-sm` (3px 3px 0), saat hover berubah `hover-lift`: translate(-3px,-3px) + `hard-shadow` (5px 5px 0).
- Isi: kicker mono (label metrik), angka besar tabular-nums (Archivo 800), delta kecil dengan warna semantik (§4) dan tanda panah teks (▲/▼), bukan ikon panah generik.

### 6.4 Tabel Ledger

- Header kolom: mono kicker uppercase, border-b 1.5px.
- Baris data: `font-variant-numeric: tabular-nums` wajib pada seluruh kolom nominal, zebra rule tipis (`--rule` 1px setiap baris ganjil, bukan background block penuh — hanya garis horizontal tipis di atas/bawah tiap grup).
- Kolom nominal rata kanan; kolom deskripsi rata kiri.
- Hover baris: background `--muted`, tanpa shadow (baris bukan kartu).

### 6.4.1 Paginasi Tabel

- Ditempatkan sebagai baris kaki di dalam bingkai tabel, dipisahkan garis
  `border-t` 1.5px; bukan elemen mengambang terpisah dari tabelnya.
- Tombol nomor halaman berbentuk kotak siku minimal 36x36px, radius 0, border
  1.5px. Halaman aktif memakai satu-satunya sinyal mint pada kontrol tersebut
  (`--accent` sebagai latar, teks `--accent-foreground`); halaman lain netral.
- Deret nomor selalu memuat halaman pertama, terakhir, dan tetangga langsung
  halaman aktif. Pemotongan ditandai elipsis, tidak pernah dua berdampingan.
- Ringkasan posisi ("Menampilkan 1-25 dari 133") memakai mono kecil dengan
  `tabular-nums`, diberi `aria-live="polite"` agar perpindahan halaman terdengar
  oleh pembaca layar.
- Pemilih jumlah baris memakai pola `.field` yang sama dengan form lain.

### 6.4.2 Scrollbar

- Batang gulir mengikuti bahasa Ledger Desk: persegi tanpa radius, tanpa
  bayangan, lebar 10px. Warna diambil dari token tema sehingga ikut berubah pada
  mode gelap.
- Landasan memakai `--muted` dengan garis pembatas `--border` tipis; genggaman
  memakai `--border` penuh dan berubah menjadi `--accent` saat disentuh.
- Ditulis dua kali: properti `scrollbar-width`/`scrollbar-color` untuk Firefox
  dan pseudo-elemen `::-webkit-scrollbar` untuk Chromium serta WebKit.
- Diterapkan lewat kelas `.scroll-ledger`, bukan secara global, agar gulir
  peramban bawaan pada dokumen utama tetap terasa native.

### 6.4.3 Dropdown dengan Pencarian

Seluruh dropdown aplikasi memakai komponen `SearchSelect`, bukan elemen
`select` bawaan peramban. Alasannya dua: elemen bawaan tidak dapat digayakan
mengikuti bahasa Editorial Brutalism (panel opsinya digambar sistem operasi),
dan daftar akun dapat tumbuh melewati puluhan baris sehingga memilih tanpa
pencarian menjadi lambat.

Ketentuan visual:

- Pemicu memakai kelas `.field` yang sama dengan input teks, sehingga satu baris
  filter terlihat rata.
- Panel opsi memakai bayangan offset keras `4px 4px 0`, radius nol, dan batas
  `1.5px` — konsisten dengan panel lain.
- Opsi yang sedang terpilih ditandai garis kiri mint selebar 2px. Ini adalah
  satu-satunya sinyal mint pada daftar; opsi yang sedang disorot papan tik
  memakai latar `muted`, bukan mint, agar aturan satu sinyal tetap berlaku.
- Area gulir daftar dibatasi `max-h-60` dan memakai `.scroll-ledger`.

Ketentuan perilaku dan aksesibilitas:

- Pola ARIA combobox: pemicu `role="combobox"`, daftar `role="listbox"`, sorotan
  disampaikan lewat `aria-activedescendant` karena fokus DOM berada pada kotak
  pencarian.
- Papan tik: `ArrowDown`/`ArrowUp` berpindah dengan pembungkusan di kedua ujung,
  `Home`/`End` melompat ke ujung, `Enter` memilih, `Escape` menutup, `Tab`
  menutup lalu melanjutkan urutan fokus.
- Pencocokan mengabaikan besar-kecil huruf dan seluruh karakter selain huruf dan
  angka, sehingga label `10100 · Kas Tunai` tetap ditemukan dengan mengetik
  `10100 kas` maupun `10100kas`.
- Urutan hasil mengikuti urutan asal daftar, tidak diurutkan ulang berdasarkan
  peringkat kecocokan, agar urutan kode akun yang bermakna tidak teracak.

Pemilih ukuran halaman pada komponen `Pagination` sengaja tetap memakai elemen
`select` bawaan: pilihannya hanya empat angka, sehingga kotak pencarian justru
menambah langkah tanpa mempercepat apa pun.

### 6.5 Form Quick Entry

- Input field: border 1.5px solid, radius 0, focus ring 2px warna signal dengan offset 2px.
- Label memakai mono kicker kecil di atas input (bukan placeholder-only).
- Tombol submit primer: bg ink, teks kertas, hover translate(-2px,-2px) + shadow signal tipis.

### 6.6 Badge Status

- Bentuk: kotak siku (radius 0), border 1px, padding kecil, teks mono uppercase tracking 0.18em.
- `POSTED`: border+teks `--positive`, background transparan/mint-wash tipis.
- `VOID`: border+teks `--negative`, teks dicoret (`text-decoration: line-through`) sebagai penanda tambahan non-warna.
- `DRAFT`: border+teks `--muted-foreground`, gaya garis putus-putus (`border-style: dashed`) untuk membedakan dari status final.
- `Unverified`: border+teks `--warning`, disertai penanda mono `!` di depan label sebagai redundansi non-warna.

### 6.7 Empty State

- Ilustrasi minimal berupa pola garis/grid (bukan ilustrasi kartun berwarna), judul H4, deskripsi body kecil, satu CTA mono.
- Border dashed 1.5px mengelilingi area empty state untuk menegaskan "slot kosong di buku besar".

### 6.8 Toast

- Radius 0, border 1.5px, hard-shadow-sm, posisi bawah-kanan.
- Warna border mengikuti semantik: sukses = signal/positive, error = negative, peringatan = warning, info = ink netral.
- Animasi masuk: slideUp (lihat §8), keluar: fade cepat 0.2s.

### 6.9 Modal Konfirmasi Reversal

- Overlay ink solid opacity tinggi (bukan blur), radius 0, border 1.5px pada panel modal, hard-shadow besar (8px 8px 0).
- Header modal memakai kicker mono `KONFIRMASI PEMBALIKAN JURNAL`, isi menampilkan ringkasan transaksi asli vs. entri pembalik dalam format tabel ledger mini.
- Tombol aksi destruktif (konfirmasi reversal) memakai warna `--negative` pada border dan teks, bukan fill merah penuh — tetap dalam disiplin ink+border.

### 6.10 Footer Editorial

- Grid berbingkai multi-kolom (identitas produk, navigasi, legal/compliance, status sistem), border-t tegas memisahkan dari konten.
- Baris bawah mono kicker: versi build, waktu sinkronisasi terakhir, copyright.

### 6.11 Back-to-Top Button

- Kotak siku kecil, fixed bottom-right, border 1.5px, hard-shadow-sm, ikon panah teks/garis (bukan emoji).
- Muncul dengan fade+translate setelah scroll melewati satu viewport, hover-lift saat disentuh.

---

## 7. Aturan Angka

Angka adalah elemen konten utama FinTrack Core dan harus mengikuti aturan ketat berikut di seluruh permukaan (tabel, kartu statistik, form, badge, cetak/ekspor):

1. **Tabular numerals wajib**: `font-variant-numeric: tabular-nums` diterapkan pada setiap elemen yang menampilkan nominal, saldo, tanggal numerik, atau persentase, agar kolom sejajar sempurna seperti buku besar cetak.
2. **Format Rupiah id-ID tanpa desimal**: gunakan `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 })`. Contoh: `Rp 12.500.000`.
3. **Nilai negatif dalam kurung gaya akuntansi**: nilai negatif tidak ditulis dengan tanda minus (`-Rp 500.000`), melainkan dibungkus kurung: `(Rp 500.000)`, konsisten dengan konvensi buku besar/akuntansi cetak. Warna teks mengikuti `--negative`.
4. **Penyelarasan**: seluruh kolom nominal rata kanan; header kolom nominal juga rata kanan agar digit satuan sejajar vertikal antar baris.
5. **Redundansi non-warna**: status positif/negatif tidak pernah hanya bergantung pada warna — selalu disertai kurung (negatif) atau tanda `+` eksplisit (positif, opsional pada ringkasan) agar tetap terbaca bagi pengguna buta warna.

---

## 8. Motion

Semua animasi memakai easing kunci `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out tegas, konsisten dengan keluarga produk APIPedia/WAPilot), kecuali dinyatakan lain.

| Animasi    | Durasi              | Easing                     | Penggunaan                                                |
| ---------- | ------------------- | -------------------------- | --------------------------------------------------------- |
| reveal     | 0.7s                | cubic-bezier(0.16,1,0.3,1) | Elemen section muncul saat scroll (Intersection Observer) |
| slideUp    | 0.7s                | cubic-bezier(0.16,1,0.3,1) | Toast masuk, modal muncul                                 |
| fadeIn     | 0.6s                | ease-out                   | Transisi halaman, overlay                                 |
| scaleIn    | 0.6s                | cubic-bezier(0.16,1,0.3,1) | Popover, dropdown                                         |
| hover-lift | 0.2s                | cubic-bezier(0.16,1,0.3,1) | Kartu/tombol translate(-3px,-3px) + hard shadow           |
| pulse-dot  | 1.4s loop           | ease-in-out                | Indikator status "live"/sinkronisasi aktif                |
| marquee    | 30s linear infinite | linear                     | Ticker (jika dipakai pada ringkasan laporan berjalan)     |

**Aksesibilitas motion**: seluruh animasi di atas wajib dibungkus media query `prefers-reduced-motion: reduce` — saat aktif, durasi dipangkas ke `0.01ms` dan transform dihilangkan, hanya perubahan opacity instan yang dipertahankan.

---

## 9. Aksesibilitas

- **Kontras minimum 4.5:1** untuk seluruh pasangan teks/background, termasuk warna semantik `--positive`, `--negative`, dan `--warning` di atas `--background` maupun `--card` (light dan dark mode diverifikasi terpisah).
- **Focus ring**: 2px solid warna signal (`--secondary` / mint), dengan offset 2px, diterapkan pada seluruh elemen interaktif (`*:focus-visible`) — tidak pernah dihilangkan (`outline: none` tanpa pengganti dilarang).
- Status (badge, toast, delta angka) selalu memakai penanda non-warna tambahan (bentuk garis, tanda kurung, ikon teks) sesuai §6.6 dan §7.
- Target sentuh minimum 40x40px pada kontrol interaktif di breakpoint mobile.

---

## 10. Elemen Wajib

Setiap halaman aplikasi utama FinTrack Core wajib menyertakan:

1. **Sticky header** (§6.1)
2. **Footer editorial modern** (§6.10)
3. **Back-to-top button** (§6.11), aktif pada halaman dengan scroll panjang (laporan, ledger, riwayat transaksi)

---

## 11. Responsif

Breakpoint acuan pengujian dan desain:

| Breakpoint | Lebar  | Catatan Utama                                                                                                      |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| Mobile     | 375px  | Sidebar off-canvas, tabel ledger jadi kartu bertumpuk per transaksi, kicker tetap terlihat                         |
| Tablet     | 768px  | Sidebar dapat collapse ke ikon, tabel ledger mulai menampilkan kolom penuh dengan scroll horizontal jika perlu     |
| Laptop     | 1024px | Layout sidebar + kanvas penuh aktif, grid stat card 2–3 kolom                                                      |
| Desktop    | 1440px | Grid stat card hingga 4 kolom, max-width kontainer tetap 1280px (konten tidak melebar penuh di layar sangat lebar) |

---

## Referensi Silang

- Token warna, tipografi, spacing, shadow, dan kode implementasi: [24_DESIGN_TOKEN.md](24_DESIGN_TOKEN.md)
