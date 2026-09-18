import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react'

export type ModalProps = {
  open: boolean
  onClose: () => void
  kicker?: string
  title: string
  description?: string
  children?: ReactNode
  actions?: ReactNode
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Modal({
  open,
  onClose,
  kicker,
  title,
  description,
  children,
  actions,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      // Fokus trap sederhana: putar fokus di dalam panel.
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (nodes.length === 0) {
        event.preventDefault()
        return
      }
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !panelRef.current.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown, true)

    const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
    if (nodes && nodes.length > 0) nodes[0].focus()
    else panelRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus?.()
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-foreground/70" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className="relative z-10 w-full max-w-lg border-[1.5px] border-border bg-card p-6 shadow-hard animate-slide-up"
      >
        {kicker && <p className="kicker mb-3">{kicker}</p>}
        <h3
          id={titleId}
          className="font-display text-xl font-black tracking-[-0.01em] text-foreground md:text-2xl"
        >
          {title}
        </h3>
        {description && (
          <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
        {children && <div className="mt-5">{children}</div>}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          {actions ?? (
            <button type="button" className="btn-ghost min-h-[40px]" onClick={onClose}>
              Tutup
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
