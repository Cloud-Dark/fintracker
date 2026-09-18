# Changelog — FinTrack Core

> Status: Final
> Terakhir diperbarui: 2026-09-19
> Pemilik: Office of the CTO

Format mengikuti [Keep a Changelog](https://keepachangelog.com/), dan proyek ini
mengikuti [Semantic Versioning](https://semver.org/) sejauh berlaku untuk aplikasi
klien statis.

## [Unreleased]

### Added

- Laporan **Neraca Saldo** (FR-025): fungsi `trialBalance(asOf?)` pada
  `src/domain/reporting.ts` yang menjumlahkan ulang sisi debit dan kredit dari
  baris ledger — bukan dari kolom `currentBalance` — sebagai pembuktian
  aritmetika yang independen terhadap nilai turunan.
- Tab **Neraca Saldo** pada halaman Laporan, memuat dua kartu bukti
  berdampingan (Uji 1 keseimbangan aritmetika, Uji 2 keutuhan rantai hash),
  tabel per akun dengan paginasi, blok total di luar tabel, dan ekspor CSV.
- Lima uji untuk neraca saldo, termasuk uji adversarial yang sengaja merusak
  `currentBalance` seluruh akun lalu memastikan total tidak berubah
  (133 menjadi 138 uji).
- Tautan Kode Sumber (GitHub) dan Demo Langsung pada footer aplikasi serta
  panel Tentang Aplikasi di halaman Pengaturan, bersumber dari satu berkas
  `src/lib/links.ts` agar tidak saling menyimpang.
- [README.md](../README.md): seksi "Mekanisme Pembuktian Debit dan Kredit"
  yang menguraikan empat lapis pembuktian beserta tabel cara memeriksanya
  sendiri, dan seksi "Tautan".
- [22_ACCOUNTING_SPEC.md](22_ACCOUNTING_SPEC.md) seksi 4.1: tabel empat lapis
  pembuktian dan alasan neraca saldo tidak membaca saldo tersimpan.
- Paginasi tabel pada komponen `DataTable` melalui prop `paginate`, beserta
  komponen `Pagination` dan fungsi murni `buildPages` pada `src/lib/pagination.ts`.
  Diaktifkan pada Transaksi (25 baris per halaman) dan Buku Besar (50 baris per
  halaman); tabel pendek seperti Chart of Accounts sengaja dibiarkan utuh.
  Ukuran halaman dapat diubah pengguna ke 10, 25, 50, atau 100 baris.
- Gulir menegak dengan kepala tabel melekat (`sticky`) melalui prop
  `maxBodyHeight`, dipakai pada Transaksi, Buku Besar, serta kedua tabel panjang
  pada halaman Sentinel, sehingga tombol tindakan di bawah tabel tidak terdorong
  keluar layar.
- Kelas `.scroll-ledger` pada `src/styles/index.css`: batang gulir bergaya
  Editorial Brutalism yang mengambil warna dari token tema, ditulis untuk
  Firefox maupun Chromium/WebKit.
- Enam uji untuk `buildPages`, mencakup pemotongan elipsis di kedua sisi dan
  jaminan halaman aktif selalu dapat dijangkau langsung (127 menjadi 133 uji).

### Changed

- Data contoh kini dimuat otomatis sekali jalan pada pemasangan baru, saat buku
  besar masih benar-benar kosong. Sebelumnya pemuatan hanya dapat dipicu manual,
  sehingga kunjungan pertama selalu menampilkan dasbor bernilai nol seluruhnya.
  Pemuatan otomatis tetap melewati pengguna yang pernah menjalankan Reset
  Seluruh Data, melalui penanda `fintrack:settings:demo_opt_out`, agar tombol
  reset tetap bermakna.
- [20_DATABASE.md](20_DATABASE.md) seksi 10.1 dan [18_INSTALLATION.md](18_INSTALLATION.md)
  seksi 6 disesuaikan dengan perilaku pemuatan otomatis tersebut.
- [07_MASTER_CHECKLIST.md](07_MASTER_CHECKLIST.md): butir penerapan Cloudflare
  Pages ditandai selesai; seluruh 61 butir checklist kini tuntas.

### Fixed

- Nomor versi pada footer dan halaman Pengaturan sebelumnya ditulis tetap
  sebagai 0.1.0 sehingga tertinggal dari rilis sesungguhnya. Keduanya kini
  membaca konstanta `__APP_VERSION__` yang disuntikkan saat build dari
  `package.json`, menjadikan berkas tersebut sumber kebenaran tunggal.

## [0.4.0] - 2026-09-19

### Added

- Modul data contoh (`src/repositories/demoData.ts`) berisi 30 transaksi
  peragaan sebuah agensi perangkat lunak sepanjang kurang lebih empat bulan.
  Seluruh transaksi diposting melalui `postTransaction`, bukan ditulis langsung
  ke penyimpanan, sehingga tetap tunduk pada invarian debit sama dengan kredit,
  rantai hash SHA-256, dan alokasi sequence monotonic.
- Panel "Data Contoh" pada halaman Pengaturan untuk memuat data peragaan sekali
  jalan, dengan penanda status dan penjelasan cara mengulanginya lewat Reset.
- Uji data contoh (10 pengujian) yang memverifikasi idempotensi, keseimbangan
  debit-kredit, keutuhan rantai hash, persamaan neraca, terisinya bucket umur
  piutang, serta munculnya ghost expense dan pasangan duplikat.

### Changed

- Jumlah pengujian otomatis naik dari 114 menjadi 124 pada tujuh berkas uji.

## [0.3.0] - 2026-09-19

### Added

- Halaman Sentinel Kebocoran Kas sebagai rumah utama temuan umur piutang dan
  ghost expense, lengkap dengan rute dan butir navigasi.
- Konfigurasi ESLint dan Prettier beserta skrip `lint`, `format`, dan `verify`.
- Uji repository dan unit-of-work (26 pengujian), termasuk pembuktian rollback
  penuh saat flush gagal di tengah.
- Uji sentinel (27 pengujian) mencakup batas bucket umur piutang, jendela
  duplikat 48 jam, dan ambang ghost expense.
- Uji penerimaan alur UAT-01 sampai UAT-06 (9 pengujian).
- Tolok ukur performa terpisah (`npm run test:perf`) dengan konfigurasi
  `vitest.perf.config.ts`.
- Panduan instalasi dan penerapan Cloudflare Pages (`18_INSTALLATION.md`).
- Hasil uji penerimaan (`uat/2026-09-19_smoke-test-mvp.md`).

### Changed

- Target NFR-002 direvisi dari 10.000 menjadi 6.000 baris ledger setelah
  pengukuran menunjukkan kuota `localStorage` habis pada sekitar 7.464 baris.
- Roadmap: milestone v0.1 sampai v0.9 berstatus selesai, v1.0 sedang berjalan.
- Master checklist: 59 dari 61 butir selesai; sisanya commit awal dan penerapan
  produksi yang menunggu instruksi pemilik proyek.

### Fixed

- Wadah tabel yang dapat digeser kini dapat difokuskan papan ketik
  (`role="region"` dan `tabIndex`), sebelumnya tidak terjangkau tanpa tetikus.
- Pengelolaan fokus pada panel menu mobile: fokus masuk saat dibuka dan kembali
  ke pemicu saat ditutup.
- Penanda BOM pada ekspor CSV ditulis sebagai escape `﻿`, sebelumnya
  karakter mentah yang terdeteksi sebagai spasi tak lazim.

### Security

- Tidak ada.

## [0.2.0] - 2026-09-19

### Added

- Scaffolding aplikasi: Vite 5, React 18, TypeScript strict, Tailwind CSS 3,
  React Router 6, Vitest dengan lingkungan jsdom.
- Lapisan penyimpanan `localStorage` bernamespace `fintrack:v1:*` beserta
  unit-of-work dengan snapshot dan rollback (`src/repositories/`).
- Seed Chart of Accounts lima digit dan kategori bawaan.
- Kernel akuntansi berpasangan: posting rules INCOME, EXPENSE, TRANSFER, dan
  DEBT_PAYMENT; penegakan invarian `SUM(debit) - SUM(credit) = 0`; pola
  reversal dengan penandaan `VOID`; idempotensi berbasis `clientTxId`.
- Perantaian hash SHA-256 melalui Web Crypto API dengan genesis hash serta
  verifikasi rantai penuh.
- Laporan Laba Rugi multi-step, Neraca, Arus Kas metode langsung, dan Buku
  Besar dengan penyaringan akun, tanggal, dan tipe entri.
- Cash Leakage Sentinel: umur piutang, deteksi pengeluaran ganda pada jendela
  48 jam, dan penandaan pengeluaran tanpa bukti di atas Rp 1.000.000.
- Antarmuka lengkap: Dashboard, Transaksi, Buku Besar, Laporan, Akun, dan
  Pengaturan, mengikuti sistem desain pada `23_DESIGN.md`.
- Ekspor cadangan JSON, impor cadangan, ekspor CSV per laporan, dan reset data.
- Mode terang/gelap dengan preferensi tersimpan lokal dan skrip anti-kedip.
- Konfigurasi penerapan Cloudflare Pages (`public/_redirects`).
- Uji unit Vitest: 52 pengujian pada kernel, pelaporan, dan pustaka bantu.

### Changed

- Arsitektur penyimpanan dialihkan dari PostgreSQL ke `localStorage`; seluruh
  simpangan terhadap spesifikasi awal dicatat pada `11_DECISIONS.md`.

## [0.1.0] - 2026-09-19

### Added

- Dokumentasi tata kelola awal proyek: Project Charter, PRD, FRD, TRD.
- Rencana implementasi lima fase (`06_IMPLEMENTATION_PLAN.md`) mencakup
  Scaffolding, Persistence Layer, Accounting Kernel, Reporting & Sentinel,
  serta UI Lengkap & Deploy.
- Checklist eksekusi induk (`07_MASTER_CHECKLIST.md`) untuk seluruh fase.
- Roadmap milestone v0.1 sampai v1.0 beserta rencana pasca-v1
  (`08_ROADMAP.md`).
- Risk register mencakup risiko kuota penyimpanan, kehilangan data,
  ketiadaan otentikasi/enkripsi, integritas hash sisi klien, ketiadaan
  multi-device, kesalahan pemetaan akun, performa, dan ketergantungan
  perangkat tunggal (`10_RISK_REGISTER.md`).
- Delapan Architecture Decision Record (ADR-001 sampai ADR-008) yang mencatat
  penyempitan scope dari spesifikasi PostgreSQL/Redis/backend ke arsitektur
  klien-saja berbasis `localStorage` (`11_DECISIONS.md`).
- Strategi uji mencakup piramida uji, kasus uji wajib kernel akuntansi, uji
  manual UI, dan kriteria rilis (`12_TEST_STRATEGY.md`).
- Glosarium istilah akuntansi dan teknis proyek (`13_GLOSSARY.md`).
- Matriks keterlusuran kebutuhan fungsional ke kebutuhan teknis, fase, dan
  modul kode (`19_REQUIREMENTS_TRACEABILITY.md`).
- Panduan setup pengembang dan prosedur deploy ke Cloudflare Pages
  (`17_DEVELOPER_SETUP.md`).
- Indeks dokumen (`README.md`) untuk seluruh berkas di `docs/`.
- Rencana scaffolding proyek Vite + React 18 + TypeScript + Tailwind CSS
  (belum diimplementasikan pada versi ini; lihat Fase 0 pada
  `06_IMPLEMENTATION_PLAN.md`).

### Changed

- Tidak ada.

### Deprecated

- Tidak ada.

### Removed

- Tidak ada.

### Fixed

- Tidak ada.

### Security

- Tidak ada.

## Referensi

- [06_IMPLEMENTATION_PLAN.md](06_IMPLEMENTATION_PLAN.md)
- [08_ROADMAP.md](08_ROADMAP.md)
