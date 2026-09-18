# Glosarium — FinTrack Core

> Status: Final
> Terakhir diperbarui: 2026-09-19
> Pemilik: Product Office

Istilah disusun alfabetis. Lihat [22_ACCOUNTING_SPEC.md](22_ACCOUNTING_SPEC.md)
untuk definisi akuntansi yang lebih rinci.

| Istilah | Definisi |
|---|---|
| Aging Receivables | Pengelompokan piutang usaha berdasarkan umur (0–29, 30–59, 60–89, 90+ hari) untuk mendeteksi risiko kredit macet. Lihat FR-030. |
| Arus Kas (Cash Flow) | Laporan penerimaan dan pengeluaran kas aktual periode berjalan, disajikan dengan metode langsung (direct method), dikelompokkan menjadi aktivitas operasi, investasi, dan pendanaan. |
| Chart of Accounts (CoA) | Daftar akun standar 5 digit yang mengklasifikasikan seluruh akun ke dalam ASSET, LIABILITY, EQUITY, REVENUE, COGS, dan OPEX. Lihat [22_ACCOUNTING_SPEC.md](22_ACCOUNTING_SPEC.md). |
| COGS / HPP | Cost of Goods Sold / Harga Pokok Penjualan. Kode akun 50000–59999, saldo normal Debet. |
| Debit (Debet) | Sisi pencatatan yang menambah saldo akun Aset dan Beban, atau mengurangi saldo akun Liabilitas, Ekuitas, dan Pendapatan. |
| Double-Entry | Metode pencatatan akuntansi di mana setiap transaksi dicatat pada minimal dua akun, dengan total debit selalu sama dengan total kredit. |
| Ekuitas (Equity) | Kode akun 30000–39999, saldo normal Kredit, mewakili hak pemilik atas aset bersih bisnis. |
| Ghost Expense | Pengeluaran di atas Rp 1.000.000 tanpa lampiran bukti bayar, ditandai `Unverified Expense`. Lihat FR-032. |
| Hash Chaining | Mekanisme integritas di mana setiap baris ledger menyimpan hash SHA-256 yang merantai ke hash baris sebelumnya (`prev_hash`), sehingga modifikasi satu baris merusak seluruh rantai berikutnya. Lihat TR-005. |
| Idempotency (Idempotensi) | Sifat operasi yang menghasilkan efek sama meski dijalankan berulang dengan input identik; pada FinTrack Core ditegakkan via `client_tx_id`. Lihat TR-008. |
| Kredit (Credit) | Sisi pencatatan yang menambah saldo akun Liabilitas, Ekuitas, dan Pendapatan, atau mengurangi saldo akun Aset dan Beban. |
| Ledger Entry | Satu baris pencatatan double-entry (debit atau kredit) yang immutable, memiliki `sequence_num`, `running_balance`, `prev_hash`, dan `entry_hash`. |
| Liabilitas (Liability) | Kode akun 20000–29999, saldo normal Kredit, mewakili kewajiban bisnis kepada pihak lain. |
| Neraca (Balance Sheet) | Laporan posisi keuangan pada tanggal tertentu yang menegakkan `Aset = Liabilitas + Ekuitas`. |
| OPEX (Operating Expenses) | Beban operasional. Kode akun 60000–69999, saldo normal Debet. |
| Piutang Usaha (Accounts Receivable) | Akun 10400, mewakili tagihan yang belum diterima dari pelanggan; sumber data Aging Receivables Sentinel. |
| Posting | Proses mengonversi satu transaksi pengguna menjadi baris-baris ledger double-entry yang seimbang. |
| Reversal | Pola koreksi transaksi dengan menerbitkan pasangan reversing entries (membalik debit/kredit) dan menandai transaksi asal `VOID`, tanpa memodifikasi baris ledger yang sudah ada. Lihat FR-003. |
| Running Balance | Saldo kumulatif suatu akun setelah baris ledger tertentu diterapkan, disimpan pada setiap `ledger_entry`. |
| Sequence Number | Nomor urut global yang monotonic naik dan tidak pernah digunakan ulang, diberikan pada setiap baris ledger untuk menjamin urutan penulisan. Lihat TR-007. |
| Single-Entry | Metode pencatatan sederhana yang hanya mencatat satu sisi transaksi (nominal masuk/keluar) tanpa keseimbangan debit-kredit; digunakan sebagai lapisan tampilan pengguna FinTrack Core. |
| Unit of Work | Pola implementasi yang mengumpulkan seluruh mutasi data dalam satu operasi logis di memori, memvalidasinya, lalu menuliskannya secara berurutan dengan kemampuan rollback bila gagal. Lihat TR-002. |
| Utang Usaha (Accounts Payable) | Akun 20100, mewakili kewajiban yang belum dibayar kepada vendor/pemasok. |

## Referensi

- [22_ACCOUNTING_SPEC.md](22_ACCOUNTING_SPEC.md)
- [04_TRD.md](04_TRD.md)
- [03_FRD.md](03_FRD.md)
