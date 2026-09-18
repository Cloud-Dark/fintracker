# Requirements Traceability Matrix — FinTrack Core

> Status: Final
> Terakhir diperbarui: 2026-09-19
> Pemilik: Office of the CTO

Matriks ini memetakan setiap kebutuhan fungsional (`FR-NNN`) pada
[03_FRD.md](03_FRD.md) ke kebutuhan teknis terkait pada [04_TRD.md](04_TRD.md),
fase implementasi pada [06_IMPLEMENTATION_PLAN.md](06_IMPLEMENTATION_PLAN.md),
dan modul kode yang direncanakan.

**Catatan penomoran:** [03_FRD.md](03_FRD.md) menggunakan penomoran berkelompok
per bagian (FR-001–004, FR-010–011, FR-020–024, FR-030–033, FR-040–042,
FR-050–051) dengan celah yang disengaja untuk ruang penambahan di masa depan.
Tabel di bawah hanya memuat ID yang benar-benar didefinisikan di FRD; ID yang
tidak muncul di FRD tidak dicantumkan agar tidak mengarang kebutuhan yang
tidak ada.

| FR     | Judul                            | TR Terkait (04_TRD.md)                                     | Fase (06_IMPLEMENTATION_PLAN.md) | Modul Kode Direncanakan                                                 |
| ------ | -------------------------------- | ---------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------- |
| FR-001 | Quick Entry                      | TR-001                                                     | Fase 4                           | `src/pages/QuickEntry.tsx`                                              |
| FR-002 | Konversi Double-Entry Otomatis   | TR-003                                                     | Fase 2                           | `src/domain/postingRules.ts`, `src/domain/kernel.ts`                    |
| FR-003 | Reversal untuk Koreksi           | TR-004                                                     | Fase 2                           | `src/domain/reversal.ts`                                                |
| FR-004 | Draft Transaksi                  | TR-001, TR-002                                             | Fase 1                           | `src/data/repositories/transactions.ts`                                 |
| FR-010 | Chart of Accounts                | TR-001                                                     | Fase 1                           | `src/data/seed/chartOfAccounts.ts`, `src/data/repositories/accounts.ts` |
| FR-011 | Kategori                         | TR-001                                                     | Fase 1                           | `src/data/repositories/categories.ts`                                   |
| FR-020 | Dashboard                        | TR-009                                                     | Fase 4                           | `src/pages/Dashboard.tsx`                                               |
| FR-021 | Buku Besar                       | TR-009                                                     | Fase 3                           | `src/domain/reports/ledgerView.ts`                                      |
| FR-022 | Laporan Laba Rugi Multi-Step     | TR-006, TR-009                                             | Fase 3                           | `src/domain/reports/profitLoss.ts`                                      |
| FR-023 | Laporan Neraca                   | TR-006, TR-009                                             | Fase 3                           | `src/domain/reports/balanceSheet.ts`                                    |
| FR-024 | Laporan Arus Kas (Direct Method) | TR-006, TR-009                                             | Fase 3                           | `src/domain/reports/cashFlow.ts`                                        |
| FR-030 | Aging Receivables Alert          | TR-009                                                     | Fase 3                           | `src/domain/sentinel/agingReceivables.ts`                               |
| FR-031 | Duplicate Outflow Prevention     | TR-009                                                     | Fase 3                           | `src/domain/sentinel/duplicateOutflow.ts`                               |
| FR-032 | Ghost Expense Tagging            | TR-006                                                     | Fase 3                           | `src/domain/sentinel/ghostExpense.ts`                                   |
| FR-033 | Rekonsiliasi Bank                | _TBD_ (belum ada TR spesifik untuk impor CSV rekonsiliasi) | Fase 4 (Could, F-16)             | _TBD_                                                                   |
| FR-040 | Verifikasi Rantai Hash           | TR-005                                                     | Fase 2, Fase 3                   | `src/domain/hashChain.ts`                                               |
| FR-041 | Ekspor & Impor                   | NFR-005                                                    | Fase 4                           | `src/data/exportImport.ts`                                              |
| FR-042 | Operasi Offline Penuh            | TR-001, NFR-003                                            | Seluruh fase                     | `src/data/storageAdapter.ts`                                            |
| FR-050 | Mode Terang dan Gelap            | TR-012                                                     | Fase 4                           | `src/theme/useTheme.ts`                                                 |
| FR-051 | Responsif                        | TR-012                                                     | Fase 0, Fase 4                   | `src/layout/AppShell.tsx`, `tailwind.config.ts`                         |

## Referensi

- [03_FRD.md](03_FRD.md)
- [04_TRD.md](04_TRD.md)
- [06_IMPLEMENTATION_PLAN.md](06_IMPLEMENTATION_PLAN.md)
