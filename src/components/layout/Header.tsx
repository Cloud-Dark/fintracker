import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ThemeToggle from '@/components/ui/ThemeToggle'

export type HeaderProps = {
  onOpenMenu: () => void
  menuOpen: boolean
}

export default function Header({ onOpenMenu, menuOpen }: HeaderProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const update = () => {
      const doc = document.documentElement
      const scrollable = doc.scrollHeight - doc.clientHeight
      setProgress(scrollable > 0 ? (doc.scrollTop / scrollable) * 100 : 0)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <header className="sticky top-0 z-40 border-b-[1.5px] border-border bg-background">
      <div className="mx-auto flex h-[72px] max-w-[1280px] items-center gap-4 px-4">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Buka menu navigasi"
          aria-expanded={menuOpen}
          className="inline-flex h-10 w-10 items-center justify-center border border-border text-foreground transition-colors duration-200 ease-editorial hover:bg-muted lg:hidden"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M1.5 4h13M1.5 8h13M1.5 12h13" />
          </svg>
        </button>

        <Link to="/" className="flex items-baseline gap-2" aria-label="FinTrack Core — beranda">
          <span className="font-display text-xl font-black tracking-[-0.04em] text-foreground">FINTRACK</span>
          <span className="kicker text-[0.625rem]">Core</span>
        </Link>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <span className="hidden items-center gap-2 border border-border px-2.5 py-1.5 sm:inline-flex">
            <span className="h-1.5 w-1.5 bg-secondary animate-pulse-dot" aria-hidden="true" />
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">Luring</span>
          </span>
          <ThemeToggle />
          <Link to="/transaksi" className="btn-primary min-h-[40px]">
            <span className="hidden sm:inline">Catat Transaksi</span>
            <span className="sm:hidden">Catat</span>
          </Link>
        </div>
      </div>

      <div className="h-[3px] w-full bg-transparent" aria-hidden="true">
        <div className="h-full bg-secondary" style={{ width: `${progress}%` }} />
      </div>
    </header>
  )
}
