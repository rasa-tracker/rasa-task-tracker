import { FolderKanban, Plus } from 'lucide-react'
import { useState } from 'react'
import { useDialogs } from '../components/dialogs'
import { matchesPerson, matchesStatus, matchesText, PersonFilter, SearchBox, StatusFilter } from '../components/filters'
import { Button, EmptyState, PageHeader } from '../components/ui'
import { ProjectCard } from '../components/work'
import { sortWork } from '../data/selectors'
import { useStore } from '../data/store'
import { fa, todayKey } from '../lib/date'

export function ProjectsPage() {
  const { db } = useStore()
  const { openProject } = useDialogs()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('open')
  const [person, setPerson] = useState('')
  const today = todayKey()
  const projects = sortWork(
    db.projects.filter(
      (p) => matchesText(`${p.title} ${p.description ?? ''}`, query) && matchesStatus(p, status, today) && matchesPerson(p.assigneeIds, person),
    ),
  )
  return (
    <div>
      <PageHeader
        title="پروژه‌ها"
        subtitle={`${fa(db.projects.length)} پروژه`}
        actions={
          <Button variant="primary" onClick={() => openProject()}>
            <Plus className="h-4 w-4" /> پروژه جدید
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox value={query} onChange={setQuery} placeholder="جستجوی پروژه…" />
        <StatusFilter value={status} onChange={setStatus} />
        <PersonFilter value={person} onChange={setPerson} members={db.members} />
      </div>
      {projects.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      ) : (
        <EmptyState icon={<FolderKanban className="h-10 w-10" />} title={db.projects.length ? 'پروژه‌ای با این فیلترها پیدا نشد' : 'هنوز پروژه‌ای ساخته نشده'}>
          {!db.projects.length && (
            <Button variant="primary" className="mt-2" onClick={() => openProject()}>
              <Plus className="h-4 w-4" /> اولین پروژه را بسازید
            </Button>
          )}
        </EmptyState>
      )}
    </div>
  )
}
