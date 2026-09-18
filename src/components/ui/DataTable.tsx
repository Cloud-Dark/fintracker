import { useEffect, useMemo, useState, type ReactNode } from 'react'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'

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
  /**
   * Mengaktifkan pemotongan halaman. Dibiarkan mati secara bawaan agar tabel
   * pendek (misalnya Chart of Accounts) tetap tampil utuh tanpa kontrol
   * navigasi yang tidak berguna.
   */
  paginate?: boolean
  /** Jumlah baris per halaman saat pertama kali dirender. */
  initialPageSize?: number
  pageSizeOptions?: ReadonlyArray<number>
  /** Kata benda jamak pada ringkasan paginasi, misalnya "transaksi". */
  itemLabel?: string
  /**
   * Nilai yang, saat berubah, mengembalikan tampilan ke halaman pertama.
   * Diisi dengan representasi filter aktif supaya pengguna tidak terjebak di
   * halaman kosong setelah mempersempit hasil.
   */
  resetKey?: string
  /** Tinggi maksimum area gulir vertikal, misalnya `'70vh'`. */
  maxBodyHeight?: string
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
  paginate = false,
  initialPageSize = 25,
  pageSizeOptions,
  itemLabel = 'baris',
  resetKey,
  maxBodyHeight,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const pageCount = paginate ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1

  // Halaman aktif dijepit ke rentang sah: menghapus baris atau memperbesar
  // ukuran halaman dapat membuat halaman terakhir tidak lagi ada.
  useEffect(() => {
    setPage((current) => Math.min(current, pageCount))
  }, [pageCount])

  // Perubahan filter mengembalikan pengguna ke halaman pertama.
  useEffect(() => {
    setPage(1)
  }, [resetKey])

  const visibleRows = useMemo(() => {
    if (!paginate) return rows
    const start = (page - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }, [paginate, rows, page, pageSize])

  const offset = paginate ? (page - 1) * pageSize : 0

  if (rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        className={className}
      />
    )
  }

  return (
    <div className={['w-full border border-border bg-card', className].filter(Boolean).join(' ')}>
      {/*
        Wadah gulir yang dapat difokuskan lewat keyboard. Gulir mendatar menjaga
        tabel lebar tetap terbaca di layar sempit; gulir menegak hanya aktif bila
        `maxBodyHeight` diberikan, dengan kepala tabel yang melekat.
      */}
      <div
        role="region"
        aria-label={caption ?? 'Tabel data'}
        tabIndex={0}
        style={maxBodyHeight ? { maxHeight: maxBodyHeight } : undefined}
        className={[
          'scroll-ledger w-full overflow-x-auto',
          maxBodyHeight ? 'overflow-y-auto' : '',
          'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <table className="w-full min-w-[640px] border-collapse text-sm">
          {caption && <caption className="kicker px-4 py-3 text-left">{caption}</caption>}
          <thead className={maxBodyHeight ? 'sticky top-0 z-10 bg-card' : undefined}>
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
            {visibleRows.map((row, indexOnPage) => (
              // `rowIndex` sengaja dihitung absolut terhadap seluruh baris, bukan
              // relatif terhadap halaman, agar penomoran pada kolom render tetap
              // berlanjut ketika pengguna berpindah halaman.
              <RowCells
                key={
                  getRowKey ? getRowKey(row, offset + indexOnPage) : String(offset + indexOnPage)
                }
                row={row}
                rowIndex={offset + indexOnPage}
                columns={columns}
              />
            ))}
          </tbody>
        </table>
      </div>

      {paginate && (
        <Pagination
          page={page}
          pageCount={pageCount}
          totalRows={rows.length}
          rangeStart={offset + 1}
          rangeEnd={offset + visibleRows.length}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
          pageSizeOptions={pageSizeOptions}
          itemLabel={itemLabel}
        />
      )}
    </div>
  )
}

/** Satu baris tabel; dipisah agar `rowIndex` absolut jelas terbaca. */
function RowCells<T>({
  row,
  rowIndex,
  columns,
}: {
  row: T
  rowIndex: number
  columns: ReadonlyArray<Column<T>>
}) {
  return (
    <tr className="border-b border-rule/30 transition-colors duration-150 ease-editorial last:border-b-0 hover:bg-muted">
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
  )
}
