import type { Mutation } from './sync'
import { STATUS_LABEL, type Status } from './types'

type Commit = (m: Mutation, message: string) => void

export function setTaskStatus(commit: Commit, task: { id: string; title: string }, status: Status) {
  const now = new Date().toISOString()
  commit((d) => {
    const t = d.tasks.find((x) => x.id === task.id)
    if (!t || t.status === status) return
    t.status = status
    t.updatedAt = now
    if (status === 'done') t.completedAt = now
    else delete t.completedAt
  }, `وضعیت تسک «${task.title}»: ${STATUS_LABEL[status]}`)
}

export function setProjectStatus(commit: Commit, project: { id: string; title: string }, status: Status) {
  const now = new Date().toISOString()
  commit((d) => {
    const p = d.projects.find((x) => x.id === project.id)
    if (!p || p.status === status) return
    p.status = status
    p.updatedAt = now
  }, `وضعیت پروژه «${project.title}»: ${STATUS_LABEL[status]}`)
}

export function toggleChecklistItem(commit: Commit, task: { id: string; title: string }, itemId: string) {
  commit((d) => {
    const item = d.tasks.find((x) => x.id === task.id)?.checklist.find((c) => c.id === itemId)
    if (item) item.done = !item.done
  }, `چک‌لیست تسک «${task.title}»`)
}
