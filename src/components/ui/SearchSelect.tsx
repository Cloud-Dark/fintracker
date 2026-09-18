import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { filterOptions, labelOf, nextHighlight, type SelectOption } from '@/lib/select'

export type SearchSelectProps = {
  options: ReadonlyArray<SelectOption>
  value: string
  onChange: (value: string) => void
  /** Teks saat belum ada pilihan. */
  placeholder?: string
  /** Baris paling atas yang mengosongkan pilihan, misalnya "Semua akun". */
  clearLabel?: string
  id?: string
  name?: string
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
  className?: string
  /** Angka dirender dengan tabular figure agar kolom kode akun rata. */
  numeric?: boolean
}

/**
 * Dropdown dengan pencarian, menggantikan `select` bawaan.
 *
 * Diterapkan sebagai pola ARIA combobox: tombol pemicu membawa
 * `role="combobox"`, daftar opsi `role="listbox"`, dan sorotan disampaikan
 * lewat `aria-activedescendant` sehingga pembaca layar tetap mengumumkan opsi
 * yang sedang disorot meski fokus DOM berada pada kotak pencarian.
 *
 * Daftar sengaja dirender inline, bukan lewat portal: panel filter dan modal
 * pada aplikasi ini tidak memotong isinya secara menegak, sehingga portal
 * hanya akan menambah kerumitan pemosisian tanpa manfaat.
 */
export default function SearchSelect({
  options,
  value,
  onChange,
  placeholder = 'Pilih…',
  clearLabel,
  id,
  name,
  disabled = false,
  invalid = false,
  describedBy,
  className,
  numeric = false,
}: SearchSelectProps) {
  const generatedId = useId()
  const rootId = id ?? generatedId
  const listboxId = `${rootId}-listbox`

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(-1)

  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Baris pengosong diperlakukan sebagai opsi biasa bernilai string kosong,
  // supaya penyaringan, navigasi papan tik, dan pemilihan hanya punya satu
  // jalur kode.
  const allOptions = useMemo<ReadonlyArray<SelectOption>>(
    () => (clearLabel ? [{ value: '', label: clearLabel }, ...options] : options),
    [clearLabel, options]
  )

  const visible = useMemo(() => filterOptions(allOptions, query), [allOptions, query])
  const selectedLabel = labelOf(allOptions, value)

  // Menutup saat klik di luar. Dipasang hanya ketika terbuka agar tidak ada
  // penyimak global yang menganggur.
  useEffect(() => {
    if (!open) return
    function handlePointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    return () => document.removeEventListener('mousedown', handlePointer)
  }, [open])

  // Saat dibuka: kosongkan kueri, sorot opsi terpilih, dan pindahkan fokus ke
  // kotak pencarian supaya pengguna dapat langsung mengetik.
  useEffect(() => {
    if (!open) return
    setQuery('')
    setHighlight(allOptions.findIndex((option) => option.value === value))
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [open, allOptions, value])

  // Menjaga opsi tersorot tetap terlihat ketika navigasi papan tik bergerak
  // melewati batas area gulir.
  useEffect(() => {
    if (!open || highlight < 0) return
    const node = listRef.current?.children[highlight] as HTMLElement | undefined
    node?.scrollIntoView({ block: 'nearest' })
  }, [open, highlight])

  function commit(option: SelectOption) {
    onChange(option.value)
    setOpen(false)
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
      case 'ArrowDown':
        event.preventDefault()
        setHighlight((current) => nextHighlight(current, visible.length, 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setHighlight((current) => nextHighlight(current, visible.length, -1))
        break
      case 'Home':
        event.preventDefault()
        setHighlight(visible.length > 0 ? 0 : -1)
        break
      case 'End':
        event.preventDefault()
        setHighlight(visible.length - 1)
        break
      case 'Enter': {
        event.preventDefault()
        const option = visible[highlight]
        if (option) commit(option)
        break
      }
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

  const activeId = highlight >= 0 && visible[highlight] ? `${rootId}-opt-${highlight}` : undefined

  return (
    <div ref={rootRef} className={['relative', className].filter(Boolean).join(' ')}>
      {/* Nilai terpilih ikut terkirim bila komponen berada di dalam form. */}
      {name && <input type="hidden" name={name} value={value} />}

      <button
        type="button"
        id={rootId}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
        className={[
          'field flex min-h-[40px] items-center justify-between gap-2 text-left',
          numeric ? 'num' : '',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          open ? 'border-foreground' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span className={selectedLabel === null ? 'text-muted-foreground' : 'truncate'}>
          {selectedLabel ?? placeholder}
        </span>
        {/* Penanda arah; aria-hidden karena statusnya sudah dibawa aria-expanded. */}
        <span aria-hidden="true" className="font-mono text-[0.625rem] text-muted-foreground">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 border border-border bg-card shadow-[4px_4px_0_0_hsl(var(--foreground))]">
          <div className="border-b border-border p-2">
            <input
              ref={searchRef}
              type="text"
              value={query}
              placeholder="Cari…"
              aria-label="Cari opsi"
              aria-controls={listboxId}
              aria-activedescendant={activeId}
              onChange={(event) => {
                setQuery(event.target.value)
                // Sorotan dikembalikan ke hasil teratas supaya Enter selalu
                // memilih kecocokan terbaik dari kueri yang baru diketik.
                setHighlight(0)
              }}
              onKeyDown={handleKeyDown}
              className="field min-h-[36px] text-sm"
            />
          </div>

          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label="Daftar opsi"
            className="scroll-ledger max-h-60 overflow-y-auto"
          >
            {visible.length === 0 && (
              <li className="px-3 py-3 text-sm text-muted-foreground">
                Tidak ada opsi yang cocok.
              </li>
            )}
            {visible.map((option, index) => {
              const isSelected = option.value === value
              return (
                <li
                  key={option.value || '__kosong__'}
                  id={`${rootId}-opt-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlight(index)}
                  onMouseDown={(event) => {
                    // Mencegah kotak pencarian kehilangan fokus sebelum klik
                    // sempat terproses.
                    event.preventDefault()
                    commit(option)
                  }}
                  className={[
                    'cursor-pointer px-3 py-2 text-sm',
                    numeric ? 'num' : '',
                    index === highlight ? 'bg-muted' : '',
                    // Pilihan aktif adalah satu-satunya sinyal mint pada daftar.
                    isSelected ? 'border-l-2 border-accent font-medium text-foreground' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {option.label}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
