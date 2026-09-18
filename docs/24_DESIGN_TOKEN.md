# Token Desain — FinTrack Core

> Status: Final
> Terakhir diperbarui: 2026-09-19
> Pemilik: Design Office

Dokumen ini berisi token siap implementasi untuk sistem desain "Ledger Desk". Filosofi dan aturan pemakaian ada di [23_DESIGN.md](23_DESIGN.md). Token warna dasar diturunkan dari `docs/design_token.md` milik APIPedia Connect, ditambah token khusus keuangan untuk FinTrack Core.

---

## 1. Token Warna

### 1.1 Light Mode — Mint Paper & Ink

| Token | Nilai HSL | CSS Variable | Penggunaan |
|---|---|---|---|
| Background | 160 24% 95% | `--background` | Latar halaman (kertas mint) |
| Foreground | 185 30% 8% | `--foreground` | Teks utama (tinta near-black) |
| Card | 160 30% 98% | `--card` | Permukaan kartu/stat card |
| Card Foreground | 185 30% 8% | `--card-foreground` | Teks di atas kartu |
| Primary | 185 30% 9% | `--primary` | Aksi utama (ink) |
| Primary Foreground | 160 30% 97% | `--primary-foreground` | Teks di atas primary |
| Secondary (Signal) | 162 55% 45% | `--secondary` | Aksen mint — satu-satunya warna signal |
| Secondary Foreground | 185 30% 8% | `--secondary-foreground` | Teks di atas signal |
| Muted | 160 14% 89% | `--muted` | Latar subtle, hover baris |
| Muted Foreground | 185 10% 36% | `--muted-foreground` | Teks sekunder, netral angka |
| Border | 185 22% 20% | `--border` | Border dan pemisah standar |
| Grid Line | 185 20% 40% | `--grid-line` | Pola dot/ledger grid |
| Shadow Ink | 185 30% 9% | `--shadow-ink` | Warna offset shadow |
| Rule | 185 22% 20% / alpha 0.12 | `--rule` | Garis zebra tipis tabel ledger |
| Positive | 162 55% 38% | `--positive` | Nilai positif/pemasukan, badge POSTED |
| Negative | 18 45% 32% | `--negative` | Nilai negatif/pengeluaran, badge VOID |
| Warning | 38 70% 42% | `--warning` | Sentinel/peringatan, badge Unverified |
| Destructive | 6 55% 30% | `--destructive` | Aksi destruktif eksplisit (hapus permanen) |

### 1.2 Dark Mode — Teal Ink Console

| Token | Nilai HSL | CSS Variable | Penggunaan |
|---|---|---|---|
| Background | 190 45% 5% | `--background` | Latar halaman gelap |
| Foreground | 165 20% 92% | `--foreground` | Teks terang |
| Card | 190 38% 8% | `--card` | Permukaan kartu gelap |
| Card Foreground | 165 20% 92% | `--card-foreground` | Teks di atas kartu gelap |
| Primary | 162 42% 48% | `--primary` | Aksi utama (mint di dark mode) |
| Primary Foreground | 190 45% 6% | `--primary-foreground` | Teks di atas primary |
| Secondary (Signal) | 162 42% 48% | `--secondary` | Aksen mint (sedikit didesaturasi) |
| Secondary Foreground | 190 45% 6% | `--secondary-foreground` | Teks di atas signal |
| Muted | 190 30% 12% | `--muted` | Latar subtle gelap |
| Muted Foreground | 175 12% 62% | `--muted-foreground` | Teks sekunder, netral angka |
| Border | 186 24% 20% | `--border` | Border standar gelap |
| Grid Line | 175 18% 30% | `--grid-line` | Pola dot/ledger grid gelap |
| Shadow Ink | 162 42% 42% | `--shadow-ink` | Offset shadow (mint redup di dark mode) |
| Rule | 186 24% 20% / alpha 0.18 | `--rule` | Garis zebra tipis tabel ledger gelap |
| Positive | 162 48% 52% | `--positive` | Nilai positif/pemasukan (mint terang) |
| Negative | 18 55% 58% | `--negative` | Nilai negatif/pengeluaran (rust terang) |
| Warning | 38 75% 58% | `--warning` | Sentinel/peringatan (amber terang) |
| Destructive | 6 60% 55% | `--destructive` | Aksi destruktif eksplisit |

