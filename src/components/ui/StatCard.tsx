export type StatDelta = {
  value: string
  direction: 'positive' | 'negative' | 'neutral'
  label?: string
}

export type StatCardProps = {
  kicker: string
  value: string
  delta?: StatDelta
  hint?: string
  className?: string
}

const DELTA_CLASS: Record<StatDelta['direction'], string> = {
  positive: 'text-positive',
  negative: 'text-negative',
  neutral: 'text-muted-foreground',
}

const DELTA_MARK: Record<StatDelta['direction'], string> = {
  positive: '▲',
  negative: '▼',
  neutral: '—',
}

export default function StatCard({ kicker, value, delta, hint, className }: StatCardProps) {
  return (
    <div className={['panel-lift p-6', className].filter(Boolean).join(' ')}>
      <p className="kicker">{kicker}</p>
      <p className="num mt-4 font-display text-3xl font-black tracking-[-0.02em] text-foreground md:text-4xl">
        {value}
      </p>
      {delta && (
        <p className={['num mt-3 font-mono text-xs', DELTA_CLASS[delta.direction]].join(' ')}>
          <span aria-hidden="true">{DELTA_MARK[delta.direction]}</span> {delta.value}
          {delta.label && <span className="ml-2 text-muted-foreground">{delta.label}</span>}
        </p>
      )}
      {hint && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  )
}
