import clsx from 'clsx'
import { CalendarDays, Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  addJalaliMonths,
  fa,
  formatDateLong,
  jalaliMonthGrid,
  jalaliMonthLabel,
  parseDay,
  todayKey,
  toJalali,
  WEEK_DAYS_SHORT,
} from '../lib/date'
import type { Member } from '../data/types'
import { Avatar } from './ui'

/** A button that opens a Jalali month picker. Value is `YYYY-MM-DD` or ''. */
export function DateInput({
  value,
  onChange,
  placeholder = 'انتخاب تاریخ',
  min,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  min?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(
          'flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-right text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
          value ? 'text-slate-800' : 'text-slate-400',
        )}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="flex-1 truncate">{value ? formatDateLong(value) : placeholder}</span>
      </button>
      {value && (
        <button
          type="button"
          aria-label="پاک کردن تاریخ"
          onClick={() => onChange('')}
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {open && (
        <DatePickerOverlay
          value={value}
          min={min}
          onClose={() => setOpen(false)}
          onPick={(v) => {
            onChange(v)
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}

function DatePickerOverlay({
  value,
  min,
  onPick,
  onClose,
}: {
  value: string
  min?: string
  onPick: (v: string) => void
  onClose: () => void
}) {
  const [cursor, setCursor] = useState(() => parseDay(value) ?? parseDay(min) ?? new Date())
  const today = todayKey()
  const grid = jalaliMonthGrid(cursor)
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="relative w-full max-w-xs rounded-2xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" className="rounded-lg p-1.5 hover:bg-slate-100" aria-label="ماه قبل" onClick={() => setCursor(addJalaliMonths(cursor, -1))}>
            <ChevronRight className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold">{jalaliMonthLabel(cursor)}</span>
          <button type="button" className="rounded-lg p-1.5 hover:bg-slate-100" aria-label="ماه بعد" onClick={() => setCursor(addJalaliMonths(cursor, 1))}>
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-2xs text-slate-400">
          {WEEK_DAYS_SHORT.map((d) => (
            <span key={d} className="py-1">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.flat().map((cell) => {
            const selected = cell.key === value
            const isToday = cell.key === today
            const disabled = !!min && cell.key < min
            return (
              <button
                key={cell.key}
                type="button"
                disabled={disabled}
                onClick={() => onPick(cell.key)}
                className={clsx(
                  'h-9 rounded-lg text-sm tabular-nums transition-colors disabled:opacity-25',
                  !cell.inMonth && 'text-slate-300',
                  cell.inMonth && !selected && 'text-slate-700 hover:bg-brand-50',
                  isToday && !selected && 'font-bold text-brand-600 ring-1 ring-inset ring-brand-200',
                  selected && 'bg-brand-600 font-semibold text-white',
                )}
              >
                {fa(toJalali(cell.date).jd)}
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex justify-between">
          <button type="button" className="text-xs font-medium text-brand-600 hover:underline" onClick={() => onPick(today)}>
            امروز
          </button>
          <button type="button" className="text-xs text-slate-500 hover:underline" onClick={onClose}>
            بستن
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}


/** Toggle chips for choosing people. */
export function MemberPicker({
  members,
  value,
  onChange,
}: {
  members: Member[]
  value: string[]
  onChange: (ids: string[]) => void
}) {
  if (!members.length) {
    return <p className="text-xs text-slate-400">هنوز کسی در بخش افراد اضافه نشده است.</p>
  }
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  return (
    <div className="flex flex-wrap gap-1.5">
      {members.map((m) => {
        const on = value.includes(m.id)
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => toggle(m.id)}
            aria-pressed={on}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-full border py-0.5 pe-3 ps-0.5 text-xs transition-colors',
              on ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            <span className="relative">
              <Avatar member={m} size="sm" className="ring-0" />
              {on && (
                <span className="absolute -bottom-0.5 -left-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-brand-600 text-white">
                  <Check className="h-2 w-2" strokeWidth={4} />
                </span>
              )}
            </span>
            {m.name}
          </button>
        )
      })}
    </div>
  )
}

export function ColorPicker({ value, onChange, colors }: { value: string; onChange: (c: string) => void; colors: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={c}
          onClick={() => onChange(c)}
          className={clsx('h-7 w-7 rounded-full ring-offset-2 transition', value === c ? 'ring-2 ring-slate-500' : 'hover:scale-110')}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  )
}
