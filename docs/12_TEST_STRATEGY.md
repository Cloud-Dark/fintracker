# Test Strategy — FinTrack Core

> Status: Final
> Terakhir diperbarui: 2026-09-19
> Pemilik: Office of the CTO

## 1. Piramida Uji

```
        /\
       /  \      Uji Manual UI (eksploratif, responsif, aksesibilitas)
      /----\
     /      \    Uji Integrasi (repository + kernel + laporan end-to-end)
    /--------\
   /          \  Uji Unit (kernel akuntansi, repository, sentinel) — Vitest
  /____________\
```

Fokus terbesar berada pada lapisan uji unit untuk Accounting Kernel (Fase 2),
karena kebenaran matematis ledger adalah kriteria sukses utama proyek
(lihat [00_PROJECT_CHARTER.md](00_PROJECT_CHARTER.md) bagian 6).

## 2. Cakupan Vitest — Accounting Kernel

Seluruh berkas di `src/domain/*` wajib memiliki uji Vitest yang menyertai.
Target cakupan baris minimal 90% untuk `src/domain/kernel.ts`,
`src/domain/postingRules.ts`, `src/domain/hashChain.ts`, `src/domain/reversal.ts`.

### Kasus Uji Wajib

| Kasus Uji                 | Deskripsi                                                                                                                                                     | Terkait                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Keseimbangan debit-kredit | Setiap tipe transaksi (`INCOME`, `EXPENSE`, `TRANSFER`, `DEBT_PAYMENT`) menghasilkan `SUM(debit) - SUM(credit) = 0`                                           | TR-003, FR-002         |
| Penolakan delta tidak nol | Transaksi dengan delta buatan bukan nol ditolak seluruhnya, melempar `LedgerImbalanceError`, tidak ada penulisan parsial                                      | TR-003                 |
| Reversal                  | Reversal menghasilkan pasangan reversing entries yang tepat membalik debit/kredit asal; transaksi asal berstatus `VOID`; baris ledger asal tidak berubah      | TR-004, FR-003         |
| Hash chain                | `entry_hash` setiap baris sesuai formula pada TR-005; entri pertama memakai genesis hash 64 nol; verifikasi mendeteksi entri yang dirusak secara sintetis     | TR-005, FR-040         |
| Sequence monotonic        | `sequence_num` naik secara global dan tidak pernah terpakai ulang, termasuk pada skenario transaksi paralel disimulasikan                                     | TR-007                 |
| Idempotensi               | Penyimpanan ulang transaksi dengan `client_tx_id` sama dikembalikan sebagai no-op sukses, tidak menggandakan baris ledger                                     | TR-008                 |
| Aging bucket              | Piutang dikelompokkan tepat ke bucket 0–29, 30–59, 60–89, 90+ berdasarkan tanggal transaksi vs tanggal evaluasi                                               | FR-030                 |
| Duplicate detection       | Pengeluaran nominal identik ke vendor/deskripsi sama dalam 48 jam terdeteksi; di luar rentang tidak terdeteksi                                                | FR-031                 |
| Perhitungan laporan       | P&L, Neraca (dengan invarian `Aset = Liabilitas + Ekuitas`), dan Arus Kas menghasilkan angka yang sesuai dengan data ledger uji yang telah diketahui hasilnya | FR-022, FR-023, FR-024 |

## 3. Uji Integrasi

- Alur end-to-end: input Quick Entry → posting kernel → penyimpanan repository →
  tampil di Buku Besar dan laporan.
- Alur ekspor/impor: ekspor JSON penuh, hapus data, impor kembali, verifikasi
  kesetaraan data dan rantai hash tetap valid.
- Simulasi kegagalan flush unit-of-work di tengah mutasi multi-koleksi,
  verifikasi rollback ke snapshot sebelumnya (TR-002).

## 4. Uji Manual UI

Dilakukan pada setiap rilis minor sebelum tag versi, mencakup:

- Navigasi seluruh rute pada lebar 375px, 768px, 1024px, 1440px (FR-051).
- Verifikasi kontras warna minimal 4.5:1 dan cincin fokus pada seluruh kontrol
  interaktif (TR-012).
- Verifikasi `prefers-reduced-motion` dihormati.
- Verifikasi mode terang/gelap konsisten dan preferensi tersimpan setelah reload
  (FR-050).
- Verifikasi peringatan kuota `localStorage` muncul saat ambang 80% disimulasikan.
- Uji penggunaan tanpa koneksi jaringan (mode offline browser) untuk memastikan
  FR-042 terpenuhi.

## 5. Kriteria Rilis

Sebuah versi dapat dirilis (tag) hanya bila:

1. Seluruh kasus uji wajib pada bagian 2 lulus di CI.
2. Tidak ada regresi pada uji integrasi.
3. Checklist uji manual UI pada bagian 4 telah dijalankan dan didokumentasikan.
4. `npm run build` sukses dan ukuran bundel di bawah 300 KB gzip (NFR-004).
5. Tidak ada item Must/Should terkait fase yang bersangkutan pada
   [07_MASTER_CHECKLIST.md](07_MASTER_CHECKLIST.md) yang masih terbuka.

## Referensi

- [04_TRD.md](04_TRD.md)
- [06_IMPLEMENTATION_PLAN.md](06_IMPLEMENTATION_PLAN.md)
- [19_REQUIREMENTS_TRACEABILITY.md](19_REQUIREMENTS_TRACEABILITY.md)
