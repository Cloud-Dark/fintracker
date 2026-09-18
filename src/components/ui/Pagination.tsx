import { useMemo } from 'react'
import { buildPages } from '@/lib/pagination'

export type PaginationProps = {
  /** Halaman aktif, berbasis 1. */
  page: number
  /** Jumlah halaman; selalu minimal 1 agar kontrol tetap konsisten. */
  pageCount: number
  /** Jumlah baris keseluruhan sebelum pemotongan halaman. */
  totalRows: number
  /** Indeks baris pertama dan terakhir pada halaman aktif, berbasis 1. */
  rangeStart: number
  rangeEnd: number
  onPageChange: (page: number) => void
  pageSize: number
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: ReadonlyArray<number>
  /** Kata benda jamak untuk label ringkasan, misalnya "transaksi". */
  itemLabel?: string
}

const STEP_CLASS =
  'inline-flex min-h-[36px] min-w-[36px] items-center justify-center border border-border bg-card px-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-foreground transition-colors duration-150 ease-editorial hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

export default function Pagination({
  page,
  pageCount,
  totalRows,
  rangeStart,
  rangeEnd,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  itemLabel = 'baris',
}: PaginationProps) {
  const pages = useMemo(() => buildPages(page, pageCount), [page, pageCount])

  return (
    <nav
      aria-label="Navigasi halaman tabel"
      className="flex flex-col gap-3 border-t-[1.5px] border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      {/* Ringkasan posisi; aria-live agar pembaca layar mendengar perpindahan halaman. */}
      <p aria-live="polite" className="font-mono text-[0.6875rem] text-muted-foreground">
        Menampilkan <span className="num text-foreground">{rangeStart}</span>–
        <span className="num text-foreground">{rangeEnd}</span> dari{' '}
        <span className="num text-foreground">{totalRows}</span> {itemLabel}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange && (
          <label className="mr-1 flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            <span>Baris</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="field min-h-[36px] w-auto py-1 font-mono text-[0.6875rem]"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          type="button"
          className={STEP_CLASS}
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Halaman sebelumnya"
        >
          Sebelumnya
        </button>

        <ul className="flex items-center gap-1">
          {pages.map((item, index) =>
            item === 'gap' ? (
              <li
                key={`gap-${index}`}
                aria-hidden="true"
                className="px-1 font-mono text-[0.6875rem] text-muted-foreground"
              >
                …
              </li>
            ) : (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => onPageChange(item)}
                  aria-current={item === page ? 'page' : undefined}
                  aria-label={`Halaman ${item}`}
                  className={[
                    STEP_CLASS,
                    'num px-0',
                    // Halaman aktif memakai satu-satunya sinyal mint pada kontrol ini.
                    item === page
                      ? 'border-accent bg-accent text-accent-foreground hover:bg-accent'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {item}
                </button>
              </li>
            )
          )}
        </ul>

        <button
          type="button"
          className={STEP_CLASS}
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Halaman berikutnya"
        >
          Berikutnya
        </button>
      </div>
    </nav>
  )
}
