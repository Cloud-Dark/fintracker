import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import {
  addDays,
  addMonths,
  buildMonthGrid,
  isOutOfRange,
  monthLabel,
  monthOf,
  parseISO,
  WEEKDAY_NAMES_ID,
  type YearMonth,
} from '@/lib/calendar'
import { formatDateID, toISODate } from '@/lib/date'

export type DatePickerProps = {
  /** Tanggal ISO `YYYY-MM-DD`, atau string kosong bila belum dipilih. */
  value: string
  onChange: (iso: string) => void
  id?: string
  name?: string
  /** Batas bawah dan atas, keduanya inklusif. */
  min?: string
  max?: string
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
  className?: string
}

/**
 * Pemilih tanggal React, menggantikan `input type="date"` bawaan peramban.
 *
 * Alasan menggantinya: panel kalender bawaan digambar oleh sistem operasi
 * sehingga tidak dapat mengikuti bahasa visual Editorial Brutalism, dan
 * tampilannya berbeda-beda antar peramban. Kalender ini digambar sendiri
 * sehingga seragam di mana pun.
 *
 * Ditulis tanpa pustaka tanggal pihak ketiga, konsisten dengan TR-011; seluruh
 * perhitungan kalendernya berada pada `src/lib/calendar.ts` dan diuji terpisah.
 *
 * Pola ARIA mengikuti dialog kalender: pemicu membawa `aria-haspopup="dialog"`,
 * kisi hari memakai `role="grid"`, dan setiap sel `role="gridcell"`. Fokus
 * berpindah ke kisi saat panel dibuka sehingga navigasi papan tik langsung
 * bekerja tanpa Tab tambahan.
 */
