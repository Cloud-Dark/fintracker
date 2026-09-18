import type { ReactNode } from 'react'

export type EmptyStateProps = {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export default function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center border-[1.5px] border-dashed border-border px-6 py-14 text-center',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <svg
        width="72"
        height="56"
        viewBox="0 0 72 56"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-muted-foreground"
        aria-hidden="true"
      >
        <rect x="6" y="6" width="60" height="44" />
        <path d="M6 18h60M22 18v32" />
        <path d="M30 26h28M30 34h28M30 42h18" strokeOpacity="0.5" />
        <path d="M10 26h8M10 34h8M10 42h8" strokeOpacity="0.3" />
      </svg>
      <h4 className="mt-6 font-display text-lg font-black tracking-[-0.005em] text-foreground md:text-xl">
        {title}
      </h4>
      {description && (
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
