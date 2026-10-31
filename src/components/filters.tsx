import { Search, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { STATUSES, STATUS_LABEL, type Member, type Status } from '../data/types'
import { cx } from './ui'

export function SearchBox({ value, onChange, placeholder = 'جستجو…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative min-w-[10rem] flex-1 sm:max-w-xs">
      <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-9 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      />
      {value && (
        <button type="button" aria-label="پاک کردن" onClick={() => onChange('')} className="absolute left-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

export function FilterSelect({ value, onChange, children, label }: { value: string; onChange: (v: string) => void; children: ReactNode; label: string }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cx(
        'select-chevron h-9 appearance-none rounded-lg border bg-white pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20',
        value ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600',
      )}
    >
      {children}
    </select>
  )
}

export function StatusFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <FilterSelect label="وضعیت" value={value} onChange={onChange}>
      <option value="">همه وضعیت‌ها</option>
      <option value="open">باز (انجام نشده‌ها)</option>
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABEL[s]}
        </option>
      ))}
      <option value="overdue">عقب‌افتاده</option>
    </FilterSelect>
  )
}

export function PersonFilter({ value, onChange, members }: { value: string; onChange: (v: string) => void; members: Member[] }) {
  return (
    <FilterSelect label="فرد" value={value} onChange={onChange}>
      <option value="">همه افراد</option>
      <option value="none">بدون مسئول</option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </FilterSelect>
  )
}

export function matchesStatus(item: { status: Status; endDate?: string }, filter: string, today: string): boolean {
  if (!filter) return true
  if (filter === 'open') return item.status !== 'done' && item.status !== 'cancelled'
  if (filter === 'overdue') return !!item.endDate && item.endDate < today && item.status !== 'done' && item.status !== 'cancelled'
  return item.status === filter
}

export function matchesPerson(ids: string[], filter: string): boolean {
  if (!filter) return true
  if (filter === 'none') return ids.length === 0
  return ids.includes(filter)
}

export function matchesText(text: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  return !q || text.toLowerCase().includes(q)
}
