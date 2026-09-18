# Spesifikasi Akuntansi — FinTrack Core

> Status: Final
> Terakhir diperbarui: 2026-09-19
> Pemilik: Office of the CTO

Dokumen ini merinci spesifikasi akuntansi FinTrack Core sebagaimana ditetapkan
pada [plan.md](../plan.md) bagian 3, dan dirujuk oleh [01_PRD.md](01_PRD.md),
[03_FRD.md](03_FRD.md), dan [04_TRD.md](04_TRD.md). Implementasi berjalan
sepenuhnya di klien (SPA React + TypeScript, tanpa backend), dengan
persistensi `localStorage` — lihat [04_TRD.md](04_TRD.md) dan
[11_DECISIONS.md](11_DECISIONS.md) untuk penyimpangan dari arsitektur
PostgreSQL/Redis pada spesifikasi awal.

## 1. Model Ledger Hybrid

FinTrack Core memisahkan dua lapisan:

- **Layer Pengguna (Single-Entry):** Pengguna hanya menginput empat atribut —
  tipe mutasi, nominal, akun sumber/tujuan, dan kategori alokasi. Pengguna
  tidak pernah berinteraksi langsung dengan istilah debit/kredit kecuali saat
  membuka Buku Besar (FR-021).
- **Accounting Kernel (Double-Entry):** Setiap input pengguna dikonversi
  secara otomatis oleh kernel domain menjadi minimal dua baris ledger yang
  saling seimbang (`ledger_entries`), mengikuti aturan posting pada bagian 2.

Kernel berjalan sebagai modul domain murni (lihat
[05_ARCHITECTURE.md](05_ARCHITECTURE.md)), tidak bergantung pada React,
dan seluruh baris ledger yang dihasilkannya bersifat immutable — hanya
operasi `append` dan `read` yang diekspos (TR-004).

## 2. Aturan Posting per Tipe Mutasi

Aturan berikut mengikuti [plan.md](../plan.md) bagian 3.1 persis. Setiap baris
tabel merepresentasikan satu baris ledger (`ledger_entries`); satu transaksi
menghasilkan minimal dua baris agar Debit = Credit.

### 2.1 INCOME (Pemasukan)

| Baris | Akun | Sisi | Keterangan |
|---|---|---|---|
| 1 | Akun kas/bank tujuan (mis. `10100`/`10200`/`10300`) | Debit | Aset bertambah |
| 2 | Akun pendapatan sesuai kategori (mis. `40100`/`40200`) | Kredit | Pendapatan bertambah |

### 2.2 EXPENSE (Pengeluaran)

| Baris | Akun | Sisi | Keterangan |
|---|---|---|---|
| 1 | Akun beban/HPP sesuai kategori (mis. `50100`–`50200`, `60100`–`60300`) | Debit | Beban bertambah |
| 2 | Akun kas/bank sumber (mis. `10100`/`10200`/`10300`) | Kredit | Aset berkurang |

### 2.3 TRANSFER (Transfer Antar Akun)

| Baris | Akun | Sisi | Keterangan |
|---|---|---|---|
| 1 | Akun kas/bank penerima | Debit | Aset penerima bertambah |
| 2 | Akun kas/bank pengirim | Kredit | Aset pengirim berkurang |

Transfer tidak menyentuh akun Pendapatan atau Beban; kategori bersifat opsional
(FR-001).

### 2.4 DEBT_PAYMENT (Pembayaran Utang)

| Baris | Akun | Sisi | Keterangan |
|---|---|---|---|
| 1 | `20100` Utang Usaha (atau akun liabilitas terkait) | Debit | Liabilitas berkurang |
| 2 | Akun kas/bank sumber | Kredit | Aset berkurang |

## 3. Chart of Accounts (CoA) 5 Digit

Struktur kode dan daftar akun berikut mengikuti [plan.md](../plan.md) bagian
3.2 secara lengkap dan tidak boleh menyimpang. Kolom **Normal Balance**
menentukan sisi yang menambah saldo akun tersebut.

