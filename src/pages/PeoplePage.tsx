import { UserPlus, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDialogs } from '../components/dialogs'
import { Avatar, Button, Card, EmptyState, PageHeader } from '../components/ui'
import { isClosed, isOverdue } from '../data/selectors'
import { useStore } from '../data/store'
import { fa } from '../lib/date'

export function PeoplePage() {
  const { db, me } = useStore()
  const { openMember } = useDialogs()
  const members = [...db.members].sort((a, b) => a.name.localeCompare(b.name, 'fa'))
  return (
    <div>
      <PageHeader
        title="افراد"
        subtitle={`${fa(db.members.length)} نفر`}
        actions={
          <Button variant="primary" onClick={() => openMember()}>
            <UserPlus className="h-4 w-4" /> افزودن فرد
          </Button>
        }
      />
      {members.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => {
            const tasks = db.tasks.filter((t) => t.assigneeIds.includes(m.id))
            const open = tasks.filter((t) => !isClosed(t.status)).length
            const overdue = tasks.filter((t) => isOverdue(t)).length
            const projects = db.projects.filter((p) => p.assigneeIds.includes(m.id) && !isClosed(p.status)).length
            return (
              <Link key={m.id} to={`/people/${m.id}`}>
                <Card className="flex items-center gap-3 p-4 transition hover:border-brand-200 hover:shadow-md">
                  <Avatar member={m} size="lg" className="ring-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-slate-800">{m.name}</span>
                      {me?.id === m.id && <span className="rounded bg-brand-50 px-1.5 text-2xs text-brand-700">من</span>}
                    </div>
                    {m.title && <div className="truncate text-xs text-slate-500">{m.title}</div>}
                    <div className="mt-1.5 flex flex-wrap gap-x-3 text-2xs text-slate-500">
                      <span>{fa(projects)} پروژه فعال</span>
                      <span>{fa(open)} تسک باز</span>
                      {overdue > 0 && <span className="text-red-600">{fa(overdue)} عقب‌افتاده</span>}
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={<Users className="h-10 w-10" />} title="هنوز کسی اضافه نشده">
          <Button variant="primary" className="mt-2" onClick={() => openMember()}>
            <UserPlus className="h-4 w-4" /> افزودن اولین نفر
          </Button>
        </EmptyState>
      )}
    </div>
  )
}
