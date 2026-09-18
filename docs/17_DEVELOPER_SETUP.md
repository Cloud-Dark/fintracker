# Developer Setup — FinTrack Core

> Status: Final
> Terakhir diperbarui: 2026-09-19
> Pemilik: Office of the CTO

## 1. Prasyarat

- Node.js 20 atau lebih baru.
- npm (terpasang bersama Node.js).
- Git.

## 2. Instalasi

```bash
git clone <url-repository>
cd fintracker
npm install
```

## 3. Perintah Pengembangan

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Menjalankan server pengembangan Vite dengan hot module reload |
| `npm run build` | Membangun artefak produksi statis ke direktori `dist/` |
| `npm run preview` | Menjalankan pratinjau lokal atas hasil `npm run build` |
| `npm run test` | Menjalankan seluruh uji Vitest |

## 4. Struktur Folder (Direncanakan)

```
fintracker/
├─ public/
│  └─ _redirects            # SPA fallback untuk Cloudflare Pages
├─ src/
│  ├─ data/                 # Lapisan persistensi (storage adapter, repository, unit-of-work)
│  │  ├─ repositories/
│  │  ├─ seed/
│  │  └─ migrations/
│  ├─ domain/                # Accounting Kernel, reports, sentinel
│  │  ├─ reports/
│  │  └─ sentinel/
│  ├─ layout/                 # AppShell, navigasi
│  ├─ pages/                  # Halaman aplikasi (route-level components)
│  ├─ routes/                 # Definisi routing
│  ├─ styles/                 # Token desain, CSS global
│  ├─ theme/                  # Manajemen tema terang/gelap
│  ├─ App.tsx
│  └─ main.tsx
├─ docs/                      # Dokumen tata kelola dan spesifikasi
├─ package.json
├─ tsconfig.json
├─ tailwind.config.ts
└─ vite.config.ts
```

Struktur ini merujuk pada rencana modul di
[06_IMPLEMENTATION_PLAN.md](06_IMPLEMENTATION_PLAN.md) dan
[19_REQUIREMENTS_TRACEABILITY.md](19_REQUIREMENTS_TRACEABILITY.md); dapat
berubah selama implementasi berjalan.

## 5. Konvensi Kode

- TypeScript strict mode wajib aktif; tidak ada penggunaan `any` tanpa justifikasi.
- Komponen React tidak boleh mengakses `localStorage` secara langsung; seluruh
  akses data melalui lapisan `src/data/repositories/*` (TR-001).
- Logika akuntansi (posting, invarian, hash chain, reversal) ditempatkan di
  `src/domain/`, terpisah dari komponen UI, dan tidak memiliki dependensi ke React.
- Nominal uang selalu bertipe integer rupiah utuh; operasi pecahan dilarang (TR-006).
- Setiap modul kernel akuntansi wajib disertai uji Vitest, lihat
  [12_TEST_STRATEGY.md](12_TEST_STRATEGY.md).
- Penamaan berkas menggunakan `camelCase.ts` untuk modul dan `PascalCase.tsx`
  untuk komponen React.

## 6. Deploy ke Cloudflare Pages

1. Pastikan `npm run build` berhasil secara lokal dan menghasilkan `dist/`.
2. Pastikan berkas `public/_redirects` berisi baris berikut agar navigasi SPA
   berfungsi setelah refresh halaman:

   ```
   /* /index.html 200
   ```

3. Pada dashboard Cloudflare Pages, hubungkan repository dan atur:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Setiap push ke branch produksi memicu build dan deploy otomatis oleh
   Cloudflare Pages.
5. Verifikasi pasca-deploy: buka URL yang diberikan Cloudflare Pages, navigasi
   ke rute selain root (misal `/laporan/laba-rugi`), lalu refresh browser untuk
   memastikan SPA fallback berfungsi.

## Referensi

- [04_TRD.md](04_TRD.md) — TR-013 Deployment
- [06_IMPLEMENTATION_PLAN.md](06_IMPLEMENTATION_PLAN.md) — Fase 4
- [12_TEST_STRATEGY.md](12_TEST_STRATEGY.md)
