# Changelog — FinTrack Core

> Status: Final
> Terakhir diperbarui: 2026-09-19
> Pemilik: Office of the CTO

Format mengikuti [Keep a Changelog](https://keepachangelog.com/), dan proyek ini
mengikuti [Semantic Versioning](https://semver.org/) sejauh berlaku untuk aplikasi
klien statis.

## [Unreleased]

Belum ada perubahan tercatat sejak 0.2.0.

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
