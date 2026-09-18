# PRD: Aplikasi Pencatatan Keuangan (FinTrack Core)
**Document Version:** 1.0.0  
**Status:** Approved by CFO & CTO Office  
**Target Delivery:** Cross-Platform Mobile (iOS/Android) & Web  
**Executive Sponsor:** Gio (Holding CEO)  
**Coordinating Authority:** Chief of Staff (Hermes Agent)

---

## 1. Executive Summary & Core Thesis
Aplikasi Pencatatan Keuangan (FinTrack Core) dirancang untuk memecahkan dilema mendasar pembukuan UMKM dan profesional: **"Kompleksitas akuntansi double-entry membuat user enggan mencatat, sedangkan simplisitas single-entry merusak akurasi dan integritas laporan audit."**

FinTrack Core mengadopsi **Hybrid Architecture**:
- **Layer Pengguna (UI/UX):** Abstraksi Single-Entry ultra-cepat (< 3 detik per pencatatan transaksi).
- **Accounting Kernel (Engine):** Double-Entry Bookkeeping immutable di tingkat database dengan penegakan matematis `Debit = Credit`.
- **Sync & Offline Resilience:** Offline-first architecture berbasis embedded SQLite lokal dan delta synchronization ke central PostgreSQL 16.

---

## 2. Target Personas & Primary Use Cases

### Persona 1: Solopreneur & Pemilik Bisnis Jasa (e.g. Agency, Konsultan)
- **Pain Point:** Sering mencampurkan kas pribadi dan bisnis, piutang macet tidak terpantau, margin proyek bocor karena biaya tak terduga.
- **Needs:** Deteksi kebocoran kas (aging receivables alert), tracking gross margin proyek minimal 70%, dan laporan laba rugi instan.

### Persona 2: Owner UMKM Ritel / F&B
- **Pain Point:** Sinyal internet sering tidak stabil di lokasi usaha, transaksi harian bervolume tinggi, butuh rekonsiliasi kas riil vs pencatatan di akhir hari.
- **Needs:** Offline-first recording tanpa hambatan jaringan, pencocokan kas kasir, serta ekspor laporan standar perbankan/pajak.

---

## 3. Financial & Accounting Specification (Office of the CFO)

### 3.1. Core Ledger Model (Hybrid Architecture)
1. **Input Pengguna:** Pengguna hanya menginput 4 atribut:
   - Tipe Mutasi: `Pemasukan` (Income), `Pengeluaran` (Expense), `Transfer Antar Akun`.
   - Nominal (IDR > 0).
   - Akun Sumber/Tujuan (Kas Tunai, Rekening Bank, E-Wallet).
   - Kategori Alokasi.
2. **Double-Entry Engine Rule:** Setiap transaksi otomatis dikonversi menjadi minimal 2 baris ledger (`ledger_entries`):
   - **Pemasukan:** Debet Kas/Bank (Aset), Kredit Pendapatan (Revenue).
   - **Pengeluaran:** Debet Beban Operasional/COGS (Expense), Kredit Kas/Bank (Aset).
   - **Transfer Antar Rekening:** Debet Rekening Penerima, Kredit Rekening Pengirim.
   - **Pembayaran Utang:** Debet Utang Usaha (Liabilitas), Kredit Kas/Bank (Aset).
3. **Mathematical Invariant:** `SUM(Debit_Amount) - SUM(Credit_Amount) = 0` wajib dieksekusi dalam satu database transaction atomic commit. Jika delta != 0, transaksi otomatis dibatalkan (*hard rollback*).

### 3.2. Chart of Accounts (CoA) 5-Digit Standard
- `10000 - 19999`: **ASSETS** (Normal Balance: DEBET)
  - `10100`: Kas Tunai / Petty Cash
  - `10200`: Kas di Bank (Operasional & Payroll)
  - `10300`: E-Wallet / Payment Gateway Escrow
  - `10400`: Piutang Usaha (Accounts Receivable)
- `20000 - 29999`: **LIABILITIES** (Normal Balance: KREDIT)
  - `20100`: Utang Usaha (Accounts Payable)
  - `20200`: Utang Pajak & Beban Akrual
- `30000 - 39999`: **EQUITY** (Normal Balance: KREDIT)
  - `30100`: Modal Disetor
  - `30200`: Laba Ditahan (Retained Earnings)
- `40000 - 49999`: **REVENUE** (Normal Balance: KREDIT)
  - `40100`: Pendapatan Operasional / Penjualan
  - `40200`: Pendapatan Non-Operasional / Bunga
- `50000 - 59999`: **COGS / HPP** (Normal Balance: DEBET)
  - `50100`: Biaya Pokok Jasa & Subkontraktor
  - `50200`: Biaya Server & Dedicated Client Infrastructure
- `60000 - 69999`: **OPERATING EXPENSES (OPEX)** (Normal Balance: DEBET)
  - `60100`: Gaji & Upah Tim
  - `60200`: Marketing & Customer Acquisition
  - `60300`: Software, Cloud Tools & Administrasi

