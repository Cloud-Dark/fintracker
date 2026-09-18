import type { ComponentType, SVGProps } from 'react'
import { NavLink } from 'react-router-dom'

type IconProps = SVGProps<SVGSVGElement>

const iconBase = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'square' as const,
  strokeLinejoin: 'miter' as const,
  'aria-hidden': true,
}

function IconDashboard(props: IconProps) {
  return (
    <svg {...iconBase} {...props}>
      <rect x="1.5" y="1.5" width="5.5" height="5.5" />
      <rect x="9" y="1.5" width="5.5" height="3" />
      <rect x="1.5" y="9" width="5.5" height="5.5" />
      <rect x="9" y="6.5" width="5.5" height="8" />
    </svg>
  )
}

function IconTransactions(props: IconProps) {
  return (
    <svg {...iconBase} {...props}>
      <path d="M1.5 4.5h11" />
      <path d="M10 2 12.5 4.5 10 7" />
      <path d="M14.5 11.5h-11" />
      <path d="M6 9 3.5 11.5 6 14" />
    </svg>
  )
}

function IconLedger(props: IconProps) {
  return (
    <svg {...iconBase} {...props}>
      <rect x="2" y="1.5" width="12" height="13" />
      <path d="M5 1.5v13" />
      <path d="M7.5 5h4" />
      <path d="M7.5 8h4" />
      <path d="M7.5 11h4" />
    </svg>
  )
}

function IconReports(props: IconProps) {
  return (
    <svg {...iconBase} {...props}>
      <path d="M1.5 14.5h13" />
      <rect x="3" y="8" width="2.5" height="4" />
      <rect x="6.75" y="5" width="2.5" height="7" />
      <rect x="10.5" y="2" width="2.5" height="10" />
    </svg>
  )
}

function IconAccounts(props: IconProps) {
  return (
    <svg {...iconBase} {...props}>
      <rect x="1.5" y="2.5" width="13" height="11" />
      <path d="M1.5 6h13" />
      <path d="M6 6v7.5" />
    </svg>
  )
}

function IconSentinel(props: IconProps) {
  return (
    <svg {...iconBase} {...props}>
      <path d="M8 1.5 13.5 3.5v4.5c0 3.2-2.3 5.6-5.5 6.5-3.2-.9-5.5-3.3-5.5-6.5V3.5Z" />
      <path d="M8 5.5v3.5" />
      <path d="M8 10.75v.75" />
    </svg>
  )
}

function IconSettings(props: IconProps) {
  return (
    <svg {...iconBase} {...props}>
      <path d="M2 4h12" />
      <path d="M2 8h12" />
      <path d="M2 12h12" />
      <rect x="4" y="2.5" width="3" height="3" />
      <rect x="9" y="6.5" width="3" height="3" />
      <rect x="5.5" y="10.5" width="3" height="3" />
    </svg>
  )
}

export type NavItem = {
  index: string
  to: string
  label: string
  icon: ComponentType<IconProps>
}

export const NAV_ITEMS: readonly NavItem[] = [
  { index: '01', to: '/', label: 'Dashboard', icon: IconDashboard },
  { index: '02', to: '/transaksi', label: 'Transaksi', icon: IconTransactions },
  { index: '03', to: '/buku-besar', label: 'Buku Besar', icon: IconLedger },
  { index: '04', to: '/laporan', label: 'Laporan', icon: IconReports },
  { index: '05', to: '/sentinel', label: 'Sentinel', icon: IconSentinel },
  { index: '06', to: '/akun', label: 'Akun & Kategori', icon: IconAccounts },
  { index: '07', to: '/pengaturan', label: 'Pengaturan', icon: IconSettings },
]

export type SidebarNavProps = {
  onNavigate?: () => void
}

/** Daftar navigasi yang dipakai ulang oleh sidebar desktop dan menu mobile. */
export function SidebarNav({ onNavigate }: SidebarNavProps) {
  return (
    <nav aria-label="Navigasi utama">
      <ul className="border-t border-border">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                [
                  'flex min-h-[44px] items-center gap-3 border-b border-l-[3px] border-border px-3 py-3 text-sm transition-colors duration-200 ease-editorial',
                  isActive
                    ? 'border-l-secondary bg-muted font-bold text-foreground'
                    : 'border-l-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <span className="num font-mono text-[0.625rem] tracking-[0.18em] text-muted-foreground">
                    {item.index}
                  </span>
                  <item.icon className={isActive ? 'text-secondary' : ''} />
                  <span className="flex-1">{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default function Sidebar() {
  return (
    <aside className="hidden w-[248px] shrink-0 border-r border-border lg:block">
      <div className="sticky top-[73px] py-8 pr-4">
        <p className="kicker mb-3 pl-3">Navigasi</p>
        <SidebarNav />
        <div className="mt-8 border border-border bg-muted p-3">
          <p className="kicker mb-1">Mode</p>
          <p className="font-mono text-xs text-foreground">LURING PENUH</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Seluruh data diproses di peramban ini tanpa server.
          </p>
        </div>
      </div>
    </aside>
  )
}
