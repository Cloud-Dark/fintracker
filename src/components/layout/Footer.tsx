import { Link } from 'react-router-dom'
import { DEMO_URL, REPO_URL } from '@/lib/links'

const LINK_GROUPS: ReadonlyArray<{
  title: string
  links: ReadonlyArray<{ label: string; to: string }>
}> = [
  {
    title: 'Ringkasan',
    links: [
      { label: 'Dashboard', to: '/' },
      { label: 'Laporan', to: '/laporan' },
    ],
  },
  {
    title: 'Pembukuan',
    links: [
      { label: 'Transaksi', to: '/transaksi' },
      { label: 'Buku Besar', to: '/buku-besar' },
      { label: 'Sentinel', to: '/sentinel' },
    ],
  },
  {
    title: 'Konfigurasi',
    links: [
      { label: 'Akun & Kategori', to: '/akun' },
      { label: 'Pengaturan', to: '/pengaturan' },
    ],
  },
]

/** Tautan keluar aplikasi; dibedakan dari navigasi internal karena memakai `<a>`. */
const EXTERNAL_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: 'Kode Sumber (GitHub)', href: REPO_URL },
  { label: 'Demo Langsung', href: DEMO_URL },
]

export default function Footer() {
  return (
    <footer className="border-t-[1.5px] border-border">
      <div className="mx-auto max-w-[1280px] px-4 py-14">
        <div className="grid grid-cols-1 border-l border-t border-border sm:grid-cols-2 lg:grid-cols-5">
          <div className="border-b border-r border-border p-6">
            <p className="font-display text-lg font-black tracking-[-0.04em] text-foreground">
              FINTRACK CORE
            </p>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Pembukuan berpasangan yang presisi, berjalan penuh di peramban tanpa server.
            </p>
          </div>
          {LINK_GROUPS.map((group) => (
            <div key={group.title} className="border-b border-r border-border p-6">
              <p className="kicker mb-4">{group.title}</p>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-muted-foreground transition-colors duration-200 ease-editorial hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="border-b border-r border-border p-6">
            <p className="kicker mb-4">Proyek</p>
            <ul className="space-y-2">
              {EXTERNAL_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-200 ease-editorial hover:text-foreground"
                  >
                    {link.label}
                    {/* Penanda tautan keluar; aria-hidden karena maknanya sudah
                        disampaikan oleh label tautan itu sendiri. */}
                    <span aria-hidden="true" className="font-mono text-[0.625rem]">
                      &#8599;
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="kicker">Build v{__APP_VERSION__} — Ledger Desk</p>
          <p className="kicker">Data tersimpan lokal di peramban ini</p>
          <p className="kicker">&copy; {new Date().getFullYear()} FinTrack Core</p>
        </div>
      </div>
    </footer>
  )
}
