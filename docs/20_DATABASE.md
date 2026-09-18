# Skema Basis Data — FinTrack Core (localStorage)

> Status: Final
> Terakhir diperbarui: 2026-09-19
> Pemilik: Office of the CTO

Dokumen ini menetapkan skema persistensi FinTrack Core pada arsitektur
klien-saja. Skema ini merupakan pemetaan langsung dari DDL PostgreSQL 16 pada
proposal arsitektur awal (lihat `plan.md` bagian 4.2) ke struktur JSON yang
disimpan di `localStorage` browser. Konteks keputusan penyimpangan arsitektur
ada pada [04_TRD.md](04_TRD.md) dan [05_ARCHITECTURE.md](05_ARCHITECTURE.md).

---

## 1. Prinsip Desain

1. **Klien-saja (client-only).** Tidak ada server, tidak ada database
   relasional sungguhan. Seluruh state persisten hidup di `localStorage`
   milik browser pengguna.
2. **Offline-first.** Aplikasi berfungsi penuh tanpa jaringan. Tidak ada
   asumsi konektivitas pada jalur baca maupun tulis.
3. **Append-only ledger.** Baris buku besar (`ledger_entries`) tidak pernah
   diubah atau dihapus setelah ditulis. Koreksi dilakukan melalui entri
   pembalik (reversal), bukan mutasi baris.
4. **Namespace kunci `fintrack:v1:*`.** Seluruh kunci `localStorage` yang
   dipakai aplikasi diawali `fintrack:v1:` agar terisolasi dari data lain
   pada origin yang sama dan agar versi skema dapat dibedakan secara
   eksplisit dalam nama kunci itu sendiri.
5. **Akses tunggal melalui repository layer.** Tidak ada komponen React yang
   boleh memanggil `localStorage` secara langsung (lihat TR-001 pada
   [04_TRD.md](04_TRD.md)).

---

## 2. Daftar Kunci localStorage

| Kunci                         | Bentuk | Deskripsi                                                                          |
| ----------------------------- | ------ | ---------------------------------------------------------------------------------- |
| `fintrack:v1:meta`            | objek  | Metadata skema: versi skema, sequence number ledger terakhir, tanda waktu seeding. |
| `fintrack:v1:accounts`        | array  | Daftar akun Chart of Accounts (padanan tabel `accounts`).                          |
| `fintrack:v1:categories`      | array  | Daftar kategori transaksi (padanan tabel `categories`).                            |
| `fintrack:v1:transactions`    | array  | Header transaksi (padanan tabel `transactions`).                                   |
| `fintrack:v1:ledger_entries`  | array  | Baris buku besar double-entry, append-only (padanan tabel `ledger_entries`).       |
| `fintrack:v1:attachments`     | array  | Metadata bukti bayar/lampiran yang tertaut ke transaksi.                           |
| `fintrack:v1:reconciliations` | array  | Catatan hasil rekonsiliasi bank dua arah.                                          |
| `fintrack:v1:settings`        | objek  | Preferensi pengguna dan konfigurasi aplikasi (non-akuntansi).                      |

Setiap kunci berisi string JSON hasil `JSON.stringify` dari nilai bertipe
sebagaimana didefinisikan pada bagian 3. Tidak ada normalisasi lintas kunci
selain melalui field ID (foreign key logis, ditegakkan di kernel aplikasi,
bukan oleh `localStorage`).

---

## 3. Struktur Data per Koleksi

### 3.1. Account (`fintrack:v1:accounts`)

