import { useEffect, useState } from 'react'

export default function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Kembali ke atas halaman"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={[
        'fixed bottom-6 right-6 z-30 inline-flex h-11 w-11 items-center justify-center border-[1.5px] border-border bg-card text-foreground shadow-hard-sm transition-all duration-300 ease-editorial',
        visible
          ? 'pointer-events-auto translate-y-0 opacity-100 hover:-translate-x-[2px] hover:-translate-y-[2px]'
          : 'pointer-events-none translate-y-2 opacity-0',
      ].join(' ')}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5" fill="none" aria-hidden="true">
        <path d="M8 13.5V2.5" />
        <path d="M3 7.5 8 2.5l5 5" />
      </svg>
    </button>
  )
}
