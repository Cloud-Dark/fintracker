# FinTrack Core

Aplikasi pencatatan keuangan yang secepat catatan single-entry di sisi pengguna,
namun seakurat pembukuan double-entry di sisi mesin.

**[Demo langsung](https://fintracker-dpp.pages.dev/)** &middot;
**[Kode sumber](https://github.com/Cloud-Dark/fintracker)**

Pengguna hanya mengisi empat atribut — tipe mutasi, nominal, akun, dan kategori.
Di balik layar, setiap transaksi dikonversi menjadi baris buku besar berpasangan
yang seimbang secara matematis, dirantai dengan hash SHA-256, dan tidak pernah
diubah maupun dihapus. Koreksi selalu ditempuh lewat jurnal pembalik.

## Karakteristik

- **Luring penuh.** Seluruh data tersimpan pada `localStorage` peramban; tidak
  ada permintaan jaringan sama sekali.
- **Buku besar tak dapat diubah.** Repositori ledger hanya mengekspos operasi
  tambah dan baca.
- **Integritas terverifikasi.** Rantai hash dapat diperiksa ulang kapan saja.
- **Laporan standar.** Laba Rugi multi-step, Neraca, Arus Kas metode langsung,
  dan Buku Besar.
- **Sentinel kebocoran kas.** Peringatan umur piutang, deteksi pengeluaran
  ganda, dan penandaan pengeluaran tanpa bukti.

## Mekanisme Pembuktian Debit dan Kredit

Klaim bahwa setiap transaksi seimbang tidak cukup dinyatakan; ia harus dapat
diperiksa ulang. FinTrack Core menegakkannya lewat empat lapis yang berbeda
sifatnya: dua mencegah data tidak seimbang masuk, dua lagi membuktikan bahwa
data yang sudah tersimpan tetap utuh.

### Lapis 1 — Penolakan saat penulisan

`assertBalanced()` pada [`src/domain/kernel.ts`](src/domain/kernel.ts) dipanggil
sebelum satu baris pun ditulis. Fungsi tersebut menjumlahkan seluruh sisi debit
sebagai nilai positif dan sisi kredit sebagai nilai negatif, lalu menuntut
hasilnya tepat nol dan jumlah barisnya sekurang-kurangnya dua:

```ts
delta += leg.entryType === 'DEBIT' ? leg.amount : -leg.amount
if (legs.length < 2 || delta !== 0) {
  throw new LedgerImbalanceError(delta, [...legs])
}
```

Nominal wajib bilangan bulat positif dalam satuan rupiah penuh. Tidak ada
pecahan desimal, sehingga tidak ada galat pembulatan biner yang dapat membuat
selisih tampak nol padahal tidak.

### Lapis 2 — Pengembalian penuh saat gagal

Penulisan berlangsung dalam satu unit kerja. Bila validasi atau penulisan gagal
di tengah jalan, keadaan penyimpanan dikembalikan ke cuplikan sebelum transaksi
dimulai. Akibatnya buku besar tidak pernah menyimpan setengah pasangan jurnal:
sebuah transaksi masuk seluruhnya, atau tidak sama sekali.

### Lapis 3 — Neraca Saldo, pemeriksaan aritmetika independen

Buka **Laporan → Neraca Saldo**. Halaman tersebut memanggil `trialBalance()`
pada [`src/domain/reporting.ts`](src/domain/reporting.ts), yang menjumlahkan
ulang seluruh baris jurnal dari awal.

Yang membuatnya bernilai sebagai pembuktian adalah sumber datanya: neraca saldo
membaca baris ledger, **bukan** `currentBalance` yang tersimpan pada akun. Saldo
tersimpan merupakan nilai turunan yang dapat menyimpang apabila penyimpanan
disunting dari luar aplikasi; penjumlahan ulang tidak. Karena itu kesamaan
antara Total Debit dan Total Kredit di sini merupakan pemeriksaan yang berdiri
sendiri terhadap apa yang ditegakkan lapis pertama.

Baris transaksi berstatus VOID tetap ikut dijumlahkan. Buku besar bersifat
append-only: pembatalan diwujudkan sebagai jurnal pembalik, dan kedua sisi
tersebut sama-sama fakta historis yang harus tetap seimbang.

### Lapis 4 — Rantai hash, pemeriksaan keutuhan urutan

Neraca saldo membuktikan jumlahnya benar, tetapi tidak membuktikan tidak ada
baris yang disisipkan, disunting, atau dibuang. Itu tugas rantai hash.

Setiap baris ledger menyimpan `prevHash` berisi hash baris sebelumnya, dan
`entryHash` berupa SHA-256 atas isinya sendiri beserta `prevHash` tadi —
dihitung lewat Web Crypto. `verifyChain()` menelusuri seluruh rantai dari
genesis, menghitung ulang setiap hash, dan berhenti pada baris pertama yang
tidak cocok. Menyunting satu nominal saja akan mengubah hash baris tersebut dan
memutus tautan seluruh baris sesudahnya.

Hasil kedua uji terakhir ditampilkan berdampingan pada tab Neraca Saldo, dan
dapat dijalankan sendiri lewat tombol Verifikasi Integritas pada halaman Buku
Besar maupun halaman Pengaturan.

### Cara memeriksa sendiri

| Langkah                     | Tempat                  | Yang dibuktikan                             |
| --------------------------- | ----------------------- | ------------------------------------------- |
| Buka Laporan → Neraca Saldo | Aplikasi                | Total Debit = Total Kredit, selisih Rp 0    |
| Tekan Verifikasi Integritas | Buku Besar / Pengaturan | Rantai hash utuh, jumlah baris diperiksa    |
| Buka Laporan → Neraca       | Aplikasi                | Aset = Liabilitas + Ekuitas + Laba Berjalan |
| Jalankan `npm test`         | Terminal                | Invarian diuji otomatis atas data nyata     |

Pengujian otomatis mencakup kasus yang sengaja merusak: satu uji mengganti
`currentBalance` seluruh akun dengan nilai palsu, lalu memastikan neraca saldo
tetap menghasilkan angka yang sama karena ia menghitung ulang dari jurnal.

## Menjalankan

```bash
npm install
npm run dev      # server pengembangan
npm run build    # artefak produksi ke dist/
npm run preview  # pratinjau hasil build
npm test         # uji unit dan penerimaan
npm run test:perf # tolok ukur performa (sekitar 40 detik)
npm run lint     # ESLint, gagal bila ada peringatan
npm run format   # Prettier
npm run verify   # lint + typecheck + test + build
```

Prasyarat: Node.js 20 atau lebih baru.

## Penerapan (Cloudflare Pages)

| Pengaturan       | Nilai                                           |
| ---------------- | ----------------------------------------------- |
| Build command    | `npm run build`                                 |
| Output directory | `dist`                                          |
| SPA fallback     | `public/_redirects` berisi `/* /index.html 200` |

## Dokumentasi

Seluruh dokumentasi proyek berada di [`docs/`](docs/README.md).

| Dokumen                                             | Isi                                         |
| --------------------------------------------------- | ------------------------------------------- |
| [00_PROJECT_CHARTER.md](docs/00_PROJECT_CHARTER.md) | Visi, scope, kriteria sukses                |
| [01_PRD.md](docs/01_PRD.md)                         | Kebutuhan produk dan user story             |
| [03_FRD.md](docs/03_FRD.md)                         | Kebutuhan fungsional ber-ID                 |
| [04_TRD.md](docs/04_TRD.md)                         | Kebutuhan teknis dan stack                  |
| [05_ARCHITECTURE.md](docs/05_ARCHITECTURE.md)       | Arsitektur berlapis dan alur data           |
| [20_DATABASE.md](docs/20_DATABASE.md)               | Skema penyimpanan `localStorage`            |
| [22_ACCOUNTING_SPEC.md](docs/22_ACCOUNTING_SPEC.md) | Spesifikasi akuntansi dan Chart of Accounts |
| [23_DESIGN.md](docs/23_DESIGN.md)                   | Sistem desain                               |
| [24_DESIGN_TOKEN.md](docs/24_DESIGN_TOKEN.md)       | Token desain siap implementasi              |
| [17_DEVELOPER_SETUP.md](docs/17_DEVELOPER_SETUP.md) | Panduan pengembang                          |

## Tautan

| Sumber        | URL                                      |
| ------------- | ---------------------------------------- |
| Demo langsung | https://fintracker-dpp.pages.dev/        |
| Repositori    | https://github.com/Cloud-Dark/fintracker |

Kedua tautan tersebut juga tersedia di dalam aplikasi, pada bagian Proyek di
footer dan pada panel Tentang Aplikasi di halaman Pengaturan.

## Batasan yang Diketahui

Data terikat pada satu peramban di satu perangkat dan akan hilang bila data
situs dibersihkan. Tidak ada otentikasi maupun enkripsi at-rest. Lakukan ekspor
cadangan JSON secara berkala.

Kapasitas `localStorage` sebesar 5 MB membatasi riwayat pada sekitar 3.700
transaksi. Halaman Pengaturan menampilkan pemakaian dan memperingatkan saat
melewati 80 persen. Rincian dan mitigasi tercatat pada
[10_RISK_REGISTER.md](docs/10_RISK_REGISTER.md).
