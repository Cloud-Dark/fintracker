# Master Checklist — FinTrack Core

> Status: Final
> Terakhir diperbarui: 2026-09-19
> Pemilik: Office of the CTO

Checklist eksekusi turunan dari [06_IMPLEMENTATION_PLAN.md](06_IMPLEMENTATION_PLAN.md).
Centang setiap item saat selesai dan diverifikasi.

## Fase 0 — Scaffolding

- [x] Inisialisasi proyek Vite dengan template React + TypeScript
- [x] Aktifkan TypeScript strict mode pada `tsconfig.json`
- [x] Pasang dan konfigurasi Tailwind CSS 3
- [x] Buat berkas token desain (`src/styles/tokens.css`) sesuai 24_DESIGN_TOKEN.md
- [x] Pasang React Router 6 dan definisikan struktur rute
- [x] Buat halaman placeholder: Dashboard, Quick Entry, Laporan, Buku Besar, Settings
- [x] Buat komponen `AppShell` (header, navigasi, area konten)
- [x] Konfigurasi ESLint dan Prettier sesuai konvensi proyek
- [x] Verifikasi `npm run dev` berjalan tanpa galat konsol
- [x] Verifikasi `npm run build` menghasilkan `dist/` tanpa galat
- [x] Tambahkan `.gitignore` untuk `node_modules`, `dist`, berkas lokal
- [x] Commit awal scaffolding dengan pesan yang jelas; riwayat didorong ke
      remote `origin/main` pada 2026-09-19

## Fase 1 — Persistence Layer

- [x] Implementasi `storageAdapter.ts` dengan namespace `fintrack:v1:*`
- [x] Implementasi repository `accounts`
- [x] Implementasi repository `categories`
- [x] Implementasi repository `transactions`
- [x] Implementasi repository `ledger_entries` (hanya `append` dan `read`)
- [x] Implementasi repository `meta` (sequence, schema_version, hash genesis)
- [x] Implementasi `unitOfWork.ts` dengan validasi dan rollback snapshot
- [x] Implementasi seed Chart of Accounts 5 digit otomatis
- [x] Implementasi mekanisme migrasi skema (`schema_version`)
- [x] Implementasi pemantauan kuota dengan peringatan ambang 80%
      (diwujudkan sebagai `estimateUsage()` pada `storage.ts` ditambah panel
      peringatan di halaman Pengaturan, bukan modul `quotaMonitor.ts` terpisah)
- [x] Tulis uji Vitest untuk seluruh repository
- [x] Tulis uji Vitest untuk rollback unit-of-work saat flush gagal
- [x] Verifikasi tidak ada akses `localStorage` langsung di luar lapisan data

## Fase 2 — Accounting Kernel

- [x] Implementasi posting rules untuk `INCOME`
- [x] Implementasi posting rules untuk `EXPENSE`
- [x] Implementasi posting rules untuk `TRANSFER`
- [x] Implementasi posting rules untuk `DEBT_PAYMENT`
- [x] Implementasi penegakan invarian `SUM(debit) - SUM(credit) = 0`
- [x] Implementasi `LedgerImbalanceError` dan pembatalan penuh saat delta bukan nol
- [x] Implementasi hash chaining SHA-256 via Web Crypto API
- [x] Implementasi genesis hash (64 karakter nol) untuk entri pertama
- [x] Implementasi reversal pattern (reversing entries + status `VOID`)
- [x] Implementasi sequence number global monotonic
- [x] Implementasi idempotensi berbasis `client_tx_id`
- [x] Tulis uji Vitest kernel: keseimbangan debit-kredit, reversal, hash chain,
      sequence monotonic

## Fase 3 — Reporting & Sentinel

- [x] Implementasi index in-memory (`Map`) ledger per akun
- [x] Implementasi index in-memory transaksi per periode
- [x] Implementasi laporan Laba Rugi multi-step
- [x] Implementasi laporan Neraca dengan penegakan `Aset = Liabilitas + Ekuitas`
- [x] Implementasi laporan Arus Kas direct method
- [x] Implementasi tampilan Buku Besar dengan filter akun/tanggal/tipe entri
- [x] Implementasi Aging Receivables Sentinel (bucket 0–29/30–59/60–89/90+)
- [x] Implementasi Duplicate Outflow Prevention (48 jam)
- [x] Implementasi Ghost Expense Tagging (> Rp 1.000.000 tanpa bukti)
- [x] Implementasi verifikasi rantai hash penuh (FR-040)
- [x] Tulis uji Vitest untuk seluruh laporan
- [x] Verifikasi waktu render laporan di bawah 500 ms pada 6.000 baris ledger
      (target 10.000 direvisi; batas kuota nyata tercatat pada R-009)

## Fase 4 — UI Lengkap & Deploy

- [x] Implementasi halaman Dashboard (saldo, ringkasan arus kas, sentinel)
- [x] Implementasi form Quick Entry (maksimal 4 field wajib)
- [x] Implementasi halaman laporan P&L, Neraca, Arus Kas, Buku Besar
- [x] Implementasi halaman Sentinel (aging, duplicate, ghost expense)
- [x] Implementasi halaman Settings (kelola akun dan kategori)
- [x] Implementasi ekspor JSON penuh dan CSV per laporan
- [x] Implementasi impor dari JSON hasil ekspor
- [x] Implementasi mode terang/gelap dengan preferensi tersimpan lokal
- [x] Verifikasi aksesibilitas (label, peran ARIA, fokus, reduced-motion) — bersifat
      struktural; audit peramban nyata masih terbuka (lihat UAT temuan T-03)
- [x] Verifikasi responsif pada 375px, 768px, 1024px, 1440px
- [x] Konfigurasi `public/_redirects` untuk SPA fallback
- [ ] Deploy ke Cloudflare Pages dan verifikasi URL aktif (panduan siap pada
      [18_INSTALLATION.md](18_INSTALLATION.md); menunggu instruksi pemilik proyek)

## Referensi

- [06_IMPLEMENTATION_PLAN.md](06_IMPLEMENTATION_PLAN.md)
- [08_ROADMAP.md](08_ROADMAP.md)