| Kode | Nama | Tipe | Normal Balance |
|---|---|---|---|
| 10100 | Kas Tunai / Petty Cash | ASSET | DEBET |
| 10200 | Kas di Bank (Operasional & Payroll) | ASSET | DEBET |
| 10300 | E-Wallet / Payment Gateway Escrow | ASSET | DEBET |
| 10400 | Piutang Usaha (Accounts Receivable) | ASSET | DEBET |
| 20100 | Utang Usaha (Accounts Payable) | LIABILITY | KREDIT |
| 20200 | Utang Pajak & Beban Akrual | LIABILITY | KREDIT |
| 30100 | Modal Disetor | EQUITY | KREDIT |
| 30200 | Laba Ditahan (Retained Earnings) | EQUITY | KREDIT |
| 40100 | Pendapatan Operasional / Penjualan | REVENUE | KREDIT |
| 40200 | Pendapatan Non-Operasional / Bunga | REVENUE | KREDIT |
| 50100 | Biaya Pokok Jasa & Subkontraktor | COGS/HPP | DEBET |
| 50200 | Biaya Server & Dedicated Client Infrastructure | COGS/HPP | DEBET |
| 60100 | Gaji & Upah Tim | OPEX | DEBET |
| 60200 | Marketing & Customer Acquisition | OPEX | DEBET |
| 60300 | Software, Cloud Tools & Administrasi | OPEX | DEBET |

Rentang kode:

| Rentang | Tipe | Normal Balance |
|---|---|---|
| 10000–19999 | ASSET | DEBET |
| 20000–29999 | LIABILITY | KREDIT |
| 30000–39999 | EQUITY | KREDIT |
| 40000–49999 | REVENUE | KREDIT |
| 50000–59999 | COGS/HPP | DEBET |
| 60000–69999 | OPEX | DEBET |

CoA di-seed otomatis pada inisialisasi pertama aplikasi (FR-010). Kode akun
unik dan tidak dapat diduplikasi; akun yang telah memiliki baris ledger hanya
dapat dinonaktifkan (`is_active = false`), tidak dapat dihapus.

## 4. Invarian Matematis

**Invarian wajib:**

```
SUM(Debit_Amount) - SUM(Credit_Amount) = 0
```

berlaku untuk setiap transaksi (bukan untuk seluruh buku besar sekaligus).
Invarian ini divalidasi oleh kernel sebelum unit-of-work di-flush ke
`localStorage` (lihat TR-003 pada [04_TRD.md](04_TRD.md) dan
[05_ARCHITECTURE.md](05_ARCHITECTURE.md) bagian unit-of-work).

**Konsekuensi pelanggaran:**

1. Jika delta selisih Debit dan Kredit tidak sama dengan nol, seluruh mutasi
   dalam unit-of-work tersebut dibatalkan (*hard rollback*) — tidak ada baris
   ledger parsial yang tersimpan.
2. Kernel melempar `LedgerImbalanceError` yang membawa informasi
   `transaction_id` (sementara, belum di-commit), delta, dan daftar baris yang
   gagal divalidasi.
3. Antarmuka menampilkan galat kepada pengguna dan tidak mengubah status
   transaksi dari `DRAFT`/percobaan submit.
4. Tidak ada mekanisme "partial commit"; komit bersifat all-or-nothing pada
   level transaksi, konsisten dengan emulasi atomic commit pada TR-002.

## 5. Reversal Pattern untuk Koreksi

Ledger bersifat immutable (TR-004). Koreksi transaksi yang telah `POSTED`
tidak pernah dilakukan dengan mengedit atau menghapus baris ledger, melainkan
melalui penerbitan pasangan *reversing entries* diikuti transaksi baru yang
benar (FR-003, US-003).

### 5.1 Langkah Detail

1. Pengguna memilih transaksi `POSTED` yang salah dan memicu aksi "Koreksi".
2. Kernel membaca seluruh baris ledger milik `transaction_id` asal.
3. Kernel menerbitkan transaksi reversal baru (`reverses_transaction_id` =
   id transaksi asal) yang berisi baris ledger dengan akun dan nominal yang
   identik, namun sisi Debit/Kredit dibalik.
4. Kernel memvalidasi invarian Debit = Credit untuk transaksi reversal ini
   (lihat bagian 4), sama seperti transaksi biasa.
5. Transaksi asal diubah statusnya menjadi `VOID`. Baris ledger transaksi asal
   **tidak diubah maupun dihapus** — tetap tampil apa adanya di Buku Besar.
