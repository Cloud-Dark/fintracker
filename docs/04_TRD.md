# Technical Requirements Document — FinTrack Core

> Status: Final
> Terakhir diperbarui: 2026-09-19
> Pemilik: Office of the CTO

## 1. Stack Teknologi

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Build tool | Vite 5 | Build cepat, output statis siap Cloudflare Pages |
| UI framework | React 18 + TypeScript (strict) | Ekosistem matang, tipe ketat untuk domain akuntansi |
| Routing | React Router 6 (hash-free, SPA fallback) | Navigasi klien tanpa server |
| Styling | Tailwind CSS 3 + CSS custom properties | Token terpusat, lihat [23_DESIGN.md](23_DESIGN.md) |
| State | React Context + reducer per domain | Cukup untuk skala data lokal, tanpa dependensi tambahan |
| Persistensi | `localStorage` melalui repository layer | Lihat [20_DATABASE.md](20_DATABASE.md) |
| Hashing | Web Crypto API (`crypto.subtle.digest`) | SHA-256 native, tanpa dependensi |
| ID | UUIDv7 implementasi lokal (time-ordered) | Urutan monotonic tanpa pustaka eksternal |
| Uji | Vitest | Terintegrasi dengan Vite |
| Deploy | Cloudflare Pages (static) | Sesuai permintaan pemilik proyek |

## 2. Kebutuhan Teknis

### TR-001 — Persistensi Lokal

Seluruh data persisten disimpan pada `localStorage` dengan namespace kunci
`fintrack:v1:*`. Akses ke `localStorage` hanya boleh melalui repository layer,
tidak pernah langsung dari komponen React.

### TR-002 — Atomic Commit Emulation

Karena `localStorage` tidak memiliki transaksi, penulisan multi-koleksi
dilakukan melalui unit-of-work: seluruh mutasi dikumpulkan di memori, divalidasi,
lalu di-flush secara berurutan. Bila flush gagal di tengah jalan, snapshot
sebelum mutasi dipulihkan.

### TR-003 — Penegakan Invarian Double-Entry

Sebelum commit, kernel memvalidasi `SUM(debit) - SUM(credit) = 0` untuk setiap
transaksi. Delta bukan nol memicu pembatalan penuh dan melempar
`LedgerImbalanceError`.

### TR-004 — Immutability Ledger

Repository ledger hanya mengekspos operasi `append` dan `read`. Tidak ada
operasi `update` maupun `delete`. Koreksi hanya melalui reversal.

### TR-005 — Hash Chaining

Setiap baris ledger menyimpan `prev_hash` dan `entry_hash`, dengan
`entry_hash = SHA256(prev_hash + transaction_id + account_id + entry_type + amount + sequence_num + created_at)`.
Entri pertama menggunakan `prev_hash` berupa 64 karakter nol (genesis).

### TR-006 — Representasi Nominal

Semua nominal disimpan sebagai `number` bilangan bulat dalam satuan rupiah utuh.
Operasi aritmetika pecahan dilarang; pembulatan dilakukan pada lapisan tampilan.

### TR-007 — Sequence Number Monotonic

`sequence_num` bersifat global, monotonic naik, dan tidak pernah digunakan ulang,
disimpan pada kunci meta terpisah.

### TR-008 — Idempotensi Lokal

Setiap transaksi memiliki `client_tx_id` unik. Penyimpanan ulang dengan
`client_tx_id` yang sama dikembalikan sebagai no-op yang sukses.

### TR-009 — Performa

Indeks dalam memori (`Map`) dibangun saat bootstrap untuk ledger per akun dan
transaksi per periode, agar pembacaan laporan tidak memindai seluruh koleksi.

### TR-010 — Kuota Penyimpanan

Aplikasi memantau penggunaan `localStorage` dan memperingatkan pengguna pada
ambang 80% dari perkiraan kuota 5 MB, disertai anjuran ekspor arsip.

### TR-011 — Batas Ketergantungan

Tidak ada dependensi runtime pihak ketiga selain React, React Router, dan
Tailwind. Pustaka tanggal, UUID, dan hashing diimplementasikan lokal.

### TR-012 — Aksesibilitas

Kontras teks tubuh minimal 4.5:1, cincin fokus terlihat pada seluruh kontrol
interaktif, dan `prefers-reduced-motion` dihormati.

### TR-013 — Deployment

Artefak build berupa direktori statis `dist/`. SPA fallback dikonfigurasi melalui
`public/_redirects` berisi `/* /index.html 200`.

## 3. Penyimpangan dari Spesifikasi Awal

Spesifikasi awal mensyaratkan PostgreSQL 16, Redis, dan backend stateless.
Pemilik proyek menetapkan arsitektur klien-saja berbasis `localStorage`.
Pemetaan lengkap beserta konsekuensinya tercatat pada
[11_DECISIONS.md](11_DECISIONS.md) ADR-001 sampai ADR-004, dan risikonya pada
[10_RISK_REGISTER.md](10_RISK_REGISTER.md).

## 4. Non-Functional Requirements

| ID | Kebutuhan | Target |
|---|---|---|
| NFR-001 | Latensi interaksi lokal | P99 di bawah 16 ms |
| NFR-002 | Waktu render laporan | Di bawah 500 ms pada 10.000 baris ledger |
| NFR-003 | Ketersediaan | Berfungsi penuh tanpa jaringan |
| NFR-004 | Ukuran bundel | Di bawah 300 KB gzip |
| NFR-005 | Ketahanan data | Ekspor JSON penuh tersedia setiap saat |
| NFR-006 | Waktu muat pertama | Di bawah 1.5 detik pada koneksi 3G cepat |
