# Functional Requirements Document — FinTrack Core

> Status: Final
> Terakhir diperbarui: 2026-09-19
> Pemilik: Product Office

Setiap kebutuhan fungsional memiliki ID `FR-NNN` dan di-trace ke kebutuhan
teknis pada [04_TRD.md](04_TRD.md) melalui
[19_REQUIREMENTS_TRACEABILITY.md](19_REQUIREMENTS_TRACEABILITY.md).

## 1. Pencatatan Transaksi

### FR-001 — Quick Entry

Sistem menyediakan form pencatatan dengan tepat empat atribut masukan:
tipe mutasi, nominal, akun sumber/tujuan, dan kategori alokasi.

**Acceptance Criteria**

- Tipe mutasi terbatas pada `INCOME`, `EXPENSE`, `TRANSFER`, `DEBT_PAYMENT`.
- Nominal wajib bilangan bulat positif dalam satuan rupiah utuh.
- Kategori wajib untuk `INCOME` dan `EXPENSE`, opsional untuk `TRANSFER`.
- Tanggal transaksi default hari ini dan dapat diubah.
- Deskripsi opsional; bila kosong diisi nama kategori.

### FR-002 — Konversi Double-Entry Otomatis

Setiap transaksi dikonversi menjadi minimal dua baris ledger sesuai aturan pada
[22_ACCOUNTING_SPEC.md](22_ACCOUNTING_SPEC.md).

**Acceptance Criteria**

- Jumlah debit sama dengan jumlah kredit untuk setiap transaksi.
- Bila delta bukan nol, penyimpanan dibatalkan seluruhnya dan galat ditampilkan.

### FR-003 — Reversal untuk Koreksi

Pengguna tidak dapat mengubah atau menghapus transaksi yang telah diposting.
Koreksi dilakukan melalui penerbitan pasangan reversing entries.

**Acceptance Criteria**

- Transaksi asal berubah status menjadi `VOID` dan tetap tampil di riwayat.
- Transaksi reversal mereferensikan `reverses_transaction_id` transaksi asal.
- Baris ledger transaksi asal tidak berubah sama sekali.

### FR-004 — Draft Transaksi

Transaksi dapat disimpan berstatus `DRAFT` tanpa membangkitkan baris ledger,
dan baru membangkitkan ledger saat diposting.

## 2. Master Data

### FR-010 — Chart of Accounts

Sistem menyediakan Chart of Accounts standar 5 digit yang ter-seed otomatis pada
inisialisasi pertama, dengan kode dan tipe sesuai
[22_ACCOUNTING_SPEC.md](22_ACCOUNTING_SPEC.md) bagian 2.

**Acceptance Criteria**

- Kode akun unik; duplikasi ditolak.
- Akun dengan baris ledger tidak dapat dihapus, hanya dinonaktifkan.
- Tipe akun terbatas pada `ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`.

### FR-011 — Kategori

Kategori bertipe `INCOME` atau `EXPENSE`, mendukung satu tingkat induk-anak.

**Acceptance Criteria**

- Kategori yang dipakai transaksi tidak dapat dihapus, hanya dinonaktifkan.
- Setiap kategori dipetakan ke satu akun CoA default.

## 3. Pelaporan

### FR-020 — Dashboard

Menampilkan total saldo kas, saldo per akun aset, pemasukan dan pengeluaran
periode berjalan, serta ringkasan peringatan sentinel.

### FR-021 — Buku Besar

Menampilkan seluruh baris ledger dengan filter akun, rentang tanggal, dan tipe
entri, beserta kolom `running_balance` dan `sequence_num`.

### FR-022 — Laporan Laba Rugi Multi-Step

Struktur: Pendapatan Operasional, HPP, Laba Kotor, Beban Operasional,
Laba Operasi, Pendapatan Non-Operasional, Laba Bersih.

### FR-023 — Laporan Neraca

Menyajikan Aset, Liabilitas, dan Ekuitas per tanggal tertentu dengan penegakan
`Aset = Liabilitas + Ekuitas`. Selisih bukan nol ditampilkan sebagai galat.

### FR-024 — Laporan Arus Kas (Direct Method)

Menyajikan penerimaan dan pengeluaran kas aktual periode berjalan, dikelompokkan
menjadi aktivitas operasi, investasi, dan pendanaan.

### FR-025 — Neraca Saldo (Trial Balance)

Menyajikan akumulasi sisi debit dan sisi kredit per akun sampai dengan tanggal
tertentu, beserta total kedua sisi dan selisihnya. Angka dihitung ulang dari
baris ledger, bukan dari kolom saldo tersimpan pada entitas akun, sehingga
laporan ini berfungsi sebagai pembuktian aritmetika yang independen terhadap
nilai turunan.

**Acceptance Criteria**

- Total debit sama dengan total kredit dan selisih bernilai nol pada buku besar
  yang sehat.
- Baris bertanda `VOID` tetap ikut dijumlahkan, karena buku besar bersifat
  _append-only_ dan jurnal pembalik merupakan fakta historis.
- Merusak nilai `currentBalance` pada penyimpanan tidak mengubah hasil laporan.
- Halaman laporan menampilkan hasil pemeriksaan aritmetika berdampingan dengan
  hasil verifikasi rantai hash (lihat FR-040).

## 4. Cash Leakage Sentinel

### FR-030 — Aging Receivables Alert

Piutang usaha dikelompokkan pada umur 0–29, 30–59, 60–89, dan 90 hari ke atas
dengan peringatan berjenjang pada hari ke-30, 60, dan 90.

### FR-031 — Duplicate Outflow Prevention

Sistem memperingatkan bila terdeteksi pengeluaran dengan nominal identik ke
vendor atau deskripsi yang sama dalam rentang 48 jam.

**Acceptance Criteria**

- Peringatan bersifat non-blocking; pengguna dapat melanjutkan secara sadar.

### FR-032 — Ghost Expense Tagging

Pengeluaran di atas Rp 1.000.000 tanpa lampiran bukti bayar ditandai
`Unverified Expense` dan muncul pada daftar sentinel.

### FR-033 — Rekonsiliasi Bank

Impor mutasi rekening format CSV, pencocokan dua arah dengan baris ledger
berdasarkan tanggal dan nominal, serta pelaporan selisih.

**Acceptance Criteria**

- Penutupan periode ditolak bila masih terdapat selisih (zero variance tolerance).

## 5. Integritas & Data

### FR-040 — Verifikasi Rantai Hash

Pengguna dapat menjalankan verifikasi integritas yang memeriksa ulang rantai
SHA-256 seluruh baris ledger dan melaporkan entri pertama yang rusak.

### FR-041 — Ekspor & Impor

Data dapat diekspor sebagai JSON penuh (backup) dan CSV per laporan, serta
diimpor kembali dari JSON hasil ekspor.

### FR-042 — Operasi Offline Penuh

Seluruh fungsi berjalan tanpa permintaan jaringan.

## 6. Antarmuka

### FR-050 — Mode Terang dan Gelap

Tema mengikuti `prefers-color-scheme` dengan preferensi manual tersimpan lokal
dan diterapkan sebelum render pertama.

### FR-051 — Responsif

Antarmuka berfungsi pada lebar 375px, 768px, 1024px, dan 1440px.
