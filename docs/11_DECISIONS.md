# Architecture Decision Records — FinTrack Core

> Status: Final
> Terakhir diperbarui: 2026-09-19
> Pemilik: Office of the CTO

Spesifikasi asli ([01_PRD.md](01_PRD.md) bagian 4, mengutip dokumen PRD sumber)
meminta PostgreSQL 16, Redis, backend stateless, dan delta sync. Pemilik proyek
(lihat [00_PROJECT_CHARTER.md](00_PROJECT_CHARTER.md)) memutuskan penyempitan
scope menjadi SPA React murni, offline-only, deploy Cloudflare Pages. ADR berikut
mencatat setiap keputusan penyimpangan beserta konsekuensinya.

## ADR-001 — `localStorage` menggantikan PostgreSQL 16

**Tanggal:** 2026-09-19

**Keputusan:** Persistensi data menggunakan `localStorage` browser melalui
lapisan repository, menggantikan PostgreSQL 16 sebagai database relasional pusat.

**Konteks:** Spesifikasi awal mensyaratkan PostgreSQL 16 dengan ACID penuh dan
ledger append-only di tingkat database. Pemilik proyek menetapkan aplikasi
berjalan sebagai SPA statis tanpa backend, dideploy ke Cloudflare Pages.

**Alternatif ditolak:**

- PostgreSQL 16 terkelola (butuh backend dan infrastruktur server).
- SQLite via WASM (menambah kompleksitas dan ukuran bundel, di luar kebutuhan
  v1 dengan volume data kecil per pengguna).
- IndexedDB (lebih kompleks dari `localStorage` untuk kebutuhan v1; dapat
  dipertimbangkan ulang bila volume data melampaui kapasitas `localStorage`).

**Konsekuensi:**

- Tidak ada transaksi database native; diperlukan emulasi unit-of-work (TR-002).
- Tidak ada multi-user, multi-device secara inheren (lihat R-005, R-008 pada
  [10_RISK_REGISTER.md](10_RISK_REGISTER.md)).
- Kapasitas data dibatasi kuota `localStorage` (~5 MB), lihat R-001.

## ADR-002 — Trigger immutability DB digantikan penegakan di service layer

**Tanggal:** 2026-09-19

**Keputusan:** Larangan `UPDATE`/`DELETE` pada `ledger_entries`, yang pada
spesifikasi awal ditegakkan oleh trigger PostgreSQL (`prevent_ledger_tampering`),
digantikan penegakan di lapisan repository TypeScript yang hanya mengekspos
operasi `append` dan `read` (TR-004).

**Konteks:** Tanpa database server, tidak ada mekanisme trigger tingkat basis
data yang dapat ditegakkan secara independen dari kode klien.

**Alternatif ditolak:**

- Membekukan objek JavaScript (`Object.freeze`) sebagai satu-satunya proteksi —
  tidak mencegah manipulasi `localStorage` langsung dari DevTools, sehingga
  tetap dikombinasikan dengan hash chaining (ADR-003).

**Konsekuensi:**

- Immutability hanya berlaku selama aplikasi diakses melalui antarmuka resmi;
  manipulasi langsung `localStorage` dari DevTools tetap dimungkinkan (lihat
  R-004 pada [10_RISK_REGISTER.md](10_RISK_REGISTER.md)).
- Hash chaining menjadi lapisan deteksi kedua untuk mengungkap manipulasi.

## ADR-003 — Hash chaining SHA-256 dipertahankan via Web Crypto API

**Tanggal:** 2026-09-19

**Keputusan:** Mekanisme hash chaining SHA-256 pada spesifikasi awal
dipertahankan penuh, diimplementasikan menggunakan `crypto.subtle.digest`
bawaan browser (Web Crypto API) tanpa pustaka eksternal (TR-005, TR-011).

**Konteks:** Web Crypto API tersedia native di seluruh browser modern dan
mendukung SHA-256 tanpa dependensi tambahan, sejalan dengan batasan
zero-dependency pada TR-011.

**Alternatif ditolak:**

- Pustaka hashing pihak ketiga (menambah ukuran bundel, melanggar TR-011).
- Menghapus hash chaining sepenuhnya (mengurangi kemampuan deteksi integritas
  yang menjadi salah satu tujuan inti G-2 pada [00_PROJECT_CHARTER.md](00_PROJECT_CHARTER.md)).

**Konsekuensi:**

- Deteksi tamper tetap tersedia untuk audit internal dan kesalahan tidak
  disengaja, dengan batasan yang dicatat pada R-004.

## ADR-004 — Sync delta, Redis idempotency, dan JWT dikeluarkan dari scope v1

**Tanggal:** 2026-09-19

**Keputusan:** Delta synchronization (HLC, watermark sequence), Redis sebagai
lock store idempotency, dan autentikasi JWT/refresh token dikeluarkan dari
scope v1. Idempotensi digantikan pengecekan `client_tx_id` lokal (TR-008).

**Konteks:** Tanpa backend dan tanpa multi-device, kebutuhan sinkronisasi
jaringan dan otentikasi server tidak relevan untuk versi offline-only.