6. Jika koreksi memerlukan nilai/akun yang benar, kernel mencatat transaksi
   baru terpisah (status `POSTED`) dengan data yang sudah benar, mengikuti
   alur posting normal pada bagian 2.
7. Riwayat lengkap — transaksi asal (`VOID`), reversal, dan transaksi baru —
   tetap dapat ditelusuri melalui `reverses_transaction_id` dan urutan
   `sequence_num`.

### 5.2 Contoh Sebelum/Sesudah

Kasus: transaksi EXPENSE Rp 500.000 dari Kas Tunai salah dicatat ke kategori
"Marketing" (`60200`), seharusnya "Software" (`60300`).

**Sebelum koreksi — Buku Besar:**

| seq | transaction_id | Akun | Sisi | Nominal | Status Transaksi |
|---|---|---|---|---|---|
| 101 | TX-1 | 60200 Marketing & Customer Acquisition | Debit | 500.000 | POSTED |
| 102 | TX-1 | 10100 Kas Tunai / Petty Cash | Kredit | 500.000 | POSTED |

**Sesudah koreksi — Buku Besar (TX-1 tidak diubah, TX-2 reversal, TX-3 benar):**

| seq | transaction_id | Akun | Sisi | Nominal | Status Transaksi |
|---|---|---|---|---|---|
| 101 | TX-1 | 60200 Marketing & Customer Acquisition | Debit | 500.000 | VOID |
| 102 | TX-1 | 10100 Kas Tunai / Petty Cash | Kredit | 500.000 | VOID |
| 103 | TX-2 (reverses TX-1) | 10100 Kas Tunai / Petty Cash | Debit | 500.000 | POSTED |
| 104 | TX-2 (reverses TX-1) | 60200 Marketing & Customer Acquisition | Kredit | 500.000 | POSTED |
| 105 | TX-3 (koreksi benar) | 60300 Software, Cloud Tools & Administrasi | Debit | 500.000 | POSTED |
| 106 | TX-3 (koreksi benar) | 10100 Kas Tunai / Petty Cash | Kredit | 500.000 | POSTED |

Saldo bersih akun `10100` dan `60300`/`60200` setelah TX-1..TX-3 identik
dengan hasil pencatatan yang benar sejak awal, tanpa satu pun baris ledger
yang diubah atau dihapus.

## 6. Cash Leakage Sentinel

Modul sentinel berjalan sebagai bagian dari domain kernel (bukan proses
latar belakang server, karena tidak ada backend), dijalankan secara
reaktif/on-demand terhadap data lokal setiap kali dashboard atau halaman
sentinel dimuat.

### 6.1 Aging Receivables 30/60/90

- Berlaku untuk baris ledger yang meningkatkan saldo akun `10400` Piutang
  Usaha (debit ke `10400`) yang belum dilunasi.
- Umur piutang dihitung dari `transaction_date` hingga tanggal berjalan,
  dikelompokkan: 0–29 hari, 30–59 hari, 60–89 hari, dan ≥ 90 hari.
- Peringatan berjenjang ditampilkan saat piutang memasuki hari ke-30, 60, dan
  90 (FR-030).
- Sentinel menampilkan daftar piutang per tingkat umur beserta total nominal
  (US-004).

### 6.2 Duplicate Outflow Prevention (48 Jam)

- Diterapkan pada transaksi `EXPENSE` yang baru dicatat.
- Kernel mencari transaksi `EXPENSE` lain dalam rentang ±48 jam dari
  `transaction_date` transaksi baru, dengan nominal identik dan
  vendor/deskripsi yang sama (FR-031).
- Jika ditemukan, sistem menampilkan peringatan non-blocking; pengguna tetap
  dapat melanjutkan penyimpanan secara sadar.

### 6.3 Ghost Expense (di atas Rp 1.000.000)

- Setiap transaksi `EXPENSE` dengan nominal > Rp 1.000.000 wajib memiliki
  lampiran bukti bayar (struk/nota/invoice).
- Jika lampiran kosong, transaksi ditandai `Unverified Expense` dan muncul
  pada daftar sentinel (FR-032).
