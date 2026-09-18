# Indeks Dokumentasi — FinTrack Core

> Status: Final
> Terakhir diperbarui: 2026-09-19
> Pemilik: Office of the CTO

Seluruh dokumen tata kelola dan spesifikasi proyek FinTrack Core. Lihat
[plan.md](../plan.md) di root repository untuk rencana kerja penulisan
dokumentasi ini.

| Nomor | Dokumen                                                            | Isi                                                                                             |
| ----- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| 00    | [00_PROJECT_CHARTER.md](00_PROJECT_CHARTER.md)                     | Visi, problem statement, tujuan, scope in/out, stakeholder, kriteria sukses                     |
| 01    | [01_PRD.md](01_PRD.md)                                             | Kebutuhan produk, persona, fitur prioritas MoSCoW, user story, metrik sukses                    |
| 03    | [03_FRD.md](03_FRD.md)                                             | Kebutuhan fungsional ber-ID (FR-001 s.d. FR-051)                                                |
| 04    | [04_TRD.md](04_TRD.md)                                             | Stack teknologi, kebutuhan teknis (TR-001 s.d. TR-013), NFR, penyimpangan dari spesifikasi awal |
| 05    | [05_ARCHITECTURE.md](05_ARCHITECTURE.md)                           | Arsitektur sistem SPA React, lapisan data dan domain                                            |
| 06    | [06_IMPLEMENTATION_PLAN.md](06_IMPLEMENTATION_PLAN.md)             | Rencana implementasi lima fase berurutan dengan dependensi dan kriteria selesai                 |
| 07    | [07_MASTER_CHECKLIST.md](07_MASTER_CHECKLIST.md)                   | Checklist eksekusi rinci per fase implementasi                                                  |
| 08    | [08_ROADMAP.md](08_ROADMAP.md)                                     | Milestone rilis v0.1–v1.0 dan rencana pasca-v1                                                  |
| 10    | [10_RISK_REGISTER.md](10_RISK_REGISTER.md)                         | Register risiko arsitektur klien-saja beserta mitigasi dan owner                                |
| 11    | [11_DECISIONS.md](11_DECISIONS.md)                                 | Architecture Decision Records (ADR-001 s.d. ADR-008)                                            |
| 12    | [12_TEST_STRATEGY.md](12_TEST_STRATEGY.md)                         | Piramida uji, kasus uji wajib kernel akuntansi, uji manual UI, kriteria rilis                   |
| 13    | [13_GLOSSARY.md](13_GLOSSARY.md)                                   | Glosarium istilah akuntansi dan teknis                                                          |
| 17    | [17_DEVELOPER_SETUP.md](17_DEVELOPER_SETUP.md)                     | Prasyarat, perintah pengembangan, struktur folder, konvensi kode, deploy Cloudflare Pages       |
| 18    | [18_INSTALLATION.md](18_INSTALLATION.md)                           | Instalasi lokal, perintah, penerapan Cloudflare Pages, verifikasi pascapenerapan                |
| 19    | [19_REQUIREMENTS_TRACEABILITY.md](19_REQUIREMENTS_TRACEABILITY.md) | Matriks keterlusuran FR → TR → fase → modul kode                                                |
| 20    | [20_DATABASE.md](20_DATABASE.md)                                   | Skema penyimpanan `localStorage` (pengganti skema PostgreSQL asli)                              |
| 22    | [22_ACCOUNTING_SPEC.md](22_ACCOUNTING_SPEC.md)                     | Spesifikasi akuntansi: CoA, posting rules, invarian, hash chaining                              |
| 23    | [23_DESIGN.md](23_DESIGN.md)                                       | Filosofi dan sistem desain (Editorial Brutalism / Ledger Desk)                                  |
| 24    | [24_DESIGN_TOKEN.md](24_DESIGN_TOKEN.md)                           | Token desain: warna, tipografi, spacing                                                         |
| 31    | [31_CHANGELOG.md](31_CHANGELOG.md)                                 | Riwayat perubahan format Keep a Changelog                                                       |

## Catatan

- Dokumen bernomor yang belum tercantum di atas dan belum ada di direktori ini
  ditandai _TBD_ dan akan ditambahkan sesuai kebutuhan proyek berjalan.
- Direktori `plans/`, `specs/`, `standards/`, dan `uat/` di dalam `docs/`
  menyimpan artefak pendukung tambahan di luar dokumen bernomor utama.

## Artefak Uji Penerimaan

| Berkas                                                               | Isi                                                                                                                               |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [uat/2026-09-19_smoke-test-mvp.md](uat/2026-09-19_smoke-test-mvp.md) | Hasil uji penerimaan MVP versi 0.3.0: skenario UAT-01 s.d. UAT-06, verifikasi rute produksi, tolok ukur performa, dan tiga temuan |
