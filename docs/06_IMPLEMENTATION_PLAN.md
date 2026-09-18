# Implementation Plan — FinTrack Core

> Status: Final
> Terakhir diperbarui: 2026-09-19
> Pemilik: Office of the CTO

Rencana ini menerjemahkan [04_TRD.md](04_TRD.md) dan [22_ACCOUNTING_SPEC.md](22_ACCOUNTING_SPEC.md)
menjadi lima fase berurutan. Setiap fase bergantung pada keluaran fase sebelumnya
dan tidak boleh dimulai sebelum kriteria selesai fase sebelumnya terpenuhi.

## Fase 0 — Scaffolding

**Tujuan:** Menyiapkan kerangka proyek Vite + React 18 + TypeScript + Tailwind
beserta token desain, routing, dan layout shell dasar.

**Keluaran:**
- Proyek Vite dapat dijalankan (`npm run dev`) dan dibangun (`npm run build`).
- Konfigurasi TypeScript strict mode.
- Tailwind terpasang dengan token desain sesuai [24_DESIGN_TOKEN.md](24_DESIGN_TOKEN.md).
- Struktur routing React Router 6 dengan rute placeholder (Dashboard, Quick Entry,
  Laporan, Buku Besar, Settings).
- Layout shell (header, navigasi, area konten) sesuai [23_DESIGN.md](23_DESIGN.md).

**File yang disentuh:**
`package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`,
`src/main.tsx`, `src/App.tsx`, `src/routes/*`, `src/styles/tokens.css`,
`src/layout/AppShell.tsx`.

**Dependensi:** Tidak ada (fase awal).

**Kriteria selesai:**
- `npm run dev` menampilkan layout shell tanpa galat konsol.
- `npm run build` sukses menghasilkan `dist/`.
- Navigasi antar rute placeholder berfungsi.

---

## Fase 1 — Persistence Layer

**Tujuan:** Membangun lapisan persistensi `localStorage` sesuai TR-001, TR-002,
TR-007, TR-008, TR-010 pada [04_TRD.md](04_TRD.md).

**Keluaran:**
- Adapter `localStorage` dengan namespace kunci `fintrack:v1:*`.
- Repository per koleksi (accounts, categories, transactions, ledger_entries, meta).
- Unit-of-work: kumpulkan mutasi di memori, validasi, flush berurutan, rollback
  ke snapshot bila gagal.
- Seed Chart of Accounts 5 digit otomatis pada inisialisasi pertama.
- Mekanisme migrasi skema data (`schema_version` pada meta) untuk versi mendatang.
- Pemantauan kuota `localStorage` dengan peringatan pada ambang 80%.

**File yang disentuh:**
`src/data/storageAdapter.ts`, `src/data/repositories/*.ts`,
`src/data/unitOfWork.ts`, `src/data/seed/chartOfAccounts.ts`,
`src/data/migrations/*.ts`, `src/data/quotaMonitor.ts`.

**Dependensi:** Fase 0 selesai.

**Kriteria selesai:**
- Repository hanya diakses melalui lapisan ini, tidak ada akses `localStorage`
  langsung dari komponen React (diverifikasi lint/grep).
- Unit-of-work pulih ke snapshot sebelumnya saat simulasi flush gagal (uji Vitest).
- CoA ter-seed otomatis dan kode akun unik ditegakkan.
- Uji Vitest untuk repository dan unit-of-work lulus.

---

## Fase 2 — Accounting Kernel

**Tujuan:** Mengimplementasikan mesin double-entry immutable sesuai TR-003
sampai TR-008 dan [22_ACCOUNTING_SPEC.md](22_ACCOUNTING_SPEC.md).

**Keluaran:**
- Posting rules: konversi transaksi (`INCOME`, `EXPENSE`, `TRANSFER`,
  `DEBT_PAYMENT`) menjadi baris ledger debit/kredit.
- Penegakan invarian `SUM(debit) - SUM(credit) = 0`, melempar
  `LedgerImbalanceError` bila gagal.
- Hash chaining SHA-256 (`prev_hash`, `entry_hash`) via Web Crypto API.
- Reversal pattern: pasangan reversing entries, status `VOID` pada transaksi asal.
- Sequence number global monotonic tersimpan pada meta terpisah.
- Idempotensi lokal berbasis `client_tx_id`.

**File yang disentuh:**
`src/domain/kernel.ts`, `src/domain/postingRules.ts`, `src/domain/hashChain.ts`,
`src/domain/reversal.ts`, `src/domain/sequence.ts`, `src/domain/errors.ts`.

