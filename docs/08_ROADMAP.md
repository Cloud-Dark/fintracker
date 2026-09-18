# Roadmap — FinTrack Core

> Status: Final
> Terakhir diperbarui: 2026-09-19
> Pemilik: Office of the CTO

Status: 📋 direncanakan · 🚧 sedang berjalan · ✅ selesai

## Milestone

| Versi | Cakupan                                                                    | Status |
| ----- | -------------------------------------------------------------------------- | ------ |
| v0.1  | Fase 0 Scaffolding: proyek Vite+React+TS+Tailwind, routing, layout shell   | ✅     |
| v0.2  | Fase 1 Persistence Layer: repository localStorage, unit-of-work, seed CoA  | ✅     |
| v0.3  | Fase 2 Accounting Kernel: posting rules, invarian, hash chain, reversal    | ✅     |
| v0.4  | Fase 3 Reporting & Sentinel: P&L, Neraca, Arus Kas, Buku Besar, sentinel   | ✅     |
| v0.9  | Fase 4 UI Lengkap: dashboard, quick entry, laporan, settings, ekspor/impor | ✅     |
| v1.0  | Deploy produksi ke Cloudflare Pages, seluruh user story terverifikasi      | 🚧     |

## Catatan Status per 2026-09-19

Fase 0 sampai Fase 4 telah diimplementasikan dan diverifikasi melalui
pemeriksaan tipe, build produksi, serta uji unit Vitest. Milestone v1.0 berstatus
sedang berjalan: artefak build siap, panduan penerapan tersedia pada
[18_INSTALLATION.md](18_INSTALLATION.md), namun penerapan ke Cloudflare Pages
belum dieksekusi dan menunggu keputusan pemilik proyek.

## Rencana Pasca-v1

| Inisiatif                                                                                          | Deskripsi                                                                     | Status   |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------- |
| Sinkronisasi multi-perangkat                                                                       | Delta sync berbasis watermark/HLC ke backend terpusat, mengembalikan          |
| scope PostgreSQL/Redis yang dikeluarkan dari v1 (lihat [11_DECISIONS.md](11_DECISIONS.md) ADR-004) | 📋 _TBD_                                                                      |
| Aplikasi mobile                                                                                    | Pembungkus mobile (native atau PWA) di atas domain logic yang sama            | 📋 _TBD_ |
| Integrasi API bank                                                                                 | Rekonsiliasi otomatis via API perbankan, menggantikan impor CSV manual (F-16) | 📋 _TBD_ |
| Autentikasi multi-user                                                                             | JWT/refresh token, otorisasi berbasis peran                                   | 📋 _TBD_ |
| Enkripsi at-rest                                                                                   | Proteksi data lokal, lihat [10_RISK_REGISTER.md](10_RISK_REGISTER.md) R-003   | 📋 _TBD_ |

Prioritas dan jadwal pasti untuk item pasca-v1 belum diputuskan oleh pemilik
proyek dan ditandai _TBD_ sampai ada keputusan formal berikutnya (lihat
[11_DECISIONS.md](11_DECISIONS.md)).

## Referensi

- [06_IMPLEMENTATION_PLAN.md](06_IMPLEMENTATION_PLAN.md)
- [07_MASTER_CHECKLIST.md](07_MASTER_CHECKLIST.md)
- [11_DECISIONS.md](11_DECISIONS.md)
