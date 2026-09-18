import type { ReactNode } from 'react'
import EmptyState from '@/components/ui/EmptyState'

export type ColumnAlign = 'left' | 'right' | 'center'

export type Column<T> = {
  key: string
  header: string
  align?: ColumnAlign
  render?: (row: T, rowIndex: number) => ReactNode
  className?: string
}

export type DataTableProps<T> = {
  columns: ReadonlyArray<Column<T>>
  rows: ReadonlyArray<T>
  getRowKey?: (row: T, rowIndex: number) => string
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  caption?: string
  className?: string
}

const ALIGN_CLASS: Record<ColumnAlign, string> = {
  left: 'text-left',
  right: 'text-right num',
  center: 'text-center',
}

function defaultCell<T>(row: T, key: string): ReactNode {
  const value = (row as Record<string, unknown>)[key]
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string' || typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak'
  return String(value)
}

export default function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyTitle = 'Belum ada data',
  emptyDescription = 'Slot buku besar ini masih kosong.',
  emptyAction,
  caption,
  className,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} className={className} />
  }

  return (
    <div className={['w-full overflow-x-auto border border-border bg-card', className].filter(Boolean).join(' ')}>
      <table className="w-full min-w-[640px] border-collapse text-sm">
        {caption && <caption className="kicker px-4 py-3 text-left">{caption}</caption>}
        <thead>
          <tr className="border-b-[1.5px] border-border">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={[
                  'px-4 py-3 font-mono text-[0.625rem] font-bold uppercase tracking-[0.18em] text-muted-foreground',
                  ALIGN_CLASS[column.align ?? 'left'],
                  column.className,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={getRowKey ? getRowKey(row, rowIndex) : String(rowIndex)}
              className="border-b border-rule/30 transition-colors duration-150 ease-editorial last:border-b-0 hover:bg-muted"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={[
                    'px-4 py-3 align-middle text-foreground',
                    ALIGN_CLASS[column.align ?? 'left'],
                    column.className,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {column.render ? column.render(row, rowIndex) : defaultCell(row, column.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