**Alternatif ditolak:**

- Mengimplementasikan sync sebagian (misal hanya push tanpa pull) — dinilai
  menambah kompleksitas tanpa nilai tambah pada v1 single-device.

**Konsekuensi:**

- Tidak ada sinkronisasi multi-perangkat pada v1 (R-005).
- Tidak ada otentikasi/otorisasi pengguna pada v1 (R-003).
- Kedua kemampuan direncanakan pada roadmap pasca-v1, lihat
  [08_ROADMAP.md](08_ROADMAP.md).

## ADR-005 — React SPA menggantikan Flutter/React Native, deploy Cloudflare Pages

**Tanggal:** 2026-09-19

**Keputusan:** Client runtime menggunakan React 18 + TypeScript + Vite sebagai
SPA web, menggantikan Flutter/React Native lintas platform mobile pada
spesifikasi awal, dideploy sebagai situs statis ke Cloudflare Pages.

**Konteks:** Target delivery dipersempit ke web saja sesuai keputusan pemilik
proyek; Cloudflare Pages dipilih sebagai target deploy eksplisit.

**Alternatif ditolak:**

- Flutter/React Native (menambah kompleksitas build lintas platform di luar
  kebutuhan v1 web-only).
- Next.js atau framework server-rendered (tidak diperlukan karena aplikasi
  tanpa backend dan sepenuhnya statis; Vite lebih ringan untuk kasus ini).

**Konsekuensi:**

- Tidak ada aplikasi mobile native pada v1 (lihat scope pada
  [00_PROJECT_CHARTER.md](00_PROJECT_CHARTER.md)).
- Build menghasilkan artefak statis (`dist/`) yang kompatibel dengan hosting
  statis apa pun, tidak terkunci pada Cloudflare Pages secara teknis.

## ADR-006 — Nominal disimpan sebagai integer rupiah utuh

**Tanggal:** 2026-09-19

**Keputusan:** Seluruh nominal transaksi disimpan sebagai `number` bilangan
bulat dalam satuan rupiah utuh, bukan desimal/sen (TR-006).

**Konteks:** Rupiah tidak memiliki subunit yang lazim digunakan dalam transaksi
sehari-hari untuk kasus penggunaan UMKM dan solopreneur target.

**Alternatif ditolak:**

- Menyimpan dalam sen/desimal mengikuti pola `BIGINT` pada skema PostgreSQL
  asli — dipertahankan konsepnya namun disederhanakan ke rupiah utuh karena
  tidak ada kebutuhan sub-rupiah pada domain ini.

**Konsekuensi:**

- Operasi aritmetika pecahan dilarang, menghindari isu presisi floating-point
  JavaScript pada nominal uang.
- Pembulatan (bila diperlukan dari sumber eksternal) dilakukan pada lapisan
  tampilan, bukan pada data tersimpan.

## ADR-007 — Reversal pattern sebagai satu-satunya jalur koreksi

**Tanggal:** 2026-09-19

**Keputusan:** Koreksi transaksi hanya dapat dilakukan melalui reversal
pattern (reversing entries + status `VOID`), tanpa jalur edit langsung.
Ini mempertahankan penuh aturan pada spesifikasi awal.

**Konteks:** Prinsip immutability ledger (G-2, ADR-002) mengharuskan koreksi
tidak pernah memodifikasi baris yang sudah diposting.

**Alternatif ditolak:**

- Mengizinkan edit langsung dengan audit trail terpisah — melanggar prinsip
  append-only dan mempersulit verifikasi hash chain.

**Konsekuensi:**

- UI koreksi harus dirancang agar tidak terasa seperti "edit" bagi pengguna
  awam, meski secara internal berupa reversal + transaksi baru.

## ADR-008 — Design system Editorial Brutalism / Ledger Desk

**Tanggal:** 2026-09-19

**Keputusan:** Antarmuka mengadopsi bahasa desain "Editorial Brutalism /
Ledger Desk" sebagaimana dirinci pada [23_DESIGN.md](23_DESIGN.md) dan
[24_DESIGN_TOKEN.md](24_DESIGN_TOKEN.md).

**Konteks:** Spesifikasi awal tidak menetapkan bahasa desain visual spesifik;
keputusan ini diambil oleh tim desain untuk mendukung persona pengguna yang
membutuhkan keterbacaan data finansial yang tegas dan dapat dipercaya.

**Alternatif ditolak:** _TBD_ — rincian alternatif desain yang dipertimbangkan
belum didokumentasikan; lihat [23_DESIGN.md](23_DESIGN.md) untuk detail lebih
lanjut bila tersedia.

**Konsekuensi:**

- Seluruh komponen UI pada Fase 4 mengikuti token desain terpusat
  ([24_DESIGN_TOKEN.md](24_DESIGN_TOKEN.md)) demi konsistensi visual.

## Referensi

- [00_PROJECT_CHARTER.md](00_PROJECT_CHARTER.md)
- [04_TRD.md](04_TRD.md)
- [10_RISK_REGISTER.md](10_RISK_REGISTER.md)