**Dependensi:** Fase 1 selesai (repository dan unit-of-work tersedia).

**Kriteria selesai:**
- Seluruh kasus uji wajib pada [12_TEST_STRATEGY.md](12_TEST_STRATEGY.md)
  bagian kernel akuntansi lulus.
- Transaksi dengan delta bukan nol ditolak seluruhnya (tidak ada penulisan parsial).
- Ledger tidak memiliki operasi `update`/`delete`, hanya `append` dan `read`.
- Verifikasi rantai hash lulus pada dataset uji sintetis.

---

## Fase 3 — Reporting & Sentinel

**Tujuan:** Membangun mesin laporan keuangan dan Cash Leakage Sentinel sesuai
FR-020 sampai FR-033.

**Keluaran:**
- Laporan Laba Rugi multi-step, Neraca (dengan penegakan
  `Aset = Liabilitas + Ekuitas`), Arus Kas direct method.
- Buku Besar dengan filter akun, rentang tanggal, tipe entri.
- Aging Receivables Sentinel (bucket 0–29, 30–59, 60–89, 90+).
- Duplicate Outflow Prevention (nominal identik, vendor/deskripsi sama, 48 jam).
- Ghost Expense Tagging (pengeluaran > Rp 1.000.000 tanpa bukti bayar).
- Index in-memory (`Map`) untuk ledger per akun dan transaksi per periode (TR-009).

**File yang disentuh:**
`src/domain/reports/profitLoss.ts`, `src/domain/reports/balanceSheet.ts`,
`src/domain/reports/cashFlow.ts`, `src/domain/reports/ledgerView.ts`,
`src/domain/sentinel/agingReceivables.ts`, `src/domain/sentinel/duplicateOutflow.ts`,
`src/domain/sentinel/ghostExpense.ts`, `src/data/indexes.ts`.

**Dependensi:** Fase 2 selesai (data ledger valid dan konsisten tersedia).

**Kriteria selesai:**
- Seluruh laporan menghasilkan angka yang konsisten dengan data ledger uji.
- Waktu render laporan di bawah 500 ms pada 10.000 baris ledger (NFR-002).
- Sentinel menghasilkan peringatan sesuai kasus uji pada
  [12_TEST_STRATEGY.md](12_TEST_STRATEGY.md).

---

## Fase 4 — UI Lengkap & Deploy

**Tujuan:** Melengkapi antarmuka pengguna penuh dan menyiapkan deployment ke
Cloudflare Pages.

**Keluaran:**
- Dashboard (saldo akun, ringkasan arus kas, ringkasan sentinel).
- Form Quick Entry (maksimal 4 field wajib).
- Halaman laporan (P&L, Neraca, Arus Kas, Buku Besar) dan halaman Sentinel.
- Halaman Settings (kelola akun, kategori, tema, ekspor/impor data).
- Ekspor JSON penuh dan CSV per laporan; impor dari JSON hasil ekspor.
- Mode terang/gelap mengikuti `prefers-color-scheme` dengan preferensi tersimpan.
- Konfigurasi build produksi dan `public/_redirects` untuk SPA fallback.
- Deployment ke Cloudflare Pages.

**File yang disentuh:**
`src/pages/Dashboard.tsx`, `src/pages/QuickEntry.tsx`, `src/pages/reports/*.tsx`,
`src/pages/Sentinel.tsx`, `src/pages/Settings.tsx`, `src/data/exportImport.ts`,
`src/theme/useTheme.ts`, `public/_redirects`, `wrangler.toml` (bila digunakan).

**Dependensi:** Fase 0–3 selesai.

**Kriteria selesai:**
- Seluruh user story pada [01_PRD.md](01_PRD.md) dapat didemonstrasikan end-to-end.
- `npm run build` lolos, ukuran bundel di bawah 300 KB gzip (NFR-004).
- Aplikasi ter-deploy dan dapat diakses via URL Cloudflare Pages.
- Uji manual UI pada [12_TEST_STRATEGY.md](12_TEST_STRATEGY.md) lulus pada
  lebar 375px, 768px, 1024px, 1440px.

## Referensi

- [07_MASTER_CHECKLIST.md](07_MASTER_CHECKLIST.md) — checklist eksekusi per fase
- [08_ROADMAP.md](08_ROADMAP.md) — milestone rilis
- [12_TEST_STRATEGY.md](12_TEST_STRATEGY.md) — strategi uji
