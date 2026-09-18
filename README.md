# FinTrack Core

Aplikasi pencatatan keuangan yang secepat catatan single-entry di sisi pengguna,
namun seakurat pembukuan double-entry di sisi mesin.

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

## Menjalankan

```bash
npm install
npm run dev      # server pengembangan
npm run build    # artefak produksi ke dist/
npm run preview  # pratinjau hasil build
npm test         # uji unit
```

Prasyarat: Node.js 20 atau lebih baru.

## Penerapan (Cloudflare Pages)

| Pengaturan | Nilai |
|---|---|
| Build command | `npm run build` |
| Output directory | `dist` |
| SPA fallback | `public/_redirects` berisi `/* /index.html 200` |

## Dokumentasi

Seluruh dokumentasi proyek berada di [`docs/`](docs/README.md).

| Dokumen | Isi |
|---|---|
| [00_PROJECT_CHARTER.md](docs/00_PROJECT_CHARTER.md) | Visi, scope, kriteria sukses |
| [01_PRD.md](docs/01_PRD.md) | Kebutuhan produk dan user story |
| [03_FRD.md](docs/03_FRD.md) | Kebutuhan fungsional ber-ID |
| [04_TRD.md](docs/04_TRD.md) | Kebutuhan teknis dan stack |
| [05_ARCHITECTURE.md](docs/05_ARCHITECTURE.md) | Arsitektur berlapis dan alur data |
| [20_DATABASE.md](docs/20_DATABASE.md) | Skema penyimpanan `localStorage` |
| [22_ACCOUNTING_SPEC.md](docs/22_ACCOUNTING_SPEC.md) | Spesifikasi akuntansi dan Chart of Accounts |
| [23_DESIGN.md](docs/23_DESIGN.md) | Sistem desain |
| [24_DESIGN_TOKEN.md](docs/24_DESIGN_TOKEN.md) | Token desain siap implementasi |
| [17_DEVELOPER_SETUP.md](docs/17_DEVELOPER_SETUP.md) | Panduan pengembang |

## Batasan yang Diketahui

Data terikat pada satu peramban di satu perangkat dan akan hilang bila data
situs dibersihkan. Tidak ada otentikasi maupun enkripsi at-rest. Lakukan ekspor
cadangan JSON secara berkala. Rincian dan mitigasi tercatat pada
[10_RISK_REGISTER.md](docs/10_RISK_REGISTER.md).