### 1.3 Blok Kode CSS

```css
:root {
  /* Base surfaces */
  --background: 160 24% 95%;
  --foreground: 185 30% 8%;
  --card: 160 30% 98%;
  --card-foreground: 185 30% 8%;
  --popover: 160 30% 98%;
  --popover-foreground: 185 30% 8%;

  /* Actions */
  --primary: 185 30% 9%;
  --primary-foreground: 160 30% 97%;
  --secondary: 162 55% 45%;
  --secondary-foreground: 185 30% 8%;

  /* Supporting */
  --muted: 160 14% 89%;
  --muted-foreground: 185 10% 36%;
  --accent: 162 55% 45%;
  --accent-foreground: 185 30% 8%;

  /* Lines & structure */
  --border: 185 22% 20%;
  --input: 185 22% 20%;
  --ring: 162 55% 45%;
  --grid-line: 185 20% 40%;
  --rule: 185 22% 20%;
  --shadow-ink: 185 30% 9%;

  /* Finance semantics */
  --positive: 162 55% 38%;
  --negative: 18 45% 32%;
  --warning: 38 70% 42%;
  --destructive: 6 55% 30%;
  --destructive-foreground: 160 30% 97%;

  /* Radius (hard edges — selalu 0) */
  --radius: 0rem;
}

.dark {
  --background: 190 45% 5%;
  --foreground: 165 20% 92%;
  --card: 190 38% 8%;
  --card-foreground: 165 20% 92%;
  --popover: 190 38% 8%;
  --popover-foreground: 165 20% 92%;

  --primary: 162 42% 48%;
  --primary-foreground: 190 45% 6%;
  --secondary: 162 42% 48%;
  --secondary-foreground: 190 45% 6%;

  --muted: 190 30% 12%;
  --muted-foreground: 175 12% 62%;
  --accent: 162 42% 48%;
  --accent-foreground: 190 45% 6%;

  --border: 186 24% 20%;
  --input: 186 24% 20%;
  --ring: 162 42% 48%;
  --grid-line: 175 18% 30%;
  --rule: 186 24% 20%;
  --shadow-ink: 162 42% 42%;

  --positive: 162 48% 52%;
  --negative: 18 55% 58%;
  --warning: 38 75% 58%;
  --destructive: 6 60% 55%;
  --destructive-foreground: 190 45% 6%;

  --radius: 0rem;
}
```

---

## 2. Token Tipografi

| Token | Nilai |
|---|---|
| `--font-sans` | `'Archivo', sans-serif` |
| `--font-display` | `'Archivo', sans-serif` (weight 800–900) |
| `--font-mono` | `'JetBrains Mono', monospace` |

| Token | Ukuran | Line-height | Letter-spacing |
|---|---|---|---|
| `--text-h1` | 36px / md:60px / lg:72px | 1.08 | -0.03em |
| `--text-h2` | 30px / md:48px | 1.15 | -0.02em |
| `--text-h3` | 24px / md:30px | 1.2 | -0.01em |
| `--text-h4` | 18px / md:22px | 1.25 | -0.005em |
| `--text-body` | 14px / md:16px | 1.6 | 0 |
| `--text-body-lg` | 18px / md:20px | 1.6 | 0 |
| `--text-caption` | 12px / 13px | 1.4 | 0.01em |
| `--text-kicker` | 10px / 11px | 1.3 | 0.18em–0.3em (uppercase) |
| `--text-mono-data` | 13px / 14px | 1.4 | 0 (tabular-nums) |

---

## 3. Token Spacing & Radius

