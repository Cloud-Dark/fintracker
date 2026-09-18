# Product Requirements Document — FinTrack Core

> Status: Final
> Terakhir diperbarui: 2026-09-19
> Pemilik: Product Office

## 1. Problem

Pemilik usaha kecil menghadapi dilema: akuntansi double-entry terlalu kompleks
untuk dicatat harian, sementara pencatatan single-entry tidak menghasilkan
laporan yang akurat maupun dapat diaudit.

## 2. Core Thesis

FinTrack Core memisahkan dua lapisan:

- **Layer Pengguna (UI/UX)** — abstraksi single-entry ultra-cepat.
- **Accounting Kernel** — double-entry immutable dengan penegakan matematis.

Pengguna tidak pernah melihat istilah debit/kredit kecuali membuka Buku Besar.

## 3. Target Persona

### Persona 1 — Solopreneur & Pemilik Bisnis Jasa

- **Profil:** agency, konsultan, freelancer dengan 1–10 klien aktif.
- **Pain point:** kas pribadi dan bisnis tercampur, piutang macet tidak terpantau,
  margin proyek bocor karena biaya tak terduga.
- **Kebutuhan:** deteksi kebocoran kas (aging receivables alert), tracking gross
  margin proyek minimal 70%, laporan laba rugi instan.

### Persona 2 — Owner UMKM Ritel / F&B

- **Profil:** warung, kafe, toko ritel dengan volume transaksi harian tinggi.
- **Pain point:** sinyal internet tidak stabil di lokasi usaha, butuh rekonsiliasi
  kas riil vs pencatatan di akhir hari.
- **Kebutuhan:** offline-first recording tanpa hambatan jaringan, pencocokan kas
  kasir, ekspor laporan standar perbankan/pajak.

## 4. Fitur (Prioritas MoSCoW)

| ID | Fitur | Prioritas | Persona |
|---|---|---|---|
| F-01 | Quick Entry transaksi (4 atribut) | Must | 1, 2 |
| F-02 | Accounting Kernel double-entry otomatis | Must | 1, 2 |
| F-03 | Chart of Accounts 5 digit + kelola akun | Must | 1, 2 |
| F-04 | Dashboard saldo & ringkasan arus kas | Must | 1, 2 |
| F-05 | Buku Besar (ledger viewer) + filter akun | Must | 1 |
| F-06 | Laporan Laba Rugi multi-step | Must | 1, 2 |
| F-07 | Laporan Neraca | Must | 1 |
| F-08 | Laporan Arus Kas (direct method) | Must | 1, 2 |
| F-09 | Reversal transaksi (koreksi) | Must | 1, 2 |
| F-10 | Aging Receivables Sentinel (30/60/90) | Should | 1 |
| F-11 | Duplicate Outflow Prevention (48 jam) | Should | 1, 2 |
| F-12 | Ghost Expense Tagging (di atas Rp 1.000.000) | Should | 1, 2 |
| F-13 | Kelola kategori (income/expense, hierarkis) | Should | 1, 2 |
| F-14 | Verifikasi integritas rantai hash ledger | Should | 1 |
| F-15 | Ekspor JSON / CSV | Should | 1, 2 |
| F-16 | Rekonsiliasi bank via impor CSV | Could | 2 |
| F-17 | Mode gelap / terang | Could | 1, 2 |
| F-18 | Sinkronisasi multi-perangkat | Tidak untuk v1 | — |

## 5. User Story

| ID | Story | Acceptance Criteria |
|---|---|---|
| US-001 | Sebagai pemilik usaha, saya mencatat pengeluaran hanya dengan nominal, akun, dan kategori, agar pencatatan selesai di bawah 3 detik. | Form Quick Entry punya maksimal 4 field wajib; submit menghasilkan minimal 2 baris ledger yang seimbang. |
| US-002 | Sebagai pemilik usaha, saya melihat saldo seluruh akun kas secara real-time di dashboard. | Saldo tiap akun sama dengan akumulasi debit-kredit ledger untuk akun tersebut. |
| US-003 | Sebagai pemilik usaha, saya mengoreksi transaksi salah tanpa menghapus riwayat. | Aksi koreksi menerbitkan pasangan reversing entries; transaksi asal berstatus `VOID`; baris ledger asal tetap utuh. |
| US-004 | Sebagai konsultan, saya diberi peringatan saat piutang melewati 30/60/90 hari. | Sentinel menampilkan daftar piutang per tingkat umur dengan total nominal. |
| US-005 | Sebagai pemilik usaha, saya melihat laporan laba rugi periode berjalan tanpa menunggu. | Laporan ter-render di bawah 500 ms dan menampilkan Pendapatan, HPP, Laba Kotor, OPEX, Laba Bersih. |
| US-006 | Sebagai pemilik ritel, saya tetap dapat mencatat saat internet mati. | Seluruh operasi berjalan pada penyimpanan lokal tanpa permintaan jaringan. |
| US-007 | Sebagai auditor internal, saya memverifikasi bahwa buku besar tidak dimanipulasi. | Tombol verifikasi memeriksa rantai SHA-256 dan melaporkan entri pertama yang rusak bila ada. |

## 6. Metrik Sukses

| Metrik | Target |
|---|---|
| Waktu pencatatan satu transaksi | Di bawah 3 detik |
| Latensi interaksi lokal (P99) | Di bawah 16 ms |
| Transaksi tidak seimbang | 0 |
| Integritas rantai hash | 100% lolos |
| Waktu render laporan | Di bawah 500 ms pada 10.000 entri |

## 7. Referensi

- [03_FRD.md](03_FRD.md) — kebutuhan fungsional ber-ID
- [04_TRD.md](04_TRD.md) — kebutuhan teknis
- [22_ACCOUNTING_SPEC.md](22_ACCOUNTING_SPEC.md) — spesifikasi akuntansi