export default function DatePicker({
  value,
  onChange,
  id,
  name,
  min,
  max,
  placeholder = 'Pilih tanggal',
  disabled = false,
  invalid = false,
  describedBy,
  className,
}: DatePickerProps) {
  const generatedId = useId()
  const rootId = id ?? generatedId
  const gridId = `${rootId}-grid`

  const today = useMemo(() => toISODate(new Date()), [])
  const fallbackMonth = useMemo<YearMonth>(() => {
    const parts = parseISO(today)
    return parts ? { year: parts.year, month: parts.month } : { year: 2026, month: 1 }
  }, [today])

  const [open, setOpen] = useState(false)
  const [view, setView] = useState<YearMonth>(() => monthOf(value, fallbackMonth))
  // Tanggal yang sedang disorot papan tik; selalu ada selama panel terbuka
  // supaya `aria-activedescendant` tidak pernah menunjuk sel yang tiada.
  const [cursor, setCursor] = useState<string>(value || today)

  const rootRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const days = useMemo(() => buildMonthGrid(view.year, view.month), [view])
  // Kisi dipotong menjadi enam baris pekan karena `role="grid"` mensyaratkan
  // anak berperan `row`; memasang 42 sel langsung di bawahnya tidak sah.
  const weeks = useMemo(
    () => Array.from({ length: 6 }, (_, i) => days.slice(i * 7, i * 7 + 7)),
    [days]
  )

  // Menutup saat klik di luar; penyimak hanya dipasang selama panel terbuka.
  useEffect(() => {
    if (!open) return
    function handlePointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    return () => document.removeEventListener('mousedown', handlePointer)
  }, [open])

  // Saat dibuka: mulai dari bulan nilai terpilih, sorot nilai itu (atau hari
  // ini bila kosong), lalu pindahkan fokus ke kisi.
  useEffect(() => {
    if (!open) return
    const start = value || today
    setCursor(start)
    setView(monthOf(start, fallbackMonth))
    const timer = window.setTimeout(() => gridRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [open, value, today, fallbackMonth])

  // Menggeser sorotan keluar bulan yang terlihat ikut memindahkan tampilan.
  useEffect(() => {
    if (!open) return
    setView((current) => {
      const next = monthOf(cursor, current)
      return next.year === current.year && next.month === current.month ? current : next
    })
  }, [cursor, open])

  function commit(iso: string) {
    if (isOutOfRange(iso, min, max)) return
    onChange(iso)
    setOpen(false)
  }

  function moveCursor(delta: number) {
    setCursor((current) => addDays(current, delta))
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        setOpen(true)
      }
      return
    }

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        moveCursor(-1)
        break
      case 'ArrowRight':
        event.preventDefault()
        moveCursor(1)
        break
      case 'ArrowUp':
        event.preventDefault()
        moveCursor(-7)
        break
      case 'ArrowDown':
        event.preventDefault()
        moveCursor(7)
        break
      case 'PageUp':
        event.preventDefault()
        setView((current) => addMonths(current, -1))
        break
      case 'PageDown':
        event.preventDefault()
        setView((current) => addMonths(current, 1))
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        commit(cursor)
        break
      case 'Escape':
        event.preventDefault()
        setOpen(false)
        break
      case 'Tab':
        setOpen(false)
        break
      default:
        break
    }
  }

  const label = value ? formatDateID(value) : null
  const todayDisabled = isOutOfRange(today, min, max)

  return (
    <div ref={rootRef} className={['relative', className].filter(Boolean).join(' ')}>
      {/* Nilai ISO ikut terkirim bila komponen berada di dalam form. */}
      {name && <input type="hidden" name={name} value={value} />}

      <button
        type="button"
        id={rootId}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
        className={[
          'field num flex min-h-[40px] items-center justify-between gap-2 text-left',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          open ? 'border-foreground' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span className={label === null ? 'text-muted-foreground' : ''}>
          {label ?? placeholder}
        </span>
        {/* Ikon kalender dekoratif; maknanya sudah dibawa label tombol. */}
        <span aria-hidden="true" className="font-mono text-[0.625rem] text-muted-foreground">
          &#9635;
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Pilih tanggal"
          className="absolute left-0 top-[calc(100%+4px)] z-30 w-[300px] border border-border bg-card p-3 shadow-[4px_4px_0_0_hsl(var(--foreground))]"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Bulan sebelumnya"
              onClick={() => setView((current) => addMonths(current, -1))}
              className="btn-ghost h-8 w-8 p-0 font-mono text-xs"
            >
              &#8592;
            </button>
            {/* aria-live agar pembaca layar mengumumkan bulan yang berpindah. */}
            <p aria-live="polite" className="text-sm font-bold text-foreground">
              {monthLabel(view)}
            </p>
            <button
              type="button"
              aria-label="Bulan berikutnya"
              onClick={() => setView((current) => addMonths(current, 1))}
              className="btn-ghost h-8 w-8 p-0 font-mono text-xs"
            >
              &#8594;
            </button>
          </div>

          <div aria-hidden="true" className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAY_NAMES_ID.map((name) => (
              <div
                key={name}
                className="text-center font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground"
              >
                {name}
              </div>
            ))}
          </div>

          <div
            ref={gridRef}
            id={gridId}
            role="grid"
            aria-label={monthLabel(view)}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            aria-activedescendant={`${rootId}-day-${cursor}`}
            className="flex flex-col gap-1 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} role="row" className="grid grid-cols-7 gap-1">
                {week.map((day) => {
                  const isSelected = day.iso === value
                  const isCursor = day.iso === cursor
                  const isToday = day.iso === today
                  const blocked = isOutOfRange(day.iso, min, max)
                  return (
                    <button
                      key={day.iso}
                      type="button"
                      id={`${rootId}-day-${day.iso}`}
                      role="gridcell"
                      aria-selected={isSelected}
                      aria-current={isToday ? 'date' : undefined}
                      disabled={blocked}
                      tabIndex={-1}
                      onClick={() => commit(day.iso)}
                      onMouseEnter={() => setCursor(day.iso)}
                      className={[
                        'num h-9 border text-sm transition-colors duration-150 ease-editorial',
                        blocked ? 'cursor-not-allowed opacity-30' : 'cursor-pointer',
                        day.inMonth ? 'text-foreground' : 'text-muted-foreground',
                        // Tanggal terpilih adalah satu-satunya sinyal mint pada
                        // panel; sorotan papan tik cukup memakai batas tegas.
                        isSelected
                          ? 'border-accent bg-accent font-bold text-accent-foreground'
                          : isCursor
                            ? 'border-foreground bg-muted'
                            : 'border-transparent hover:bg-muted',
                        // Hari ini ditandai garis bawah ganda bila tidak terpilih.
                        isToday && !isSelected
                          ? 'underline decoration-double underline-offset-4'
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {day.day}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
            <button
              type="button"
              disabled={todayDisabled}
              onClick={() => commit(today)}
              className="btn-ghost h-8 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
              className="btn-ghost h-8 px-3 text-xs"
            >
              Kosongkan
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
