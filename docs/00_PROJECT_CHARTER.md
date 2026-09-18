# Project Charter — FinTrack Core

> Status: Final
> Terakhir diperbarui: 2026-09-19
> Pemilik: Gio (Executive Sponsor)

## 1. Visi

Menyediakan aplikasi pencatatan keuangan yang secepat catatan single-entry di
sisi pengguna, namun seakurat pembukuan double-entry di sisi mesin, sehingga
UMKM dan profesional dapat menghasilkan laporan keuangan yang layak audit tanpa
memahami akuntansi.

## 2. Problem Statement

Kompleksitas akuntansi double-entry membuat pengguna enggan mencatat,
sedangkan simplisitas single-entry merusak akurasi dan integritas laporan audit.

## 3. Tujuan

| ID  | Tujuan                           | Ukuran                                                    |
| --- | -------------------------------- | --------------------------------------------------------- |
| G-1 | Pencatatan transaksi ultra-cepat | < 3 detik per transaksi, P99 interaksi lokal < 16 ms      |
| G-2 | Integritas ledger absolut        | `SUM(Debit) - SUM(Credit) = 0` pada 100% transaksi        |
| G-3 | Laporan keuangan instan          | P&L, Neraca, Arus Kas ter-generate < 500 ms               |
| G-4 | Deteksi kebocoran kas            | Aging receivables, duplicate outflow, ghost expense aktif |

## 4. Scope

### In Scope (v1.0)

- Pencatatan transaksi: Pemasukan, Pengeluaran, Transfer Antar Akun, Pembayaran Utang.
- Accounting Kernel double-entry dengan penegakan matematis dan hash chaining.
- Chart of Accounts standar 5 digit (ASSET/LIABILITY/EQUITY/REVENUE/COGS/OPEX).
- Cash Leakage Sentinel: aging receivables, duplicate outflow, ghost expense.
- Laporan: Laba Rugi multi-step, Neraca, Arus Kas (direct method), Buku Besar.
- Reversal pattern untuk koreksi (tanpa mutasi baris ledger).
- Persistensi lokal berbasis `localStorage`, offline-first penuh.
- Ekspor data JSON/CSV.
- Aplikasi web React yang dapat di-deploy ke Cloudflare Pages.

### Out of Scope (v1.0)

- Backend API, PostgreSQL, PgBouncer, Redis.
- Delta synchronization multi-device (HLC, watermark sequence).
- Autentikasi multi-user, JWT, refresh token.
- Integrasi API bank untuk rekonsiliasi otomatis (v1 hanya impor CSV manual).
- Aplikasi mobile native (Flutter / React Native).

Lihat [11_DECISIONS.md](11_DECISIONS.md) untuk alasan penyempitan scope.

## 5. Stakeholder

| Peran                  | Pihak             | Tanggung Jawab                   |
| ---------------------- | ----------------- | -------------------------------- |
| Executive Sponsor      | Gio (Holding CEO) | Persetujuan scope dan prioritas  |
| Coordinating Authority | Chief of Staff    | Koordinasi lintas workstream     |
| Office of the CFO      | CFO               | Spesifikasi akuntansi dan CoA    |
| Office of the CTO      | CTO               | Arsitektur teknis dan model data |

## 6. Kriteria Sukses

1. Tidak ada satu pun transaksi tersimpan dengan delta debit-kredit bukan nol.
2. Verifikasi rantai hash ledger lulus 100% pada dataset uji 10.000 entri.
3. Semua koreksi terjadi melalui reversal, nol operasi `UPDATE`/`DELETE` pada ledger.
4. Aplikasi berfungsi penuh tanpa koneksi jaringan.
5. `npm run build` lolos dan artefak dapat di-deploy ke Cloudflare Pages.

## 7. Referensi

- [01_PRD.md](01_PRD.md) — kebutuhan produk
- [04_TRD.md](04_TRD.md) — kebutuhan teknis
- [05_ARCHITECTURE.md](05_ARCHITECTURE.md) — arsitektur sistem
