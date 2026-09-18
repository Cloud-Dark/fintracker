# Panduan Instalasi dan Penerapan — FinTrack Core

> Status: Final
> Terakhir diperbarui: 2026-09-19
> Pemilik: Office of the CTO

Dokumen ini menjelaskan cara menjalankan FinTrack Core secara lokal dan
menerapkannya ke Cloudflare Pages. Untuk konfigurasi lingkungan pengembangan
sehari-hari, lihat [17_DEVELOPER_SETUP.md](17_DEVELOPER_SETUP.md).

## 1. Prasyarat

| Kebutuhan | Versi minimum                        | Catatan                                    |
| --------- | ------------------------------------ | ------------------------------------------ |
| Node.js   | 20.x                                 | Diperlukan oleh Vite 5                     |
| npm       | 10.x                                 | Terbawa bersama Node.js 20                 |
| Peramban  | Chrome 111, Firefox 113, Safari 16.4 | Wajib mendukung Web Crypto `crypto.subtle` |

Aplikasi berjalan sepenuhnya di sisi klien. Tidak ada basis data server, tidak
ada variabel lingkungan, dan tidak ada kunci rahasia yang perlu disiapkan.

## 2. Instalasi Lokal

```bash
git clone <url-repositori>
cd fintracker
npm install
npm run dev
```

Peladen pengembangan berjalan pada `http://localhost:5173`. Saat pertama kali
dibuka, aplikasi menjalankan proses bootstrap yang menanam Chart of Accounts
lima digit beserta kategori bawaan ke `localStorage`.

## 3. Perintah yang Tersedia

| Perintah            | Kegunaan                                                     |
| ------------------- | ------------------------------------------------------------ |
| `npm run dev`       | Peladen pengembangan dengan hot module replacement           |
| `npm run build`     | Kompilasi TypeScript lalu bangun artefak produksi ke `dist/` |
| `npm run preview`   | Pratinjau hasil build produksi secara lokal                  |
| `npm test`          | Menjalankan seluruh uji unit Vitest                          |
| `npm run typecheck` | Pemeriksaan tipe tanpa menghasilkan berkas                   |
| `npm run lint`      | Pemeriksaan ESLint, gagal bila ada peringatan                |
| `npm run format`    | Memformat seluruh berkas dengan Prettier                     |

## 4. Penerapan ke Cloudflare Pages

### 4.1 Melalui Antarmuka Dasbor

1. Buka Cloudflare Dashboard, pilih **Workers & Pages**, lalu **Create application**.
2. Pilih tab **Pages** dan hubungkan repositori Git yang memuat proyek ini.
3. Isi konfigurasi build berikut.

| Pengaturan             | Nilai           |
| ---------------------- | --------------- |
| Framework preset       | None            |
| Build command          | `npm run build` |
| Build output directory | `dist`          |
| Root directory         | `/`             |
| Node version           | `20`            |

4. Klik **Save and Deploy**. Cloudflare akan menjalankan build dan menerbitkan
   URL berformat `https://<nama-proyek>.pages.dev`.

Bila versi Node perlu dipaksa, tambahkan variabel lingkungan build
`NODE_VERSION` dengan nilai `20`.

### 4.2 Melalui Wrangler

```bash
npm run build
npx wrangler pages deploy dist --project-name fintrack-core
```

Perintah ini memerlukan autentikasi Cloudflare melalui `npx wrangler login`.

### 4.3 Fallback SPA

Aplikasi menggunakan React Router dengan mode history. Berkas
`public/_redirects` berisi baris berikut dan tersalin otomatis ke `dist/`
saat build.

```
/* /index.html 200
```

Tanpa berkas ini, memuat ulang halaman pada rute selain akar akan menghasilkan
galat 404.

## 5. Verifikasi Pascapenerapan

Lakukan pemeriksaan berikut pada URL produksi.

1. Halaman Dashboard termuat dan Chart of Accounts ter-seed otomatis.
2. Pencatatan satu transaksi berhasil dan saldo akun berubah sesuai arah mutasi.
3. Halaman Buku Besar menampilkan dua baris berpasangan dengan selisih nol.
4. Tombol verifikasi integritas pada Buku Besar melaporkan rantai valid.
5. Muat ulang peramban pada rute `/laporan`; halaman tetap termuat, bukan 404.
6. Ekspor cadangan JSON menghasilkan berkas unduhan yang valid.

Skenario lengkap beserta hasilnya tercatat pada
[uat/2026-09-19_smoke-test-mvp.md](uat/2026-09-19_smoke-test-mvp.md).

## 6. Pencadangan dan Pemulihan

Seluruh data tersimpan pada `localStorage` peramban dan terikat pada satu
perangkat serta satu profil peramban. Data akan hilang bila pengguna
membersihkan data situs.

- **Data contoh.** Pada pemasangan baru, 30 transaksi peragaan dimuat otomatis
  sekali jalan agar aplikasi langsung dapat ditinjau dengan data yang terisi.
  Untuk memulai dari buku besar kosong, jalankan Reset Seluruh Data pada halaman
  Pengaturan; setelah itu data contoh tidak dimuat ulang secara otomatis dan
  hanya dapat dipanggil kembali lewat panel "Data Contoh".
- **Cadangan.** Halaman Pengaturan menyediakan ekspor cadangan JSON penuh.
  Lakukan secara berkala.
- **Pemulihan.** Halaman Pengaturan menerima berkas hasil ekspor melalui menu
  impor cadangan, dengan konfirmasi sebelum penimpaan.

Risiko kehilangan data dan mitigasinya tercatat pada
[10_RISK_REGISTER.md](10_RISK_REGISTER.md).

## 7. Batasan yang Diketahui

- Tidak tersedia otentikasi maupun enkripsi at-rest.
- Data tidak tersinkronisasi antarperangkat.
- Kapasitas `localStorage` umumnya berkisar 5 MB per asal; halaman Pengaturan
  menampilkan pemakaian dan memperingatkan saat melewati 80 persen.

## Referensi

- [04_TRD.md](04_TRD.md)
- [11_DECISIONS.md](11_DECISIONS.md)
- [17_DEVELOPER_SETUP.md](17_DEVELOPER_SETUP.md)
