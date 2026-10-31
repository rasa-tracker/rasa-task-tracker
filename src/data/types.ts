export type Status = 'todo' | 'in_progress' | 'on_hold' | 'done' | 'cancelled'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export interface Member {
  id: string
  name: string
  title?: string
  email?: string
  phone?: string
  /** GitHub username, when this person signs in to the app. */
  githubLogin?: string
  color: string
  createdAt: string
}

export interface Project {
  id: string
  title: string
  description?: string
  status: Status
  priority: Priority
  startDate?: string
  endDate?: string
  assigneeIds: string[]
  color: string
  createdAt: string
  updatedAt: string
  createdBy?: string
}

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface Task {
  id: string
  title: string
  description?: string
  status: Status
  priority: Priority
  startDate?: string
  endDate?: string
  /** Empty when the task is standalone. */
  projectId?: string
  assigneeIds: string[]
  checklist: ChecklistItem[]
  createdAt: string
  updatedAt: string
  createdBy?: string
  completedAt?: string
}

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  date: string
  endDate?: string
  startTime?: string
  endTime?: string
  location?: string
  attendeeIds: string[]
  projectId?: string
  color: string
  createdAt: string
  updatedAt: string
  createdBy?: string
}

export interface Database {
  schemaVersion: 1
  /** Goes up by one with every saved change; used to ignore stale reads. */
  revision: number
  teamName: string
  members: Member[]
  projects: Project[]
  tasks: Task[]
  events: CalendarEvent[]
  updatedAt: string
}

export const STATUSES: Status[] = ['todo', 'in_progress', 'on_hold', 'done', 'cancelled']

export const STATUS_LABEL: Record<Status, string> = {
  todo: 'شروع نشده',
  in_progress: 'در حال انجام',
  on_hold: 'متوقف',
  done: 'انجام شده',
  cancelled: 'لغو شده',
}

export const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent']

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'کم',
  medium: 'معمولی',
  high: 'زیاد',
  urgent: 'فوری',
}

export const PALETTE = [
  '#2563eb',
  '#16a34a',
  '#db2777',
  '#ea580c',
  '#7c3aed',
  '#0891b2',
  '#ca8a04',
  '#dc2626',
  '#4f46e5',
  '#059669',
  '#9333ea',
  '#0d9488',
]

export function emptyDatabase(teamName = 'تیم رسا'): Database {
  return {
    schemaVersion: 1,
    revision: 0,
    teamName,
    members: [],
    projects: [],
    tasks: [],
    events: [],
    updatedAt: new Date().toISOString(),
  }
}

/** Fill in fields older files may lack, so the UI can rely on them. */
export function normalizeDatabase(raw: unknown): Database {
  const db = { ...emptyDatabase(), ...(raw as Partial<Database>) }
  db.revision = Number(db.revision) || 0
  db.members = (db.members ?? []).map((m, i) => ({ ...m, color: m.color ?? PALETTE[i % PALETTE.length] }))
  db.projects = (db.projects ?? []).map((p) => ({
    ...p,
    priority: p.priority ?? 'medium',
    assigneeIds: p.assigneeIds ?? [],
    color: p.color ?? PALETTE[0],
  }))
  db.tasks = (db.tasks ?? []).map((t) => ({
    ...t,
    priority: t.priority ?? 'medium',
    assigneeIds: t.assigneeIds ?? [],
    checklist: t.checklist ?? [],
  }))
  db.events = (db.events ?? []).map((e) => ({ ...e, attendeeIds: e.attendeeIds ?? [], color: e.color ?? PALETTE[4] }))
  return db
}

export function newId(): string {
  const bytes = new Uint8Array(9)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 14)
}
