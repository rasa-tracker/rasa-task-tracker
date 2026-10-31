import { ArrowRight, CalendarDays, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useDialogs } from '../components/dialogs'
import { Avatar, Button, Card, EmptyState, OverdueBadge, PriorityLabel, ProgressBar, Segmented } from '../components/ui'
import { StatusSelect, TaskBoard, TaskList } from '../components/work'
import { setProjectStatus } from '../data/actions'
import { isClosed, isOverdue, projectProgress, sortEvents, sortWork } from '../data/selectors'
import { useStore } from '../data/store'
import { STATUSES, STATUS_LABEL } from '../data/types'
import { dueLabel, fa, formatDateLong, formatTime, formatWeekdayDate } from '../lib/date'

export function ProjectPage() {
  const { id } = useParams()
  const { db, commit } = useStore()
  const { openProject, openTask, openEvent } = useDialogs()
  const [view, setView] = useState<'list' | 'board'>('list')
  const project = db.projects.find((p) => p.id === id)
  if (!project) {
    return (
      <EmptyState title="این پروژه پیدا نشد">
        <Link to="/projects" className="text-brand-600 hover:underline">
          بازگشت به پروژه‌ها
        </Link>
      </EmptyState>
    )
  }
  const tasks = sortWork(db.tasks.filter((t) => t.projectId === project.id))
  const members = db.members.filter((m) => project.assigneeIds.includes(m.id))
  const events = sortEvents(db.events.filter((e) => e.projectId === project.id))
  const progress = projectProgress(db, project)
  const counts = STATUSES.map((s) => [s, tasks.filter((t) => t.status === s).length] as const).filter(([, n]) => n)

  return (
    <div className="space-y-6">
      <div>
        <Link to="/projects" className="mb-3 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600">
          <ArrowRight className="h-3.5 w-3.5" /> پروژه‌ها
        </Link>
        <Card className="overflow-hidden">
          <div className="h-1.5" style={{ backgroundColor: project.color }} />
          <div className="space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <h1 className="text-xl font-bold text-slate-900">{project.title}</h1>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusSelect value={project.status} onChange={(s) => setProjectStatus(commit, project, s)} />
                  <PriorityLabel priority={project.priority} />
                  {isOverdue(project) && <OverdueBadge />}
                </div>
              </div>
              <Button onClick={() => openProject(project)}>
                <Pencil className="h-4 w-4" /> ویرایش
              </Button>
            </div>
            {project.description && <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">{project.description}</p>}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <div className="text-2xs text-slate-400">شروع</div>
                <div className="text-sm font-medium">{formatDateLong(project.startDate)}</div>
              </div>
              <div>
                <div className="text-2xs text-slate-400">پایان</div>
                <div className="text-sm font-medium">
                  {formatDateLong(project.endDate)}
                  {project.endDate && !isClosed(project.status) && <span className="mr-1 text-2xs font-normal text-slate-400">({dueLabel(project.endDate)})</span>}
                </div>
              </div>
              <div>
                <div className="mb-1 text-2xs text-slate-400">پیشرفت (بر اساس تسک‌های انجام‌شده)</div>
                <ProgressBar value={progress} />
              </div>
            </div>
            <div>
              <div className="mb-2 text-2xs text-slate-400">اعضا</div>
              {members.length ? (
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => (
                    <Link key={m.id} to={`/people/${m.id}`} className="inline-flex items-center gap-2 rounded-full border border-slate-200 py-0.5 pe-3 ps-0.5 text-xs text-slate-700 hover:bg-slate-50">
                      <Avatar member={m} size="sm" className="ring-0" />
                      {m.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-400">هنوز کسی به این پروژه منتسب نشده است.</span>
              )}
            </div>
          </div>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-700">تسک‌های پروژه</h2>
            <span className="text-2xs text-slate-400">{counts.map(([s, n]) => `${STATUS_LABEL[s]} ${fa(n)}`).join(' · ')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Segmented value={view} onChange={setView} options={[{ value: 'list', label: 'فهرست' }, { value: 'board', label: 'بورد' }]} />
            <Button size="sm" variant="primary" onClick={() => openTask(undefined, { projectId: project.id, assigneeIds: [] })}>
              <Plus className="h-3.5 w-3.5" /> تسک
            </Button>
          </div>
        </div>
        {view === 'list' ? (
          <TaskList tasks={tasks} showProject={false} empty={<EmptyState title="این پروژه هنوز تسکی ندارد" />} />
        ) : (
          <TaskBoard tasks={tasks} />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">رویدادهای پروژه</h2>
          <Button size="sm" onClick={() => openEvent(undefined, { projectId: project.id, attendeeIds: project.assigneeIds, color: project.color })}>
            <CalendarDays className="h-3.5 w-3.5" /> رویداد
          </Button>
        </div>
        {events.length ? (
          <Card className="divide-y divide-slate-100">
            {events.map((e) => (
              <button key={e.id} type="button" onClick={() => openEvent(e)} className="flex w-full items-center gap-3 px-4 py-3 text-right hover:bg-slate-50">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                <span className="flex-1 text-sm">{e.title}</span>
                <span className="text-2xs text-slate-500">
                  {formatWeekdayDate(e.date)}
                  {e.startTime && ` · ${formatTime(e.startTime)}`}
                </span>
              </button>
            ))}
          </Card>
        ) : (
          <p className="text-xs text-slate-400">رویدادی برای این پروژه ثبت نشده است.</p>
        )}
      </section>
    </div>
  )
}