- Penandaan tidak memblokir penyimpanan transaksi; bersifat informatif untuk
  tindak lanjut pengguna.

### 6.4 Two-Way Bank Reconciliation (Zero Variance)

- Pengguna mengimpor mutasi rekening bank dalam format CSV (FR-033).
- Kernel mencocokkan dua arah: setiap baris CSV dicari padanannya pada baris
  ledger akun kas/bank berdasarkan tanggal dan nominal, dan sebaliknya setiap
  baris ledger dicari padanannya pada CSV.
- Baris yang tidak berpasangan pada kedua arah dilaporkan sebagai selisih.
- Penutupan periode (jika diimplementasikan) ditolak selama masih terdapat
  selisih — *Zero Variance Tolerance*, tanpa toleransi pembulatan.

## 7. Formula Laporan

Seluruh formula beroperasi atas SUM baris ledger per rentang kode akun CoA
(bagian 3), dengan filter `transaction.status = 'POSTED'` (baris ledger
transaksi `VOID` tidak diikutsertakan dalam agregasi laporan apa pun).

### 7.1 Laba Rugi Multi-Step (FR-022)

Notasi: `SUM_KREDIT(range)` = jumlah nominal baris Kredit pada akun berkode
dalam rentang tersebut, periode berjalan; `SUM_DEBIT(range)` = jumlah nominal
baris Debit pada rentang tersebut, periode berjalan.

```
Pendapatan Operasional     = SUM_KREDIT(40100..40199)
Harga Pokok Penjualan (HPP)= SUM_DEBIT(50000..59999)
Laba Kotor                 = Pendapatan Operasional - HPP

Beban Operasional (OPEX)   = SUM_DEBIT(60000..69999)
Laba Operasi                = Laba Kotor - Beban Operasional

Pendapatan Non-Operasional = SUM_KREDIT(40200..49999)

Laba Bersih                 = Laba Operasi + Pendapatan Non-Operasional
```

Struktur ini mengikuti urutan tampilan pada FR-022: Pendapatan Operasional,
HPP, Laba Kotor, Beban Operasional, Laba Operasi, Pendapatan Non-Operasional,
Laba Bersih.

### 7.2 Neraca (FR-023)

Dihitung per tanggal tertentu `d` (saldo kumulatif seluruh baris ledger
`transaction_date <= d`, status `POSTED`):

```
Saldo_Akun(kode, d) =
    jika Normal Balance = DEBET:
        SUM_DEBIT(kode, s.d. d) - SUM_KREDIT(kode, s.d. d)
    jika Normal Balance = KREDIT:
        SUM_KREDIT(kode, s.d. d) - SUM_DEBIT(kode, s.d. d)

Total Aset        = SUM atas kode 10000..19999 dari Saldo_Akun
Total Liabilitas   = SUM atas kode 20000..29999 dari Saldo_Akun
Total Ekuitas       = SUM atas kode 30000..39999 dari Saldo_Akun
                       + Laba Bersih Berjalan (jika belum ditutup ke 30200)

Penegakan: Total Aset = Total Liabilitas + Total Ekuitas
```

Selisih bukan nol pada penegakan di atas ditampilkan sebagai galat pada
laporan (FR-023), dan mengindikasikan pelanggaran invarian pada bagian 4 yang
seharusnya tidak dapat terjadi karena validasi commit-time.

### 7.3 Arus Kas — Direct Method (FR-024)

Akun kas/bank yang dipantau: `10100`, `10200`, `10300`. Setiap baris ledger
pada akun-akun ini, periode berjalan, diklasifikasikan berdasarkan akun
lawan (kontra) pada transaksi yang sama:

```
Arus Kas dari Aktivitas Operasi =
    SUM_DEBIT(10100,10200,10300) dengan akun lawan pada 40000..49999 (INCOME)
  - SUM_KREDIT(10100,10200,10300) dengan akun lawan pada 50000..69999 (EXPENSE)

Arus Kas dari Aktivitas Pendanaan =
    SUM_DEBIT(10100,10200,10300) dengan akun lawan pada 30000..39999
  - SUM_KREDIT(10100,10200,10300) dengan akun lawan pada 20000..29999 (DEBT_PAYMENT)

Arus Kas dari Aktivitas Investasi = _TBD_
  (plan.md tidak merinci kategori investasi; kategori/akun terkait aktiva
  tetap belum didefinisikan pada CoA bagian 3, sehingga klasifikasi transaksi
  ke kelompok investasi ditandai belum diputuskan)

Kenaikan (Penurunan) Kas Bersih =
    Arus Kas Operasi + Arus Kas Pendanaan + Arus Kas Investasi

Saldo Kas Akhir = Saldo Kas Awal Periode + Kenaikan (Penurunan) Kas Bersih
```

