import type { ReactNode } from 'react'

export type SectionHeaderProps = {
  kicker: string
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export default function SectionHeader({ kicker, title, description, action, className }: SectionHeaderProps) {
  return (
    <div className={['mb-6', className].filter(Boolean).join(' ')}>
      <p className="kicker mb-3">{kicker} ————</p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <h2 className="text-2xl md:text-3xl">{title}</h2>
          {description && <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="rule-line mt-5" />
    </div>
  )
}