| Token | Tailwind | Nilai px |
|---|---|---|
| `--container-padding` | px-4 | 16px |
| `--section-py` | py-20 | 80px |
| `--section-py-md` | md:py-28 | 112px |
| `--card-padding` | p-6 | 24px |
| `--grid-gap` | gap-8 / gap-10 | 32px / 40px |
| `--heading-mb` | mb-6 / mb-7 | 24px / 28px |

| Token | Nilai |
|---|---|
| `--radius` | 0rem |
| `--radius-sm` | 0rem |
| `--radius-md` | 0rem |
| `--radius-lg` | 0rem |

*Seluruh radius bernilai 0 — tidak ada rounded corners di kartu, tombol, atau badge.*

---

## 4. Token Shadow

| Token | Nilai | Penggunaan |
|---|---|---|
| `--shadow-hard` | `8px 8px 0 hsl(var(--shadow-ink))` | Modal, elemen hero yang butuh penekanan kuat |
| `--shadow-hard-sm` | `5px 5px 0 hsl(var(--shadow-ink))` | Kartu statistik, tombol primer |
| `--shadow-hard-xs` | `3px 3px 0 hsl(var(--shadow-ink))` | Badge, elemen kecil |
| `--shadow-card-hover` | `translate(-3px, -3px) + 5px 5px 0 hsl(var(--shadow-ink))` | State hover kartu/tombol (hover-lift) |

---

## 5. Token Animasi & Easing

| Token | Durasi | Easing |
|---|---|---|
| `--ease-editorial` | — | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `--anim-reveal` | 0.7s | `var(--ease-editorial)` |
| `--anim-slide-up` | 0.7s | `var(--ease-editorial)` |
| `--anim-fade-in` | 0.6s | ease-out |
| `--anim-scale-in` | 0.6s | `var(--ease-editorial)` |
| `--anim-hover-lift` | 0.2s | `var(--ease-editorial)` |
| `--anim-pulse-dot` | 1.4s loop | ease-in-out |
| `--anim-marquee` | 30s linear infinite | linear |

---

## 6. Blok Kode `tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        "grid-line": "hsl(var(--grid-line))",
        rule: "hsl(var(--rule))",
        "shadow-ink": "hsl(var(--shadow-ink))",
        positive: "hsl(var(--positive))",
        negative: "hsl(var(--negative))",
        warning: "hsl(var(--warning))",
      },
      fontFamily: {
        sans: ["Archivo", "sans-serif"],
        display: ["Archivo", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "var(--radius)",
        sm: "var(--radius)",
      },
      boxShadow: {
        "hard": "8px 8px 0 hsl(var(--shadow-ink))",
        "hard-sm": "5px 5px 0 hsl(var(--shadow-ink))",
        "hard-xs": "3px 3px 0 hsl(var(--shadow-ink))",
      },
      transitionTimingFunction: {
        editorial: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        reveal: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        reveal: "reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-up": "slideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        marquee: "marquee 30s linear infinite",
        "pulse-dot": "pulse-dot 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

---

## 7. Import Google Fonts

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link
  href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap"
  rel="stylesheet"
>
```

---

## 8. Script Anti-Flash Theme

Dijalankan inline di `<head>` sebelum aplikasi mount, agar tidak ada kedipan tema saat load pertama.

```html
<script>
  (function () {
    try {
      var STORAGE_KEY = "fintrack:v1:theme";
      var stored = localStorage.getItem(STORAGE_KEY);
      var theme = stored === "light" || stored === "dark"
        ? stored
        : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

      var root = document.documentElement;
      if (theme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
      root.setAttribute("data-theme", theme);
    } catch (e) {
      // localStorage tidak tersedia (mode privat/blokir) — fallback diam ke light mode.
    }
  })();
</script>
```

---

## Referensi Silang

- Filosofi, prinsip, pola komponen, dan aturan penerapan: [23_DESIGN.md](23_DESIGN.md)
