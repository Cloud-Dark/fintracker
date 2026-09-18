import type { ReactNode } from 'react'

export type BadgeVariant = 'posted' | 'draft' | 'void' | 'unverified' | 'warning' | 'neutral'

export type BadgeProps = {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  posted: 'border-positive text-positive bg-secondary/10',
  draft: 'border-dashed border-muted-foreground text-muted-foreground',
  void: 'border-negative text-negative line-through',
  unverified: 'border-warning text-warning',
  warning: 'border-warning text-warning bg-warning/10',
  neutral: 'border-border text-muted-foreground',
}

export default function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span className={['badge', VARIANT_CLASS[variant], className].filter(Boolean).join(' ')}>
      {/* Penanda non-warna agar status tetap terbaca tanpa persepsi warna. */}
      {variant === 'unverified' && <span aria-hidden="true" className="mr-1 font-bold">!</span>}
      {children}
    </span>
  )
}
