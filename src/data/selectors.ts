import { todayKey } from '../lib/date'
import type { CalendarEvent, Database, Project, Status, Task } from './types'

export function isClosed(status: Status): boolean {
  return status === 'done' || status === 'cancelled'
}

export function isOverdue(item: { status: Status; endDate?: string }, today = todayKey()): boolean {
  return !!item.endDate && item.endDate < today && !isClosed(item.status)
}

export function projectTasks(db: Database, projectId: string): Task[] {
  return db.tasks.filter((t) => t.projectId === projectId)
}

/** Share of a project's (non-cancelled) tasks that are done, or null when it has none. */
export function projectProgress(db: Database, project: Project): number | null {
  const tasks = projectTasks(db, project.id).filter((t) => t.status !== 'cancelled')
  if (!tasks.length) return project.status === 'done' ? 1 : null
  return tasks.filter((t) => t.status === 'done').length / tasks.length
}

export function memberTasks(db: Database, memberId: string): Task[] {
  return db.tasks.filter((t) => t.assigneeIds.includes(memberId))
}

export function memberProjects(db: Database, memberId: string): Project[] {
  return db.projects.filter((p) => p.assigneeIds.includes(memberId))
}

export function memberEvents(db: Database, memberId: string): CalendarEvent[] {
  return db.events.filter((e) => e.attendeeIds.includes(memberId))
}

const STATUS_ORDER: Record<Status, number> = { in_progress: 0, todo: 1, on_hold: 2, done: 3, cancelled: 4 }

/** Open work first, then by nearest end date. */
export function sortWork<T extends { status: Status; endDate?: string; title: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ca = isClosed(a.status) ? 1 : 0
    const cb = isClosed(b.status) ? 1 : 0
    if (ca !== cb) return ca - cb
    const ea = a.endDate ?? '9999'
    const eb = b.endDate ?? '9999'
    if (ea !== eb) return ea < eb ? -1 : 1
    if (STATUS_ORDER[a.status] !== STATUS_ORDER[b.status]) return STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    return a.title.localeCompare(b.title, 'fa')
  })
}

export function eventCovers(e: CalendarEvent, day: string): boolean {
  const end = e.endDate && e.endDate > e.date ? e.endDate : e.date
  return e.date <= day && day <= end
}

export function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) =>
    a.date !== b.date ? (a.date < b.date ? -1 : 1) : (a.startTime ?? '').localeCompare(b.startTime ?? ''),
  )
}
