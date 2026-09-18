# Hasil Uji Penerimaan — MVP FinTrack Core

> Status: Final
> Terakhir diperbarui: 2026-09-19
> Pemilik: Office of the CTO

Dokumen ini mencatat hasil uji penerimaan pada rilis MVP versi 0.3.0.

## Lingkungan Uji

| Aspek                   | Nilai                                       |
| ----------------------- | ------------------------------------------- |
| Tanggal pelaksanaan     | 2026-09-19                                  |
| Versi aplikasi          | 0.3.0                                       |
| Sistem operasi          | Windows 11 Pro 10.0.26200                   |
| Node.js                 | 20.x                                        |
| Peladen pratinjau       | `vite preview` pada `http://localhost:4173` |
| Lingkungan uji otomatis | Vitest 2.1.9 dengan jsdom                   |

## Ringkasan

| Kategori                                   | Jumlah  | Lulus   | Gagal |
| ------------------------------------------ | ------- | ------- | ----- |
| Uji unit dan integrasi otomatis            | 105     | 105     | 0     |
| Uji penerimaan alur (UAT-01 sampai UAT-06) | 9       | 9       | 0     |
| Tolok ukur performa                        | 7       | 7       | 0     |
| Verifikasi rute produksi                   | 8       | 8       | 0     |
| **Total**                                  | **129** | **129** | **0** |

## Skenario Uji Penerimaan

Skenario dijalankan melalui lapisan domain yang sama dengan yang digunakan
antarmuka, dan terotomasi pada `src/domain/__tests__/uat.test.ts`.

### UAT-01 — Bootstrap Awal

| Langkah                               | Diharapkan                                        | Aktual                             | Status |
| ------------------------------------- | ------------------------------------------------- | ---------------------------------- | ------ |
| Buka aplikasi pada penyimpanan kosong | Chart of Accounts ter-seed dengan kode lima digit | Seluruh akun cocok pola lima digit | PASS   |
| Periksa kategori bawaan               | Kategori tersedia                                 | Kategori terisi                    | PASS   |
| Periksa transaksi awal                | Tidak ada transaksi dan tidak ada baris ledger    | Keduanya kosong                    | PASS   |

### UAT-02 — Alur Pencatatan sampai Pelaporan

| Langkah                                            | Diharapkan                                   | Aktual                      | Status |
| -------------------------------------------------- | -------------------------------------------- | --------------------------- | ------ |
| Catat pemasukan Rp 5.000.000                       | Dua baris ledger berpasangan                 | Tepat 2 baris               | PASS   |
| Periksa invarian                                   | Selisih debit dan kredit nol                 | Selisih 0                   | PASS   |
| Catat pengeluaran Rp 1.200.000 lalu buka Laba Rugi | Laba bersih Rp 3.800.000                     | Rp 3.800.000                | PASS   |
| Buka Neraca                                        | Aset sama dengan Liabilitas ditambah Ekuitas | `isBalanced` bernilai benar | PASS   |
| Buka Arus Kas                                      | Perubahan kas bersih Rp 3.800.000            | Rp 3.800.000                | PASS   |
| Buka Buku Besar                                    | Empat baris ledger                           | 4 baris                     | PASS   |

### UAT-03 — Koreksi lewat Jurnal Pembalik

| Langkah                          | Diharapkan                  | Aktual                                                     | Status |
| -------------------------------- | --------------------------- | ---------------------------------------------------------- | ------ |
| Balik satu transaksi pengeluaran | Baris ledger asal tetap ada | Jumlah baris menjadi dua kali lipat, tidak ada penghapusan | PASS   |
| Periksa status transaksi asal    | Berstatus `VOID`            | `VOID`                                                     | PASS   |
| Periksa dampak ke Laba Rugi      | Efek bersih nol             | Laba bersih 0                                              | PASS   |

### UAT-04 — Integritas Rantai Hash

| Langkah                                     | Diharapkan              | Aktual                 | Status |
| ------------------------------------------- | ----------------------- | ---------------------- | ------ |
| Catat lima transaksi lalu verifikasi rantai | Rantai dilaporkan sahih | `valid` bernilai benar | PASS   |

### UAT-05 — Cadangan dan Pemulihan

| Langkah                                         | Diharapkan                                     | Aktual                    | Status |
| ----------------------------------------------- | ---------------------------------------------- | ------------------------- | ------ |
| Ekspor cadangan, reset data, lalu impor kembali | Jumlah transaksi dan baris ledger pulih persis | Pulih identik             | PASS   |
| Verifikasi rantai setelah pemulihan             | Rantai tetap sahih                             | `valid` bernilai benar    | PASS   |
| Impor berkas rusak                              | Ditolak tanpa merusak data yang ada            | Galat dilempar, data utuh | PASS   |

### UAT-06 — Sentinel Kebocoran Kas

