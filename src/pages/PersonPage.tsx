import { ArrowRight, Mail, Pencil, Phone, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useDialogs } from '../components/dialogs'
import { Avatar, Button, Card, EmptyState, Segmented } from '../components/ui'
import { ProjectCard, TaskBoard, TaskList } from '../components/work'
import { isClosed, isOverdue, memberEvents, memberProjects, memberTasks, sortEvents, sortWork } from '../data/selectors'
import { useStore } from '../data/store'
import { fa, formatTime, formatWeekdayDate, todayKey } from '../lib/date'

export function PersonPage() {
  const { id } = useParams()
  const { db, me } = useStore()
  const { openMember, openTask, openEvent } = useDialogs()
  const [tab, setTab] = useState<'tasks' | 'projects' | 'events'>('tasks')
  const [showClosed, setShowClosed] = useState(false)
  const [layout, setLayout] = useState<'list' | 'board'>('list')
  const member = db.members.find((m) => m.id === id)
  if (!member) {
    return (
      <EmptyState title="این فرد پیدا نشد">
        <Link to="/people" className="text-brand-600 hover:underline">
          بازگشت به افراد
        </Link>
      </EmptyState>
    )
  }
  const today = todayKey()
  const tasks = sortWork(memberTasks(db, member.id))
  const openTasks = tasks.filter((t) => !isClosed(t.status))
  const projects = sortWork(memberProjects(db, member.id))
  const events = sortEvents(memberEvents(db, member.id).filter((e) => (e.endDate ?? e.date) >= today))
  const overdue = tasks.filter((t) => isOverdue(t)).length
  const done = tasks.filter((t) => t.status === 'done').length
  const shownTasks = showClosed || layout === 'board' ? tasks : openTasks

  return (
    <div className="space-y-6">
      <Link to="/people" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600">
        <ArrowRight className="h-3.5 w-3.5" /> افراد
      </Link>
      <Card className="p-5">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar member={member} size="xl" className="ring-0" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{member.name}</h1>
              {me?.id === member.id && <span className="rounded bg-brand-50 px-1.5 text-2xs text-brand-700">من</span>}
            </div>
            {member.title && <div className="text-sm text-slate-500">{member.title}</div>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-slate-500">
              {member.email && (
                <a href={`mailto:${member.email}`} className="inline-flex items-center gap-1 hover:text-brand-600" dir="ltr">
                  <Mail className="h-3.5 w-3.5" /> {member.email}
                </a>
              )}
              {member.phone && (
                <a href={`tel:${member.phone}`} className="inline-flex items-center gap-1 hover:text-brand-600" dir="ltr">
                  <Phone className="h-3.5 w-3.5" /> {member.phone}
                </a>
              )}
              {member.githubLogin && <span dir="ltr">@{member.githubLogin}</span>}
            </div>
          </div>
          <Button onClick={() => openMember(member)}>
            <Pencil className="h-4 w-4" /> ویرایش
          </Button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['پروژه', projects.filter((p) => !isClosed(p.status)).length, 'text-slate-900'],
            ['تسک باز', openTasks.length, 'text-slate-900'],
            ['عقب‌افتاده', overdue, overdue ? 'text-red-600' : 'text-slate-900'],
            ['انجام‌شده', done, 'text-emerald-600'],
          ].map(([label, n, tone]) => (
            <div key={label as string} className="rounded-lg bg-slate-50 px-3 py-2">
              <div className={`text-lg font-bold tabular-nums ${tone}`}>{fa(n as number)}</div>
              <div className="text-2xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'tasks', label: `تسک‌ها (${fa(tasks.length)})` },
            { value: 'projects', label: `پروژه‌ها (${fa(projects.length)})` },
            { value: 'events', label: `رویدادها (${fa(events.length)})` },
          ]}
        />
        {tab === 'tasks' && (
          <div className="flex items-center gap-2">
            {layout === 'list' && (
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                <input type="checkbox" className="accent-brand-600" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
                نمایش انجام‌شده‌ها
              </label>
            )}
            <Segmented value={layout} onChange={setLayout} options={[{ value: 'list', label: 'فهرست' }, { value: 'board', label: 'بورد' }]} />
            <Button size="sm" variant="primary" onClick={() => openTask(undefined, { assigneeIds: [member.id] })}>
              <Plus className="h-3.5 w-3.5" /> تسک
            </Button>
          </div>
        )}
        {tab === 'events' && (
          <Button size="sm" onClick={() => openEvent(undefined, { attendeeIds: [member.id] })}>
            <Plus className="h-3.5 w-3.5" /> رویداد
          </Button>
        )}
      </div>

      {tab === 'tasks' &&
        (layout === 'board' ? (
          <TaskBoard tasks={tasks} />
        ) : (
          <TaskList tasks={shownTasks} empty={<EmptyState title={tasks.length ? 'تسک بازی نیست' : 'تسکی به این فرد منتسب نشده'} />} />
        ))}
      {tab === 'projects' &&
        (projects.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        ) : (
          <EmptyState title="پروژه‌ای به این فرد منتسب نشده" />
        ))}
      {tab === 'events' &&
        (events.length ? (
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
          <EmptyState title="رویداد پیش رویی ندارد" />
        ))}
    </div>
  )
}
