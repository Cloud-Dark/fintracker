import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Header from '@/components/layout/Header'
import Sidebar, { SidebarNav } from '@/components/layout/Sidebar'
import Footer from '@/components/layout/Footer'
import BackToTop from '@/components/layout/BackToTop'

export type AppLayoutProps = {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuPanelRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Fokus masuk ke panel saat menu terbuka, lalu dikembalikan saat ditutup.
    const previouslyFocused = document.activeElement as HTMLElement | null
    menuPanelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus?.()
    }
  }, [menuOpen])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-border focus:bg-card focus:px-3 focus:py-2 focus:font-mono focus:text-xs"
      >
        Lompat ke konten
      </a>

      <Header onOpenMenu={() => setMenuOpen((open) => !open)} menuOpen={menuOpen} />

      <div className="mx-auto flex w-full max-w-[1280px] flex-1 px-4">
        <Sidebar />
        <main id="konten" className="min-w-0 flex-1 py-10 lg:py-14 lg:pl-8">
          {children}
        </main>
      </div>

      <Footer />
      <BackToTop />

      {/* Menu mobile: bottom sheet berbingkai, bukan panel melayang berbayang lembut. */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/60"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            id="menu-navigasi-mobile"
            ref={menuPanelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi"
            tabIndex={-1}
            className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto border-t-[1.5px] border-border bg-card p-4 animate-slide-up"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="kicker">Navigasi</p>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Tutup menu navigasi"
                className="inline-flex h-10 w-10 items-center justify-center border border-border text-foreground hover:bg-muted"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
                </svg>
              </button>
            </div>
            <SidebarNav onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