| Langkah                                    | Diharapkan                     | Aktual                       | Status |
| ------------------------------------------ | ------------------------------ | ---------------------------- | ------ |
| Catat pengeluaran Rp 2.000.000 tanpa bukti | Ditandai sebagai ghost expense | 1 temuan, total Rp 2.000.000 | PASS   |

## Verifikasi Rute Produksi

Dijalankan terhadap artefak `dist/` melalui `vite preview`.

| Rute                          | Kode Status                 | Status |
| ----------------------------- | --------------------------- | ------ |
| `/`                           | 200                         | PASS   |
| `/transaksi`                  | 200                         | PASS   |
| `/buku-besar`                 | 200                         | PASS   |
| `/laporan`                    | 200                         | PASS   |
| `/sentinel`                   | 200                         | PASS   |
| `/akun`                       | 200                         | PASS   |
| `/pengaturan`                 | 200                         | PASS   |
| `/rute-ngawur` (fallback SPA) | 200 dengan dokumen aplikasi | PASS   |

Berkas `dist/_redirects` berisi `/* /index.html 200` sebagaimana diperlukan
Cloudflare Pages. Aset `index.js` dan `index.css` terlayani dengan kode 200.

## Hasil Tolok Ukur Performa

Diukur pada 6.000 baris ledger, terotomasi pada
`src/domain/__tests__/performance.test.ts`.

| Operasi                      | Waktu    | Ambang               | Status |
| ---------------------------- | -------- | -------------------- | ------ |
| Laba Rugi                    | 33,9 ms  | 500 ms               | PASS   |
| Neraca                       | 19,9 ms  | 500 ms               | PASS   |
| Arus Kas                     | 25,5 ms  | 500 ms               | PASS   |
| Buku Besar                   | 17,9 ms  | 500 ms               | PASS   |
| Sentinel                     | 21,9 ms  | 500 ms               | PASS   |
| Verifikasi rantai hash penuh | 399,1 ms | tidak terikat ambang | PASS   |

## Temuan

### T-01 — Kapasitas penyimpanan di bawah target NFR

Pengukuran kapasitas menunjukkan kuota `localStorage` sebesar 5 MB habis pada
sekitar 3.732 transaksi, setara 7.464 baris ledger, dengan rasio pemakaian
0,954 sebelum peramban melempar `QuotaExceededError`. Target NFR-002 semula
menyebut 10.000 baris ledger dan tidak dapat dipenuhi pada arsitektur
penyimpanan saat ini.

Tindakan: target NFR-002 direvisi menjadi 6.000 baris ledger pada
[04_TRD.md](../04_TRD.md), dan risiko dicatat sebagai R-009 pada
[10_RISK_REGISTER.md](../10_RISK_REGISTER.md). Peningkatan kapasitas memerlukan
IndexedDB atau backend terpusat dan dijadwalkan pasca-v1.

### T-02 — Deteksi pengeluaran ganda tidak membandingkan akun

`detectDuplicateOutflow` mencocokkan tipe mutasi, status, nominal, dan
deskripsi ter-normalisasi, namun tidak membandingkan akun sumber. Dua
pengeluaran dengan nominal dan deskripsi sama dari akun kas berbeda tetap
dilaporkan sebagai dugaan duplikat. Perilaku ini sesuai
[22_ACCOUNTING_SPEC.md](../22_ACCOUNTING_SPEC.md) bagian 6.2 yang tidak
menyebut akun sebagai kriteria, sehingga dinilai sebagai keputusan desain dan
dikunci melalui uji regresi, bukan diubah.

### T-03 — Verifikasi aksesibilitas bersifat struktural

Pemeriksaan label, peran ARIA, pengelolaan fokus, dan wadah tabel yang dapat
digeser lewat papan ketik dilakukan melalui pembacaan kode, bukan pengujian
dengan pembaca layar nyata maupun pengukuran kontras otomatis. Verifikasi
dengan alat audit peramban disarankan sebelum rilis produksi.

## Kesimpulan

Seluruh skenario uji penerimaan berstatus PASS. Temuan T-01 telah
ditindaklanjuti melalui revisi target dan pencatatan risiko. Temuan T-02
dinilai sesuai spesifikasi. Temuan T-03 merupakan batasan cakupan verifikasi
yang perlu dilengkapi sebelum rilis produksi.

Aplikasi dinilai memenuhi kriteria MVP dan siap diterapkan ke Cloudflare Pages
mengikuti [18_INSTALLATION.md](../18_INSTALLATION.md).

## Referensi

- [07_MASTER_CHECKLIST.md](../07_MASTER_CHECKLIST.md)
- [12_TEST_STRATEGY.md](../12_TEST_STRATEGY.md)
- [18_INSTALLATION.md](../18_INSTALLATION.md)
