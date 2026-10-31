import clsx from 'clsx'
import { CalendarPlus, ChevronLeft, ChevronRight, Flag, FolderKanban, ListTodo, PlayCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDialogs } from '../components/dialogs'
import { FilterSelect, PersonFilter } from '../components/filters'
import { Button, Card, PageHeader } from '../components/ui'
import { eventCovers, isClosed } from '../data/selectors'
import { useStore } from '../data/store'
import type { Database } from '../data/types'
import {
  addJalaliMonths,
  fa,
  formatTime,
  formatWeekdayDate,
  jalaliMonthGrid,
  jalaliMonthLabel,
  parseDay,
  todayKey,
  toJalali,
  WEEK_DAYS,
  WEEK_DAYS_SHORT,
} from '../lib/date'

type Kind = 'event' | 'project' | 'task'
type Edge = 'start' | 'end' | 'single' | 'span'

interface Item {
  id: string
  kind: Kind
  edge: Edge
  title: string
  color: string
  time?: string
  done: boolean
  open: () => void
}

const EDGE_LABEL: Record<Edge, string> = { start: 'شروع', end: 'پایان', single: '', span: '' }
const KIND_LABEL: Record<Kind, string> = { event: 'رویداد', project: 'پروژه', task: 'تسک' }

function buildIndex(
  db: Database,
  days: string[],
  filter: { person: string; kinds: Set<Kind> },
  actions: { task: (id: string) => void; project: (id: string) => void; event: (id: string) => void },
): Map<string, Item[]> {
  const map = new Map<string, Item[]>(days.map((d) => [d, []]))
  const has = (ids: string[]) => !filter.person || ids.includes(filter.person)
  const push = (day: string | undefined, item: Item) => day && map.get(day)?.push(item)

  if (filter.kinds.has('event')) {
    for (const e of db.events) {
      if (!has(e.attendeeIds)) continue
      for (const d of days) {
        if (eventCovers(e, d)) {
          push(d, { id: e.id + d, kind: 'event', edge: e.endDate && e.endDate > e.date ? 'span' : 'single', title: e.title, color: e.color, time: e.startTime, done: false, open: () => actions.event(e.id) })
        }
      }
    }
  }
  const marks = (kind: 'project' | 'task', id: string, title: string, color: string, start: string | undefined, end: string | undefined, done: boolean) => {
    const open = () => (kind === 'task' ? actions.task(id) : actions.project(id))
    if (start && end && start === end) {
      push(start, { id: `${id}-s`, kind, edge: 'single', title, color, done, open })
      return
    }
    push(start, { id: `${id}-s`, kind, edge: 'start', title, color, done, open })
    push(end, { id: `${id}-e`, kind, edge: 'end', title, color, done, open })
  }
  if (filter.kinds.has('project')) {
    for (const p of db.projects) if (has(p.assigneeIds)) marks('project', p.id, p.title, p.color, p.startDate, p.endDate, isClosed(p.status))
  }
  if (filter.kinds.has('task')) {
    for (const t of db.tasks) {
      if (!has(t.assigneeIds)) continue
      const color = (t.projectId && db.projects.find((p) => p.id === t.projectId)?.color) || '#64748b'
      marks('task', t.id, t.title, color, t.startDate, t.endDate, isClosed(t.status))
    }
  }
  const order: Record<Kind, number> = { event: 0, project: 1, task: 2 }
  for (const list of map.values()) list.sort((a, b) => order[a.kind] - order[b.kind] || (a.time ?? '').localeCompare(b.time ?? ''))
  return map
}

function ItemIcon({ item }: { item: Item }) {
  if (item.kind === 'event') return <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
  if (item.edge === 'end') return <Flag className="h-3 w-3 shrink-0" style={{ color: item.color }} />
  if (item.edge === 'start') return <PlayCircle className="h-3 w-3 shrink-0" style={{ color: item.color }} />
  return item.kind === 'project' ? <FolderKanban className="h-3 w-3 shrink-0" style={{ color: item.color }} /> : <ListTodo className="h-3 w-3 shrink-0" style={{ color: item.color }} />
}

function Chip({ item }: { item: Item }) {
  const prefix = EDGE_LABEL[item.edge]
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        item.open()
      }}
      title={`${prefix ? prefix + ' ' : ''}${KIND_LABEL[item.kind]}: ${item.title}`}
      className={clsx(
        'flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-right text-[11px] leading-4 hover:brightness-95',
        item.kind === 'event' ? 'text-slate-800' : 'text-slate-700',
        item.done && 'opacity-50 line-through',
      )}
      style={{ backgroundColor: item.color + (item.kind === 'event' ? '26' : '14') }}
    >
      <ItemIcon item={item} />
      <span className="truncate">
        {item.time && <span className="tabular-nums text-slate-500">{formatTime(item.time)} </span>}
        {item.title}
      </span>
    </button>
  )
}