Mutasi TRANSFER antar akun kas/bank (`10100`↔`10200`↔`10300`) tidak
mengubah kelompok manapun karena kedua sisi berada dalam cakupan kas yang
sama; baris tersebut dikecualikan dari ketiga kelompok aktivitas di atas.

## 8. Contoh Kerja (Worked Example)

Tiga transaksi berikut mengilustrasikan konversi single-entry ke double-entry
sesuai bagian 2, dengan nominal dalam rupiah utuh.

### Transaksi 1 — INCOME

Input pengguna: Tipe `INCOME`, Nominal 5.000.000, Akun Rekening Bank, Kategori
"Penjualan Jasa".

| seq | Akun | Sisi | Nominal |
|---|---|---|---|
| 201 | 10200 Kas di Bank (Operasional & Payroll) | Debit | 5.000.000 |
| 202 | 40100 Pendapatan Operasional / Penjualan | Kredit | 5.000.000 |

Validasi: SUM(Debit) - SUM(Kredit) = 5.000.000 - 5.000.000 = 0. Sah.

### Transaksi 2 — EXPENSE

Input pengguna: Tipe `EXPENSE`, Nominal 1.200.000, Akun Kas Tunai, Kategori
"Marketing & Customer Acquisition".

| seq | Akun | Sisi | Nominal |
|---|---|---|---|
| 203 | 60200 Marketing & Customer Acquisition | Debit | 1.200.000 |
| 204 | 10100 Kas Tunai / Petty Cash | Kredit | 1.200.000 |

Validasi: 1.200.000 - 1.200.000 = 0. Sah. Karena nominal > Rp 1.000.000,
transaksi ini diperiksa sentinel Ghost Expense (bagian 6.3); bila tanpa
lampiran bukti bayar, ditandai `Unverified Expense`.

### Transaksi 3 — TRANSFER

Input pengguna: Tipe `TRANSFER`, Nominal 2.000.000, dari Rekening Bank ke
E-Wallet.

| seq | Akun | Sisi | Nominal |
|---|---|---|---|
| 205 | 10300 E-Wallet / Payment Gateway Escrow | Debit | 2.000.000 |
| 206 | 10200 Kas di Bank (Operasional & Payroll) | Kredit | 2.000.000 |

Validasi: 2.000.000 - 2.000.000 = 0. Sah.

### Ringkasan Saldo Setelah Tiga Transaksi

| Akun | Debit Kumulatif | Kredit Kumulatif | Saldo (Normal Balance) |
|---|---|---|---|
| 10100 Kas Tunai | 0 | 1.200.000 | -1.200.000 (turun) |
| 10200 Kas di Bank | 5.000.000 | 2.000.000 | 3.000.000 |
| 10300 E-Wallet | 2.000.000 | 0 | 2.000.000 |
| 40100 Pendapatan Operasional | 0 | 5.000.000 | 5.000.000 |
| 60200 Marketing | 1.200.000 | 0 | 1.200.000 |

Total Debit seluruh baris (5.000.000 + 1.200.000 + 2.000.000) = Total Kredit
seluruh baris (5.000.000 + 1.200.000 + 2.000.000) = 8.200.000, memenuhi
invarian bagian 4 pada level buku besar gabungan.

## 9. Referensi

- [plan.md](../plan.md) — PRD asli, sumber kebenaran spesifikasi akuntansi.
- [01_PRD.md](01_PRD.md), [03_FRD.md](03_FRD.md), [04_TRD.md](04_TRD.md).
- [05_ARCHITECTURE.md](05_ARCHITECTURE.md) — implementasi kernel sebagai
  modul domain.
- [11_DECISIONS.md](11_DECISIONS.md) — ADR penyimpangan dari arsitektur awal.
