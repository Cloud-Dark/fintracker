export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export type ToastItem = {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

export type ToastProps = {
  toast: ToastItem
  onDismiss: (id: string) => void
}

const VARIANT_CLASS: Record<ToastVariant, string> = {
  success: 'border-positive',
  error: 'border-negative',
  warning: 'border-warning',
  info: 'border-border',
}

const VARIANT_LABEL: Record<ToastVariant, string> = {
  success: 'Berhasil',
  error: 'Gagal',
  warning: 'Peringatan',
  info: 'Info',
}

export function Toast({ toast, onDismiss }: ToastProps) {
  return (
    <div
      role="status"
      className={[
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 border-[1.5px] bg-card p-4 shadow-hard-sm animate-slide-up',
        VARIANT_CLASS[toast.variant],
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">
        <p className="kicker mb-1">{VARIANT_LABEL[toast.variant]}</p>
        <p className="text-sm font-bold text-foreground">{toast.title}</p>
        {toast.description && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{toast.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Tutup notifikasi"
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center border border-border text-foreground hover:bg-muted"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 16 16"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
        </svg>
      </button>
    </div>
  )
}

export type ToastViewportProps = {
  toasts: ReadonlyArray<ToastItem>
  onDismiss: (id: string) => void
}

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-6 right-6 z-[60] flex w-[calc(100vw-3rem)] max-w-sm flex-col gap-3 sm:w-auto"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

export default Toast
