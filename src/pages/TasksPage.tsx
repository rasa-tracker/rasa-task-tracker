import { ListTodo, Plus } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useDialogs } from '../components/dialogs'
import { FilterSelect, matchesPerson, matchesStatus, matchesText, PersonFilter, SearchBox, StatusFilter } from '../components/filters'
import { Button, EmptyState, PageHeader, Segmented } from '../components/ui'
import { TaskBoard, TaskList } from '../components/work'
import { sortWork } from '../data/selectors'
import { useStore } from '../data/store'
import { addDays, dayKey, fa, todayKey } from '../lib/date'

export function TasksPage() {
  const { db, me } = useStore()
  const { openTask } = useDialogs()
  const [params, setParams] = useSearchParams()
  const get = (k: string, fallback = '') => params.get(k) ?? fallback
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    setParams(next, { replace: true })
  }

  const legacyOverdue = params.get('view') === 'overdue'
  const query = get('q')
  const status = legacyOverdue ? 'overdue' : get('status', 'open')
  const person = get('person')
  const project = get('project')
  const due = get('due')
  const layout = (get('layout', 'list') as 'list' | 'board')
  const today = todayKey()
  const weekEnd = dayKey(addDays(new Date(), 7))

  const tasks = sortWork(
    db.tasks.filter((t) => {
      if (!matchesText(`${t.title} ${t.description ?? ''}`, query)) return false
      if (layout === 'list' && !matchesStatus(t, status, today)) return false
      if (!matchesPerson(t.assigneeIds, person)) return false
      if (project === 'none' && t.projectId) return false
      if (project && project !== 'none' && t.projectId !== project) return false
      if (due === 'today' && t.endDate !== today) return false
      if (due === 'week' && !(t.endDate && t.endDate >= today && t.endDate <= weekEnd)) return false
      if (due === 'nodate' && t.endDate) return false
      return true
    }),
  )

  return (
    <div>
      <PageHeader
        title="تسک‌ها"
        subtitle={`${fa(tasks.length)} تسک`}
        actions={
          <>
            <Segmented
              value={layout}
              onChange={(v) => set('layout', v === 'list' ? '' : v)}
              options={[
                { value: 'list', label: 'فهرست' },
                { value: 'board', label: 'بورد وضعیت' },
              ]}
            />
            <Button variant="primary" onClick={() => openTask(undefined, { assigneeIds: me ? [me.id] : [] })}>
              <Plus className="h-4 w-4" /> تسک جدید
            </Button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox value={query} onChange={(v) => set('q', v)} placeholder="جستجوی تسک…" />
        {layout === 'list' && (
          <StatusFilter
            value={status}
            onChange={(v) => {
              const next = new URLSearchParams(params)
              next.delete('view')
              next.set('status', v)
              setParams(next, { replace: true })
            }}
          />
        )}
        <PersonFilter value={person} onChange={(v) => set('person', v)} members={db.members} />
        <FilterSelect label="پروژه" value={project} onChange={(v) => set('project', v)}>
          <option value="">همه پروژه‌ها</option>
          <option value="none">تسک‌های مستقل</option>
          {db.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="مهلت" value={due} onChange={(v) => set('due', v)}>
          <option value="">هر زمان</option>
          <option value="today">مهلت امروز</option>
          <option value="week">مهلت تا ۷ روز آینده</option>
          <option value="nodate">بدون تاریخ پایان</option>
        </FilterSelect>
        {me && (
          <button
            type="button"
            onClick={() => set('person', person === me.id ? '' : me.id)}
            className={`h-9 rounded-lg border px-3 text-xs ${person === me.id ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-slate-200 bg-white text-slate-600'}`}
          >
            فقط کارهای من
          </button>
        )}
      </div>
      {layout === 'board' ? (
        <TaskBoard tasks={tasks} />
      ) : (
        <TaskList
          tasks={tasks}
          empty={
            <EmptyState icon={<ListTodo className="h-10 w-10" />} title={db.tasks.length ? 'تسکی با این فیلترها پیدا نشد' : 'هنوز تسکی ساخته نشده'}>
              {!db.tasks.length && (
                <Button variant="primary" className="mt-2" onClick={() => openTask()}>
                  <Plus className="h-4 w-4" /> اولین تسک را بسازید
                </Button>
              )}
            </EmptyState>
          }
        />
      )}
    </div>
  )
}
