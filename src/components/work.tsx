import clsx from 'clsx'
import { CalendarClock, CheckSquare, FolderKanban } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { setTaskStatus } from '../data/actions'
import { isClosed, isOverdue, projectProgress } from '../data/selectors'
import { useStore } from '../data/store'
import { STATUSES, STATUS_LABEL, type Project, type Status, type Task } from '../data/types'
import { dueLabel, fa, formatDayMonth } from '../lib/date'
import { useDialogs } from './dialogs'
import { AvatarStack, Card, OverdueBadge, PriorityLabel, ProgressBar, STATUS_DOT, StatusBadge } from './ui'

export function DateSpan({ start, end, status }: { start?: string; end?: string; status: Status }) {
  if (!start && !end) return null
  const overdue = isOverdue({ status, endDate: end })
  return (
    <span className={clsx('inline-flex items-center gap-1 text-2xs', overdue ? 'text-red-600' : 'text-slate-500')}>
      <CalendarClock className="h-3.5 w-3.5" />
      {start && formatDayMonth(start)}
      {start && end && ' تا '}
      {end && formatDayMonth(end)}
      {end && !isClosed(status) && <span className="text-slate-400">({dueLabel(end)})</span>}
    </span>
  )
}

/** Compact status changer: a coloured dot with a native select over it. */
export function StatusSelect({ value, onChange, className }: { value: Status; onChange: (s: Status) => void; className?: string }) {
  return (
    <label className={clsx('relative inline-flex cursor-pointer', className)} onClick={(e) => e.stopPropagation()}>
      <StatusBadge status={value} className="pointer-events-none" />
      <select
        aria-label="تغییر وضعیت"
        value={value}
        onChange={(e) => onChange(e.target.value as Status)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
    </label>
  )
}

export function TaskRow({ task, showProject = true }: { task: Task; showProject?: boolean }) {
  const { db, commit } = useStore()
  const { openTask } = useDialogs()
  const project = task.projectId ? db.projects.find((p) => p.id === task.projectId) : undefined
  const assignees = db.members.filter((m) => task.assigneeIds.includes(m.id))
  const done = task.checklist.filter((c) => c.done).length
  const closed = isClosed(task.status)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openTask(task)}
      onKeyDown={(e) => e.key === 'Enter' && openTask(task)}
      className="group flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
    >
      <button
        type="button"
        aria-label={task.status === 'done' ? 'برگرداندن به در حال انجام' : 'علامت انجام شده'}
        onClick={(e) => {
          e.stopPropagation()
          setTaskStatus(commit, task, task.status === 'done' ? 'in_progress' : 'done')
        }}
        className={clsx(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          task.status === 'done' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 hover:border-emerald-500',
        )}
      >
        {task.status === 'done' && (
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 8.5l3 3 7-7" />
          </svg>
        )}
      </button>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={clsx('text-sm font-medium', closed ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800')}>{task.title}</span>
          <PriorityLabel priority={task.priority} />
          {isOverdue(task) && <OverdueBadge />}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <StatusSelect value={task.status} onChange={(s) => setTaskStatus(commit, task, s)} />
          {showProject && project && (
            <Link
              to={`/projects/${project.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-2xs text-slate-500 hover:text-brand-600"
            >
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: project.color }} />
              {project.title}
            </Link>
          )}
          <DateSpan start={task.startDate} end={task.endDate} status={task.status} />
          {task.checklist.length > 0 && (
            <span className="inline-flex items-center gap-1 text-2xs text-slate-500">
              <CheckSquare className="h-3.5 w-3.5" />
              {fa(`${done}/${task.checklist.length}`)}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0 pt-0.5">
        <AvatarStack members={assignees} max={3} />
      </div>
    </div>
  )
}

export function TaskList({ tasks, showProject = true, empty }: { tasks: Task[]; showProject?: boolean; empty?: ReactNode }) {
  if (!tasks.length) return <>{empty ?? null}</>
  return (
    <Card className="divide-y divide-slate-100 overflow-hidden">
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} showProject={showProject} />
      ))}
    </Card>
  )
}

function BoardCard({ task, overlay }: { task: Task; overlay?: boolean }) {
  const { db, commit } = useStore()
  const project = task.projectId ? db.projects.find((p) => p.id === task.projectId) : undefined
  return (
    <div
      className={clsx(
        'space-y-2 rounded-lg border bg-white p-3 shadow-sm transition',
        overlay ? 'rotate-1 cursor-grabbing border-brand-300 shadow-xl' : 'cursor-grab border-slate-200/80 hover:border-brand-200 hover:shadow',
      )}
    >
      {project && (
        <div className="flex items-center gap-1 text-2xs text-slate-500">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: project.color }} />
          {project.title}
        </div>
      )}
      <div className="text-sm font-medium leading-6 text-slate-800">{task.title}</div>
      <div className="flex flex-wrap items-center gap-2">
        <PriorityLabel priority={task.priority} />
        {isOverdue(task) && <OverdueBadge />}
        <DateSpan end={task.endDate} status={task.status} />
      </div>
      <div className="flex items-center justify-between">
        <AvatarStack members={db.members.filter((m) => task.assigneeIds.includes(m.id))} max={3} />
        <StatusSelect value={task.status} onChange={(s) => setTaskStatus(commit, task, s)} />
      </div>
    </div>
  )
}

function DraggableCard({ task }: { task: Task }) {
  const { openTask } = useDialogs()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-roledescription="کارت قابل جابجایی"
      onClick={() => openTask(task)}
      onKeyDown={(e) => e.key === 'Enter' && openTask(task)}
      className={clsx('touch-manipulation select-none [-webkit-touch-callout:none] outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg', isDragging && 'opacity-30')}
    >
      <BoardCard task={task} />
    </div>
  )
}

function BoardColumn({ status, tasks, dragging }: { status: Status; tasks: Task[]; dragging: Task | null }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const target = isOver && dragging && dragging.status !== status
  return (
    <div
      ref={setNodeRef}
      data-status={status}
      className={clsx(
        'flex w-72 shrink-0 snap-start flex-col rounded-xl p-2 transition-colors lg:w-auto lg:min-w-0',
        target ? 'bg-brand-100/70 ring-2 ring-inset ring-brand-300' : 'bg-slate-100/70',
      )}
    >
      <div className="mb-2 flex items-center gap-2 px-1.5 pt-1 text-xs font-semibold text-slate-600">
        <span className={clsx('h-2 w-2 rounded-full', STATUS_DOT[status])} />
        {STATUS_LABEL[status]}
        <span className="font-normal text-slate-400">{fa(tasks.length)}</span>
      </div>
      <div className="min-h-[6rem] flex-1 space-y-2">
        {tasks.map((t) => (
          <DraggableCard key={t.id} task={t} />
        ))}
        {!tasks.length && (
          <div className={clsx('rounded-lg border border-dashed py-6 text-center text-2xs', target ? 'border-brand-300 text-brand-600' : 'border-slate-200 text-slate-400')}>
            {dragging ? 'اینجا رها کنید' : 'خالی'}
          </div>
        )}
      </div>
    </div>
  )
}

/** Status columns. Cards can be dragged between columns to change their status. */
export function TaskBoard({ tasks }: { tasks: Task[] }) {
  const { commit } = useStore()
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    // A small move starts a drag, so a plain click still opens the task.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // On phones: press and hold briefly, then drag. A quick swipe still scrolls the board.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )
  const dragging = activeId ? tasks.find((t) => t.id === activeId) ?? null : null

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const task = tasks.find((t) => t.id === e.active.id)
    const status = e.over?.id as Status | undefined
    if (task && status && status !== task.status) setTaskStatus(commit, task, status)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <p className="mb-2 text-2xs text-slate-400">
        برای تغییر وضعیت، کارت را بکشید و در ستون دیگر رها کنید. روی گوشی، کارت را لحظه‌ای نگه دارید و بعد بکشید.
      </p>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-5 lg:overflow-visible">
        {STATUSES.map((status) => (
          <BoardColumn key={status} status={status} tasks={tasks.filter((t) => t.status === status)} dragging={dragging} />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>{dragging ? <BoardCard task={dragging} overlay /> : null}</DragOverlay>
    </DndContext>
  )
}

export function ProjectCard({ project }: { project: Project }) {
  const { db } = useStore()
  const progress = projectProgress(db, project)
  const tasks = db.tasks.filter((t) => t.projectId === project.id)
  const open = tasks.filter((t) => !isClosed(t.status)).length
  const members = db.members.filter((m) => project.assigneeIds.includes(m.id))
  return (
    <Link to={`/projects/${project.id}`} className="block">
      <Card className="h-full overflow-hidden transition hover:border-brand-200 hover:shadow-md">
        <div className="h-1" style={{ backgroundColor: project.color }} />
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold leading-7 text-slate-800">{project.title}</h3>
            <StatusBadge status={project.status} className="mt-1" />
          </div>
          {project.description && <p className="line-clamp-2 text-xs leading-6 text-slate-500">{project.description}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <DateSpan start={project.startDate} end={project.endDate} status={project.status} />
            {isOverdue(project) && <OverdueBadge />}
          </div>
          <ProgressBar value={progress} />
          <div className="flex items-center justify-between">
            <AvatarStack members={members} max={5} />
            <span className="inline-flex items-center gap-1 text-2xs text-slate-500">
              <FolderKanban className="h-3.5 w-3.5" />
              {tasks.length ? `${fa(open)} تسک باز از ${fa(tasks.length)}` : 'بدون تسک'}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  )
}