```ts
interface Account {
  id: string // UUIDv7, padanan `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  code: string // padanan `code VARCHAR(32) UNIQUE NOT NULL`
  name: string // padanan `name VARCHAR(128) NOT NULL`
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' // padanan CHECK constraint pada `type`
  currency: 'IDR' // padanan `currency VARCHAR(3) NOT NULL DEFAULT 'IDR'`
  currentBalance: number // integer, satuan rupiah utuh; padanan `current_balance BIGINT NOT NULL DEFAULT 0`
  isActive: boolean // padanan `is_active BOOLEAN NOT NULL DEFAULT TRUE`
  createdAt: string // ISO 8601; padanan `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  updatedAt: string // ISO 8601; padanan `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
}
```

### 3.2. Category (`fintrack:v1:categories`)

```ts
interface Category {
  id: string // UUIDv7; padanan `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  name: string // padanan `name VARCHAR(128) NOT NULL`
  type: 'INCOME' | 'EXPENSE' // padanan CHECK constraint pada `type`
  parentId: string | null // padanan `parent_id UUID REFERENCES categories(id) ON DELETE SET NULL`
  defaultAccountCode: string // ekstensi kernel klien: `code` Account tujuan default saat kategori dipakai
  isActive: boolean // padanan `is_active BOOLEAN NOT NULL DEFAULT TRUE`
  updatedAt: string // ISO 8601; padanan `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
}
```

Catatan: field `defaultAccountCode` tidak ada pada DDL PostgreSQL asli. Field
ini ditambahkan sebagai kompensasi karena tidak ada lapisan logika mapping
kategori→akun di sisi server; kernel klien membutuhkannya untuk menentukan
akun default saat pengguna memilih kategori pada formulir transaksi.

### 3.3. Transaction (`fintrack:v1:transactions`)

```ts
interface Transaction {
  id: string // UUIDv7 dari klien; padanan `id UUID PRIMARY KEY` (bukan default gen_random_uuid, sesuai DDL asli)
  clientTxId: string // padanan `client_tx_id VARCHAR(64) UNIQUE NOT NULL`
  transactionDate: string // ISO 8601; padanan `transaction_date TIMESTAMPTZ NOT NULL`
  description: string // padanan `description TEXT NOT NULL`
  categoryId: string // padanan `category_id UUID REFERENCES categories(id) ON DELETE RESTRICT`
  mutationType: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'DEBT_PAYMENT' // ekstensi klien, lihat catatan di bawah
  amount: number // integer, satuan rupiah utuh
  sourceAccountId: string // akun sumber (sisi kredit pada arus keluar)
  destinationAccountId: string // akun tujuan (sisi debit pada arus masuk)
  status: 'DRAFT' | 'POSTED' | 'VOID' // padanan `status VARCHAR(16) NOT NULL DEFAULT 'POSTED' CHECK (...)`
  reversesTransactionId: string | null // ekstensi klien: menandai transaksi ini sebagai pembalik transaksi lain
  attachmentId: string | null // tautan ke Attachment, mendukung aturan Ghost Expense Tagging
  isVerified: boolean // ekstensi klien: bukti bayar terlampir untuk pengeluaran > Rp 1.000.000
  syncVersion: number // padanan `sync_version BIGINT NOT NULL`
  createdAt: string // ISO 8601; padanan `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  updatedAt: string // ISO 8601; padanan `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
}
```

Catatan: DDL asli tidak memiliki kolom `mutation_type`, `source_account_id`,
`destination_account_id`, `reverses_transaction_id`, `attachment_id`, maupun
`is_verified` secara eksplisit — kolom-kolom tersebut lazimnya berasal dari
tabel bantu atau logika service layer pada arsitektur server-penuh. Karena
FinTrack Core tidak memiliki server, field ini dipindahkan langsung ke header
`Transaction` agar kernel klien dapat menyusun pasangan `ledger_entries`
tanpa join lintas tabel tambahan.

### 3.4. LedgerEntry (`fintrack:v1:ledger_entries`)

```ts
interface LedgerEntry {
  id: string // UUIDv7; padanan `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  transactionId: string // padanan `transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT`
  accountId: string // padanan `account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT`
  entryType: 'DEBIT' | 'CREDIT' // padanan CHECK constraint pada `entry_type`
  amount: number // integer > 0, satuan rupiah utuh; padanan `amount BIGINT NOT NULL CHECK (amount > 0)`
  runningBalance: number // padanan `running_balance BIGINT NOT NULL`
  sequenceNum: number // padanan `sequence_num BIGINT NOT NULL`, monotonic global
  prevHash: string // 64 karakter heksadesimal; padanan `prev_hash CHAR(64) NOT NULL`
  entryHash: string // 64 karakter heksadesimal; padanan `entry_hash CHAR(64) NOT NULL`
  createdAt: string // ISO 8601; padanan `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
}
```

### 3.5. Meta (`fintrack:v1:meta`)

```ts
interface Meta {
  schemaVersion: number // versi skema saat ini, dipakai fungsi migrate berantai
  lastSequenceNum: number // sequence_num global terakhir yang terpakai pada ledger_entries
  seededAt: string | null // ISO 8601, waktu Chart of Accounts & kategori default pertama kali di-seed
}
```

`Meta` tidak berpadanan langsung dengan satu tabel PostgreSQL; ia adalah
padanan gabungan dari nilai yang pada arsitektur server biasanya berasal dari
sequence generator database, migration table, dan seed script terpisah.

---

## 4. Pemetaan Fitur DDL PostgreSQL → localStorage

| Fitur PostgreSQL asli                                                               | Padanan di klien                                                                                                                                | Di mana ditegakkan                                                                                                               |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `DEFAULT gen_random_uuid()`                                                         | Generator UUIDv7 lokal (`crypto.getRandomValues` + timestamp) dipanggil eksplisit sebelum insert                                                | Repository layer, saat membuat objek baru                                                                                        |
| `UNIQUE` (mis. `accounts.code`, `transactions.client_tx_id`)                        | Pemindaian linear/lookup Map in-memory sebelum flush; ditolak dengan error aplikasi bila duplikat                                               | Unit-of-work, tahap `validate`                                                                                                   |
| `CHECK (type IN (...))`                                                             | Union type TypeScript + validasi runtime pada boundary repository (guard function)                                                              | Repository layer, tahap `validate` sebelum `stage` dikonfirmasi                                                                  |
| `CHECK (amount > 0)`                                                                | Validasi runtime eksplisit pada kernel ledger sebelum entri di-append                                                                           | Kernel akuntansi (ledger service), tahap `validate`                                                                              |
| `FOREIGN KEY ... REFERENCES ... ON DELETE RESTRICT/SET NULL`                        | Validasi keberadaan ID target pada koleksi terkait sebelum commit; tidak ada penegakan referensial otomatis oleh storage                        | Repository layer, tahap `validate`, menolak commit bila referensi tidak ditemukan                                                |
| `TRIGGER prevent_ledger_tampering` (larang `UPDATE`/`DELETE` pada `ledger_entries`) | Repository `LedgerRepository` hanya mengekspos method `append()` dan `read()`; tidak ada method `update`/`delete` pada permukaan API TypeScript | Desain antarmuka modul (compile-time) + guard runtime yang melempar `LedgerImmutableError` bila dipanggil melalui jalur internal |
| `TIMESTAMPTZ`                                                                       | String ISO 8601 UTC (`new Date().toISOString()`)                                                                                                | Setiap titik penulisan `createdAt`/`updatedAt` di repository layer                                                               |
| `BIGINT`                                                                            | `number` JavaScript, dibatasi pada rentang integer aman (`Number.isSafeInteger`), satuan rupiah utuh tanpa desimal                              | Validasi tipe pada boundary repository (TR-006)                                                                                  |
| Transaksi ACID (`BEGIN`/`COMMIT`/`ROLLBACK`)                                        | Unit-of-work in-memory dengan snapshot pra-mutasi dan flush berurutan (lihat bagian 6)                                                          | Modul `unitOfWork` di kernel akuntansi                                                                                           |
| Sequence generator server (`sequence_num`)                                          | Counter monotonic disimpan pada `fintrack:v1:meta.lastSequenceNum`, di-increment secara atomik dalam unit-of-work yang sama                     | Kernel ledger, tahap `stage`                                                                                                     |

---

## 5. Indeks In-Memory saat Bootstrap

Karena `localStorage` hanya mendukung pencarian berbasis kunci string dan
tidak memiliki indeks kolom, kernel aplikasi membangun tiga struktur `Map`
di memori setiap kali aplikasi dimuat (bootstrap), dengan menyisir seluruh
isi `fintrack:v1:ledger_entries`, `fintrack:v1:transactions`, dan
`fintrack:v1:accounts` satu kali:

| Indeks              | Struktur                        | Alasan performa                                                                                                                                                                                                |
| ------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ledger per akun     | `Map<accountId, LedgerEntry[]>` | Perhitungan saldo akun dan laporan buku besar per akun (NFR-002: render laporan < 500 ms pada 10.000 baris) memerlukan akses O(1) ke seluruh entri suatu akun tanpa memindai seluruh array ledger setiap kali. |
| Transaksi per bulan | `Map<'YYYY-MM', Transaction[]>` | Laporan P&L dan arus kas per periode adalah operasi paling sering dipanggil; pengelompokan di muka menghindari pemindaian linear seluruh riwayat transaksi pada setiap render laporan.                         |
| Akun per kode       | `Map<code, Account>`            | Resolusi `defaultAccountCode` pada Category dan lookup akun saat entry form disubmit terjadi pada jalur interaksi pengguna (NFR-001: P99 < 16 ms), sehingga harus O(1), bukan `Array.find`.                    |

Indeks ini adalah cache turunan (derived state), bukan sumber kebenaran.
Sumber kebenaran tetap array mentah pada `localStorage`; indeks dibangun
ulang penuh setiap bootstrap dan diperbarui secara incremental setelah
setiap commit unit-of-work yang berhasil.

---

## 6. Unit-of-Work / Emulasi Commit Atomik

Karena `localStorage` tidak memiliki transaksi lintas kunci, setiap mutasi
yang menyentuh lebih dari satu koleksi (mis. posting transaksi yang menulis
`transactions` dan `ledger_entries` sekaligus, serta memperbarui
`current_balance` pada `accounts`) mengikuti siklus berikut:

1. **Begin** — Ambil snapshot mendalam (`structuredClone`) dari seluruh
   kunci `localStorage` yang akan disentuh oleh operasi ini.
2. **Stage** — Terapkan seluruh perubahan hanya pada salinan in-memory
   (bukan `localStorage`): tambahkan baris baru, hitung `runningBalance`
   dan `entryHash` berikutnya, increment `lastSequenceNum`.
3. **Validate** — Jalankan seluruh invarian pada bagian 7 dan Tabel pada
   bagian 4 (keseimbangan debit-kredit TR-003, unik `clientTxId` TR-008,
   `amount > 0`, referensi ID valid). Bila ada pelanggaran, lempar error
   khusus (`LedgerImbalanceError`, dll.) tanpa menyentuh `localStorage`
   sama sekali.
4. **Flush** — Tulis seluruh koleksi yang berubah ke `localStorage` secara
   berurutan menggunakan `setItem`. Urutan penulisan ditetapkan tetap
   (`accounts` → `transactions` → `ledger_entries` → `meta`) agar bila
   terjadi kegagalan di tengah (mis. `QuotaExceededError`), state yang
   sudah tertulis dapat dipulihkan secara deterministik.
5. **Rollback** — Bila `flush` gagal pada kunci ke-N, seluruh kunci yang
   sudah sempat tertulis pada langkah 4 ditimpa kembali dengan nilai dari
   snapshot langkah 1, mengembalikan `localStorage` ke kondisi sebelum
   operasi dimulai. Error asli kemudian dilempar ke pemanggil.

Unit-of-work ini adalah padanan fungsional dari `BEGIN`/`COMMIT`/`ROLLBACK`
PostgreSQL, dengan durabilitas yang lebih lemah (tidak ada write-ahead log)
namun cukup untuk menjamin konsistensi logis pada satu tab browser aktif.

---

## 7. Aturan Integritas

### 7.1. Immutability Ledger

`fintrack:v1:ledger_entries` hanya menerima operasi tambah di akhir array
(append). Tidak ada jalur kode yang diizinkan melakukan `splice`, penulisan
ulang elemen, atau penghapusan pada array ini. Koreksi kesalahan dilakukan
dengan menerbitkan sepasang entri pembalik (Debit/Kredit tertukar) yang
merujuk `reversesTransactionId` pada header `Transaction` terkait, identik
dengan pola Reversal Pattern pada [04_TRD.md](04_TRD.md) TR-004 dan Bagian 5
`plan.md`.

### 7.2. Hash Chaining SHA-256

Setiap `LedgerEntry` baru dihitung menggunakan Web Crypto API
(`crypto.subtle.digest('SHA-256', ...)`) dengan rumus:

```
entryHash = SHA256(
  prevHash + transactionId + accountId + entryType + amount + sequenceNum + createdAt
)
```

`prevHash` pada entri baru selalu sama dengan `entryHash` dari entri
sebelumnya yang memiliki `sequenceNum` tertinggi. Entri pertama pada seluruh
riwayat ledger (genesis) menggunakan `prevHash` berupa 64 karakter `'0'`
(`"0".repeat(64)`), identik dengan konvensi genesis block pada sistem
hash-chained.

Integritas rantai dapat diverifikasi kapan pun dengan menyusuri seluruh
`ledger_entries` terurut `sequenceNum` dan memastikan `entry[i].prevHash ===
entry[i-1].entryHash` untuk seluruh i, serta menghitung ulang `entryHash`
tiap baris untuk mendeteksi tampering pada data yang tersimpan.

### 7.3. Sequence Number Monotonic

`sequenceNum` bersifat global lintas akun (bukan per akun), diambil dari
`fintrack:v1:meta.lastSequenceNum + 1` pada tahap `stage` unit-of-work, dan
nilai baru disimpan kembali ke `meta.lastSequenceNum` pada tahap `flush`
yang sama. Nilai ini tidak pernah digunakan ulang, bahkan setelah entri
pembalik diterbitkan.

---

## 8. Migrasi Skema

`fintrack:v1:meta.schemaVersion` menyimpan versi skema integer yang berlaku
saat ini (dimulai dari `1` untuk struktur pada dokumen ini). Saat aplikasi
dimuat, kernel bootstrap membandingkan `schemaVersion` tersimpan dengan
versi target pada kode aplikasi:

- Bila sama, tidak ada tindakan.
- Bila `schemaVersion` tersimpan lebih rendah, kernel menjalankan daftar
  fungsi migrasi secara berantai, satu per kenaikan versi
  (`migrateV1toV2`, `migrateV2toV3`, dst.), masing-masing menerima seluruh
  koleksi versi lama dan mengembalikan koleksi versi baru tanpa efek
  samping (fungsi murni). Setiap fungsi migrasi ditulis dan diuji secara
  independen, dan dijalankan di dalam unit-of-work yang sama seperti
  bagian 6 agar migrasi yang gagal di tengah tidak meninggalkan state
  campuran.
- Bila `schemaVersion` tersimpan lebih tinggi dari versi yang dikenal kode
  aplikasi (mis. pengguna membuka build lama setelah memakai build baru),
  aplikasi menolak menulis dan menampilkan peringatan agar pengguna
  memperbarui aplikasi, mencegah kerusakan data akibat downgrade diam-diam.

Setelah seluruh fungsi migrasi berjalan sukses, `meta.schemaVersion`
diperbarui ke versi target dan seluruh koleksi hasil migrasi ditulis dalam
satu `flush`.

---

## 9. Kuota & Batasan

- Kuota `localStorage` diasumsikan konservatif sebesar **5 MB** per origin
  (batas nyata bervariasi antar-browser; 5 MB adalah batas bawah aman
  lintas Chrome, Firefox, Safari terkini).
- Estimasi ukuran rata-rata satu `LedgerEntry` tersimpan (setelah
  `JSON.stringify`, termasuk dua hash 64-karakter dan overhead struktur
  JSON) adalah **~500 byte**. Dengan asumsi ini, kapasitas efektif kira-kira
  10.000 baris ledger sebelum mendekati batas, sejalan dengan target NFR-002
  pada [04_TRD.md](04_TRD.md) yang diuji pada skala 10.000 baris.
- Aplikasi memantau total ukuran seluruh kunci `fintrack:v1:*` (byte length
  string tersimpan) setiap kali unit-of-work berhasil `flush`, dan
  menampilkan peringatan kepada pengguna saat penggunaan mencapai **ambang
  80%** dari 5 MB (~4 MB).
- Saat ambang tercapai, pengguna dianjurkan melakukan **ekspor arsip**:
  mengunduh envelope JSON penuh (lihat bagian 11) dari data yang ada,
  kemudian secara opsional memangkas transaksi lama yang sudah
  terekonsiliasi dari `localStorage` aktif (dipindah ke arsip eksternal),
  sesuai anjuran TR-010.

---

## 10. Seed Data Awal

Saat pertama kali aplikasi dijalankan pada origin baru (terdeteksi dari
`fintrack:v1:meta` yang belum ada), kernel bootstrap melakukan seeding satu
kali:

- **Chart of Accounts default** — akun inti pada rentang kode standar
  (Kas/Bank pada kelompok ASET, Utang pada kelompok LIABILITY, Modal pada
  EQUITY, Pendapatan Operasional/Non-Operasional pada REVENUE, serta
  COGS/HPP dan OPEX pada EXPENSE), mengikuti struktur kode akun yang
  ditetapkan pada [22_ACCOUNTING_SPEC.md](22_ACCOUNTING_SPEC.md).
- **Kategori default** — kategori INCOME dan EXPENSE dasar yang masing-masing
  ditautkan ke `defaultAccountCode` yang relevan, agar pengguna baru dapat
  langsung mencatat transaksi tanpa konfigurasi manual.

Setelah seeding selesai, `meta.seededAt` diisi dengan tanda waktu ISO 8601
saat itu, dan proses seeding tidak akan diulang selama kunci
`fintrack:v1:meta` masih ada. Rincian lengkap daftar akun dan kategori,
termasuk kode dan saldo normal masing-masing, didokumentasikan pada
[22_ACCOUNTING_SPEC.md](22_ACCOUNTING_SPEC.md) sebagai sumber kebenaran
tunggal (single source of truth) — dokumen ini tidak menduplikasi daftar
tersebut agar tidak terjadi drift antara dua dokumen.

---

## 11. Ekspor/Impor JSON

Seluruh isi `localStorage` bernamespace `fintrack:v1:*` dapat diekspor
sebagai satu berkas JSON (envelope backup), memenuhi NFR-005 (ekspor JSON
penuh tersedia setiap saat). Bentuk envelope:

```ts
interface BackupEnvelope {
  formatVersion: 1 // versi format berkas ekspor, independen dari schemaVersion internal
  schemaVersion: number // salinan fintrack:v1:meta.schemaVersion saat ekspor dibuat
  exportedAt: string // ISO 8601, waktu ekspor dibuat
  checksum: string // SHA-256 atas representasi JSON dari field `data` (deteksi korupsi berkas)
  data: {
    meta: Meta
    accounts: Account[]
    categories: Category[]
    transactions: Transaction[]
    ledgerEntries: LedgerEntry[]
    attachments: unknown[] // metadata lampiran; struktur rinci di luar cakupan dokumen ini
    reconciliations: unknown[] // catatan rekonsiliasi; struktur rinci di luar cakupan dokumen ini
    settings: Record<string, unknown>
  }
}
```

Proses **impor** menjalankan langkah berikut di dalam satu unit-of-work
(bagian 6): validasi `checksum`, validasi `schemaVersion` (migrasi berantai
dijalankan bila perlu, sesuai bagian 8), validasi seluruh invarian pada
bagian 7 dan Tabel bagian 4 atas seluruh data yang diimpor, baru kemudian
`flush` menimpa seluruh kunci `fintrack:v1:*` yang relevan secara atomik.
Impor yang gagal validasi tidak mengubah `localStorage` sama sekali.
