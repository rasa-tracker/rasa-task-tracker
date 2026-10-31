import { AlertTriangle, CalendarDays, CheckCircle2, FolderKanban, ListTodo } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useDialogs } from '../components/dialogs'
import { Card, EmptyState, PageHeader, StatusBadge } from '../components/ui'
import { ProjectCard, TaskList } from '../components/work'
import { eventCovers, isClosed, isOverdue, sortEvents, sortWork } from '../data/selectors'
import { useStore } from '../data/store'
import { addDays, dayKey, fa, formatTime, formatWeekdayDate, todayKey, toJalali } from '../lib/date'

function Stat({ icon, label, value, tone, to }: { icon: ReactNode; label: string; value: number; tone: string; to: string }) {
  return (
    <Link to={to}>
      <Card className="flex items-center gap-3 p-4 transition hover:shadow-md">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>{icon}</div>
        <div>
          <div className="text-xl font-bold tabular-nums text-slate-900">{fa(value)}</div>
          <div className="text-xs text-slate-500">{label}</div>
        </div>
      </Card>
    </Link>
  )
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function DashboardPage() {
  const { db, me } = useStore()
  const { openEvent } = useDialogs()
  const today = todayKey()
  const weekEnd = dayKey(addDays(new Date(), 7))
  const j = toJalali(new Date())

  const openTasks = db.tasks.filter((t) => !isClosed(t.status))
  const overdueTasks = sortWork(db.tasks.filter((t) => isOverdue(t)))
  const activeProjects = db.projects.filter((p) => !isClosed(p.status))
  const doneThisMonth = db.tasks.filter((t) => {
    if (t.status !== 'done' || !t.completedAt) return false
    const c = toJalali(new Date(t.completedAt))
    return c.jy === j.jy && c.jm === j.jm
  }).length

  const myTasks = me ? sortWork(openTasks.filter((t) => t.assigneeIds.includes(me.id))) : []
  const dueSoon = sortWork(openTasks.filter((t) => t.endDate && t.endDate >= today && t.endDate <= weekEnd))
  const upcomingEvents = sortEvents(
    db.events.filter((e) => (e.endDate ?? e.date) >= today && e.date <= weekEnd),
  ).slice(0, 6)

  return (
    <div className="space-y-6">
      <PageHeader title={me ? `سلام ${me.name.split(' ')[0]}` : 'خانه'} subtitle={formatWeekdayDate(new Date())} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<FolderKanban className="h-5 w-5 text-brand-600" />} tone="bg-brand-50" label="پروژه فعال" value={activeProjects.length} to="/projects" />
        <Stat icon={<ListTodo className="h-5 w-5 text-sky-600" />} tone="bg-sky-50" label="تسک باز" value={openTasks.length} to="/tasks" />
        <Stat icon={<AlertTriangle className="h-5 w-5 text-red-600" />} tone="bg-red-50" label="تسک عقب‌افتاده" value={overdueTasks.length} to="/tasks?view=overdue" />
        <Stat icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} tone="bg-emerald-50" label="انجام‌شده این ماه" value={doneThisMonth} to="/tasks?status=done" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {me && (
            <Section title="کارهای من" action={<Link to={`/people/${me.id}`} className="text-xs text-brand-600 hover:underline">پروفایل من</Link>}>
              <TaskList tasks={myTasks.slice(0, 8)} empty={<EmptyState title="کار بازی ندارید" />} />
            </Section>
          )}
          {overdueTasks.length > 0 && (
            <Section title="عقب‌افتاده‌ها">
              <TaskList tasks={overdueTasks.slice(0, 8)} />
            </Section>
          )}
          <Section title="مهلت در ۷ روز آینده">
            <TaskList tasks={dueSoon.slice(0, 10)} empty={<EmptyState title="تسکی با مهلت نزدیک نیست" />} />
          </Section>
        </div>

        <div className="space-y-6">
          <Section
            title="رویدادهای پیش رو"
            action={
              <Link to="/calendar" className="text-xs text-brand-600 hover:underline">
                تقویم
              </Link>
            }
          >
            {upcomingEvents.length ? (
              <Card className="divide-y divide-slate-100">
                {upcomingEvents.map((e) => (
                  <button key={e.id} type="button" onClick={() => openEvent(e)} className="flex w-full items-start gap-3 px-4 py-3 text-right hover:bg-slate-50">
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: e.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-800">{e.title}</span>
                      <span className="block text-2xs text-slate-500">
                        {eventCovers(e, today) ? 'امروز' : formatWeekdayDate(e.date)}
                        {e.startTime && ` · ساعت ${formatTime(e.startTime)}`}
                      </span>
                    </span>
                  </button>
                ))}
              </Card>
            ) : (
              <EmptyState icon={<CalendarDays className="h-8 w-8" />} title="رویدادی در هفته پیش رو نیست" />
            )}
          </Section>

          <Section
            title="پروژه‌های فعال"
            action={
              <Link to="/projects" className="text-xs text-brand-600 hover:underline">
                همه
              </Link>
            }
          >
            {activeProjects.length ? (
              <div className="space-y-3">
                {sortWork(activeProjects)
                  .slice(0, 4)
                  .map((p) => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
              </div>
            ) : (
              <EmptyState title="پروژه فعالی نیست" />
            )}
          </Section>

          {db.projects.length > 0 && (
            <Section title="وضعیت پروژه‌ها">
              <Card className="space-y-2 p-4">
                {(['in_progress', 'todo', 'on_hold', 'done', 'cancelled'] as const).map((s) => {
                  const n = db.projects.filter((p) => p.status === s).length
                  if (!n) return null
                  return (
                    <div key={s} className="flex items-center justify-between">
                      <StatusBadge status={s} />
                      <span className="text-sm tabular-nums text-slate-600">{fa(n)}</span>
                    </div>
                  )
                })}
              </Card>
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}