### 3.3. Cash Leakage Sentinel & Bank Reconciliation
- **Aging Receivables Alert:** Notifikasi berjenjang saat piutang memasuki hari ke-30, 60, dan 90 untuk mencegah kredit macet.
- **Duplicate Outflow Prevention:** Peringatan otomatis jika mendeteksi pengeluaran dengan nominal identik ke vendor yang sama dalam radius waktu 48 jam.
- **Ghost Expense Tagging:** Pengeluaran di atas Rp 1.000.000 wajib dilampiri bukti bayar (struk/nota/invoice). Jika kosong, ditandai sebagai `Unverified Expense`.
- **Two-Way Bank Reconciliation:** Pencocokan otomatis antara transaksi ledger internal dengan mutasi rekening bank (API/CSV) dengan *Zero Variance Tolerance* sebelum penutupan buku bulanan.

---

## 4. Technical Architecture & Data Model (Office of the CTO)

### 4.1. High-Level Architecture
- **Client Runtime:** Flutter / React Native dengan embedded SQLite lokal (zero network blocking).
- **Synchronization Protocol:** Pull-Push Delta Sync berbasis Watermark Sequence dan Hybrid Logical Clock (HLC).
- **Backend API Gateway:** High-performance stateless API (Fastify / Go) over HTTP/2 di balik PgBouncer.
- **Relational Database:** PostgreSQL 16 (Strict ACID compliance, immutable append-only ledger).

### 4.2. Database DDL Schema
```sql
-- 1. Master Accounts
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    type VARCHAR(32) NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
    current_balance BIGINT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Master Categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    type VARCHAR(16) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Transaction Headers
CREATE TABLE transactions (
    id UUID PRIMARY KEY, -- UUIDv7 dari client
    client_tx_id VARCHAR(64) UNIQUE NOT NULL,
    transaction_date TIMESTAMPTZ NOT NULL,
    description TEXT NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
    status VARCHAR(16) NOT NULL DEFAULT 'POSTED' CHECK (status IN ('DRAFT', 'POSTED', 'VOID')),
    sync_version BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Immutable Double-Entry Ledger
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    entry_type VARCHAR(8) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    amount BIGINT NOT NULL CHECK (amount > 0), -- Satuan terkecil (Rupiah utuh/sen)
    running_balance BIGINT NOT NULL,
    sequence_num BIGINT NOT NULL,
    prev_hash CHAR(64) NOT NULL,
    entry_hash CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger Immutability Protection: Melarang modifikasi dan penghapusan mutasi buku besar
CREATE OR REPLACE FUNCTION prevent_ledger_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger entries are immutable. Updates and deletes are prohibited. Use reversal entries.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_ledger_entries
BEFORE UPDATE OR DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_tampering();
```

---

## 5. Security, Anti-Tampering & Idempotency Rules
1. **Network Idempotency Engine:** Setiap mutasi POST/PUT wajib menyertakan header `Idempotency-Key` (UUIDv7). Redis bertindak sebagai lock store (TTL 24 jam) untuk mencegah eksekusi ganda akibat retry jaringan.
2. **Merkle-style Hash Chaining:** Setiap `ledger_entry` memvalidasi cryptographic SHA-256 hash yang merantai record sebelumnya. Scheduled worker harian memverifikasi keutuhan rantai buku besar.
3. **Reversal Pattern for Corrections:** Koreksi transaksi salah dilarang mengedit baris database. Sistem secara otomatis menerbitkan sepasang *Reversing Entries* (membalik Debet/Kredit) lalu mencatat transaksi baru yang benar.
4. **Data Protection:** TLS 1.3 in-transit, AES-256-GCM at-rest, short-lived JWT (15 min) + secure HTTP-only sliding refresh token.

---

## 6. Non-Functional Requirements (NFR)
- **Local Interaction Latency:** P99 < 16 ms untuk penambahan transaksi dan navigasi aplikasi secara lokal.
- **Sync Latency:** P95 < 200 ms untuk transaksi delta (10-50 entries) pada jaringan seluler.
- **Availability:** 99.9% uptime per bulan untuk Sync Gateway dan Backend API.
- **Disaster Recovery:** Continuous PostgreSQL WAL archiving ke offsite S3-compatible storage dengan RPO < 1 menit dan RTO < 15 menit.

---

## 7. Delivery Roadmap & Kanban 1A1J Workstream
- **Sprint 1 (Backend Core):** DDL schema setup, Double-Entry Assertion Engine, Idempotency Redis filter.
- **Sprint 2 (Client Engine):** Offline-first local SQLite setup, delta sync worker, auto-reversal flow.
- **Sprint 3 (Financial Modules):** CoA standardizer, Bank Reconciliation matching engine, Aging Receivables Sentinel.
- **Sprint 4 (Reporting & Audit):** Multi-step P&L, Cash Flow direct method, Merkle integrity validator.