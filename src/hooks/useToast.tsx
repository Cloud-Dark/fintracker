import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastViewport, type ToastItem, type ToastVariant } from '@/components/ui/Toast'

export type ToastInput = {
  title: string
  description?: string
  variant?: ToastVariant
}

export type ToastContextValue = {
  toasts: ReadonlyArray<ToastItem>
  push: (input: ToastInput) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const AUTO_DISMISS_MS = 4000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    ({ title, description, variant = 'info' }: ToastInput) => {
      const id = `toast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      setToasts((prev) => [...prev, { id, title, description, variant }])
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), AUTO_DISMISS_MS),
      )
      return id
    },
    [dismiss],
  )

  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach((timer) => clearTimeout(timer))
      pending.clear()
    }
  }, [])

  const value = useMemo<ToastContextValue>(() => ({ toasts, push, dismiss }), [toasts, push, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast harus dipakai di dalam <ToastProvider>.')
  return context
}