export function CalendarPage() {
  const { db } = useStore()
  const { openEvent, openTask } = useDialogs()
  const navigate = useNavigate()
  const today = todayKey()
  const [cursor, setCursor] = useState(() => new Date())
  const [selected, setSelected] = useState(today)
  const [person, setPerson] = useState('')
  const [show, setShow] = useState('all')

  const grid = jalaliMonthGrid(cursor)
  const days = grid.flat().map((c) => c.key)
  const kinds = useMemo(() => new Set<Kind>(show === 'all' ? ['event', 'project', 'task'] : [show as Kind]), [show])
  const indexDays = days.includes(selected) ? days : [...days, selected]
  const index = buildIndex(db, indexDays, { person, kinds }, {
    task: (id) => {
      const t = db.tasks.find((x) => x.id === id)
      if (t) openTask(t)
    },
    project: (id) => navigate(`/projects/${id}`),
    event: (id) => {
      const e = db.events.find((x) => x.id === id)
      if (e) openEvent(e)
    },
  })
  const selectedItems = index.get(selected) ?? []
  const selectedDate = parseDay(selected) ?? new Date()

  const go = (delta: number) => {
    const next = addJalaliMonths(cursor, delta)
    setCursor(next)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="تقویم"
        actions={
          <Button variant="primary" onClick={() => openEvent(undefined, { date: selected, attendeeIds: person ? [person] : [] })}>
            <CalendarPlus className="h-4 w-4" /> رویداد جدید
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" aria-label="ماه قبل" onClick={() => go(-1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="min-w-[7.5rem] text-center text-base font-bold text-slate-800">{jalaliMonthLabel(cursor)}</span>
          <Button size="sm" variant="ghost" aria-label="ماه بعد" onClick={() => go(1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setCursor(new Date())
            setSelected(today)
          }}
        >
          امروز
        </Button>
        <div className="flex-1" />
        <FilterSelect label="نمایش" value={show === 'all' ? '' : show} onChange={(v) => setShow(v || 'all')}>
          <option value="">همه موارد</option>
          <option value="event">فقط رویدادها</option>
          <option value="project">فقط پروژه‌ها</option>
          <option value="task">فقط تسک‌ها</option>
        </FilterSelect>
        <PersonFilter value={person} onChange={setPerson} members={db.members} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <PlayCircle className="h-3 w-3" /> شروع پروژه یا تسک
        </span>
        <span className="inline-flex items-center gap-1">
          <Flag className="h-3 w-3" /> پایان (مهلت)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-slate-400" /> رویداد
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center text-2xs font-medium text-slate-500">
            {WEEK_DAYS.map((d, i) => (
              <div key={d} className={clsx('py-2', i === 6 && 'text-red-500')}>
                <span className="hidden sm:inline">{d}</span>
                <span className="sm:hidden">{WEEK_DAYS_SHORT[i]}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {grid.flat().map((cell, i) => {
              const items = index.get(cell.key) ?? []
              const isToday = cell.key === today
              const isSelected = cell.key === selected
              const friday = i % 7 === 6
              return (
                <div
                  key={cell.key}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(cell.key)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelected(cell.key)}
                  className={clsx(
                    'relative min-h-[3.75rem] cursor-pointer border-b border-l border-slate-100 p-1 transition-colors sm:min-h-[6.5rem]',
                    !cell.inMonth && 'bg-slate-50/70',
                    isSelected ? 'bg-brand-50/70' : 'hover:bg-slate-50',
                  )}
                >
                  <div className="flex items-center justify-between px-0.5">
                    <span
                      className={clsx(
                        'flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums',
                        isToday ? 'bg-brand-600 font-bold text-white' : friday ? 'text-red-500' : cell.inMonth ? 'text-slate-700' : 'text-slate-300',
                      )}
                    >
                      {fa(toJalali(cell.date).jd)}
                    </span>
                    <span className="hidden text-[10px] tabular-nums text-slate-300 sm:inline" dir="ltr">
                      {cell.date.getDate()}/{cell.date.getMonth() + 1}
                    </span>
                  </div>
                  {/* Desktop: chips */}
                  <div className="mt-0.5 hidden space-y-0.5 sm:block">
                    {items.slice(0, 3).map((it) => (
                      <Chip key={it.id} item={it} />
                    ))}
                    {items.length > 3 && <div className="px-1 text-[10px] text-slate-500">{fa(items.length - 3)} مورد دیگر</div>}
                  </div>
                  {/* Mobile: dots */}
                  <div className="mt-1 flex flex-wrap justify-center gap-0.5 sm:hidden">
                    {items.slice(0, 4).map((it) => (
                      <span key={it.id} className={clsx('h-1.5 w-1.5', it.kind === 'event' ? 'rounded-full' : 'rounded-sm')} style={{ backgroundColor: it.color }} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="h-fit">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="text-sm font-semibold text-slate-800">{formatWeekdayDate(selectedDate)}</div>
            <Button size="sm" variant="ghost" onClick={() => openEvent(undefined, { date: selected, attendeeIds: person ? [person] : [] })}>
              <CalendarPlus className="h-4 w-4" />
            </Button>
          </div>
          <div className="divide-y divide-slate-50">
            {selectedItems.length ? (
              selectedItems.map((it) => (
                <button key={it.id} type="button" onClick={it.open} className="flex w-full items-start gap-2 px-4 py-2.5 text-right hover:bg-slate-50">
                  <span className="mt-1">
                    <ItemIcon item={it} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={clsx('block text-sm text-slate-800', it.done && 'text-slate-400 line-through')}>{it.title}</span>
                    <span className="block text-2xs text-slate-500">
                      {[EDGE_LABEL[it.edge], KIND_LABEL[it.kind]].filter(Boolean).join(' ')}
                      {it.time && ` · ساعت ${formatTime(it.time)}`}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className="px-4 py-6 text-center text-xs text-slate-400">برای این روز چیزی ثبت نشده است.</p>
            )}
          </div>
          <div className="border-t border-slate-100 p-3">
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" onClick={() => openEvent(undefined, { date: selected, attendeeIds: person ? [person] : [] })}>
                <CalendarPlus className="h-3.5 w-3.5" /> رویداد
              </Button>
              <Button size="sm" onClick={() => openTask(undefined, { endDate: selected, assigneeIds: person ? [person] : [] })}>
                <ListTodo className="h-3.5 w-3.5" /> تسک با این مهلت
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
