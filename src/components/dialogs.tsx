import { Plus, Trash2, X } from 'lucide-react'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { INVITE_MESSAGES, useOrg } from '../data/org'
import { useStore } from '../data/store'
import {
  newId,
  PALETTE,
  PRIORITIES,
  PRIORITY_LABEL,
  STATUSES,
  STATUS_LABEL,
  type CalendarEvent,
  type ChecklistItem,
  type Member,
  type Priority,
  type Project,
  type Status,
  type Task,
} from '../data/types'
import { ColorPicker, DateInput, MemberPicker } from './pickers'
import { useToast } from './toast'
import { Button, ConfirmDialog, Field, Input, Modal, Select, Textarea } from './ui'

type Open =
  | { kind: 'task'; task?: Task; defaults?: Partial<Task> }
  | { kind: 'project'; project?: Project; defaults?: Partial<Project> }
  | { kind: 'event'; event?: CalendarEvent; defaults?: Partial<CalendarEvent> }
  | { kind: 'member'; member?: Member }
  | null

interface Dialogs {
  openTask: (task?: Task, defaults?: Partial<Task>) => void
  openProject: (project?: Project, defaults?: Partial<Project>) => void
  openEvent: (event?: CalendarEvent, defaults?: Partial<CalendarEvent>) => void
  openMember: (member?: Member) => void
}

const DialogContext = createContext<Dialogs | null>(null)

export function useDialogs(): Dialogs {
  const v = useContext(DialogContext)
  if (!v) throw new Error('useDialogs outside DialogProvider')
  return v
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<Open>(null)
  const close = () => setOpen(null)
  const api: Dialogs = {
    openTask: (task, defaults) => setOpen({ kind: 'task', task, defaults }),
    openProject: (project, defaults) => setOpen({ kind: 'project', project, defaults }),
    openEvent: (event, defaults) => setOpen({ kind: 'event', event, defaults }),
    openMember: (member) => setOpen({ kind: 'member', member }),
  }
  return (
    <DialogContext.Provider value={api}>
      {children}
      {open?.kind === 'task' && <TaskDialog key={open.task?.id ?? 'new'} task={open.task} defaults={open.defaults} onClose={close} />}
      {open?.kind === 'project' && <ProjectDialog key={open.project?.id ?? 'new'} project={open.project} defaults={open.defaults} onClose={close} />}
      {open?.kind === 'event' && <EventDialog key={open.event?.id ?? 'new'} event={open.event} defaults={open.defaults} onClose={close} />}
      {open?.kind === 'member' && <MemberDialog key={open.member?.id ?? 'new'} member={open.member} onClose={close} />}
    </DialogContext.Provider>
  )
}

function DateRange({
  start,
  end,
  onStart,
  onEnd,
  startLabel = 'تاریخ شروع',
  endLabel = 'تاریخ پایان',
}: {
  start: string
  end: string
  onStart: (v: string) => void
  onEnd: (v: string) => void
  startLabel?: string
  endLabel?: string
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label={startLabel}>
        <DateInput
          value={start}
          onChange={(v) => {
            onStart(v)
            if (v && end && end < v) onEnd(v)
          }}
        />
      </Field>
      <Field label={endLabel}>
        <DateInput value={end} onChange={onEnd} min={start || undefined} />
      </Field>
    </div>
  )
}

function StatusPriority({
  status,
  priority,
  onStatus,
  onPriority,
}: {
  status: Status
  priority: Priority
  onStatus: (s: Status) => void
  onPriority: (p: Priority) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="وضعیت">
        <Select value={status} onChange={(e) => onStatus(e.target.value as Status)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="اولویت">
        <Select value={priority} onChange={(e) => onPriority(e.target.value as Priority)}>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  )
}

const clean = (s: string) => s.trim() || undefined

function TaskDialog({ task, defaults, onClose }: { task?: Task; defaults?: Partial<Task>; onClose: () => void }) {
  const { db, commit, session } = useStore()
  const base = { ...defaults, ...task }
  const [title, setTitle] = useState(base.title ?? '')
  const [description, setDescription] = useState(base.description ?? '')
  const [status, setStatus] = useState<Status>(base.status ?? 'todo')
  const [priority, setPriority] = useState<Priority>(base.priority ?? 'medium')
  const [startDate, setStart] = useState(base.startDate ?? '')
  const [endDate, setEnd] = useState(base.endDate ?? '')
  const [projectId, setProjectId] = useState(base.projectId ?? '')
  const [assigneeIds, setAssignees] = useState<string[]>(base.assigneeIds ?? [])
  const [checklist, setChecklist] = useState<ChecklistItem[]>(base.checklist ?? [])
  const [newItem, setNewItem] = useState('')
  const [confirm, setConfirm] = useState(false)

  const save = () => {
    if (!title.trim()) return
    const now = new Date().toISOString()
    const items = newItem.trim() ? [...checklist, { id: newId(), text: newItem.trim(), done: false }] : checklist
    const fields = {
      title: title.trim(),
      description: clean(description),
      status,
      priority,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      projectId: projectId || undefined,
      assigneeIds,
      checklist: items,
      updatedAt: now,
    }
    if (task) {
      const wasDone = task.status === 'done'
      commit((d) => {
        const t = d.tasks.find((x) => x.id === task.id)
        if (!t) return
        Object.assign(t, fields)
        if (status === 'done' && !wasDone) t.completedAt = now
        if (status !== 'done') delete t.completedAt
      }, `ویرایش تسک «${fields.title}»`)
    } else {
      const created: Task = {
        id: newId(),
        ...fields,
        createdAt: now,
        createdBy: session.login,
        ...(status === 'done' ? { completedAt: now } : {}),
      }
      commit((d) => void d.tasks.push(created), `تسک جدید «${fields.title}»`)
    }
    onClose()
  }

  const remove = () => {
    if (!task) return
    commit((d) => {
      d.tasks = d.tasks.filter((x) => x.id !== task.id)
    }, `حذف تسک «${task.title}»`)
    onClose()
  }

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={task ? 'ویرایش تسک' : 'تسک جدید'}
      footer={
        <>
          <Button variant="primary" onClick={save} disabled={!title.trim()}>
            {task ? 'ذخیره تغییرات' : 'افزودن تسک'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          {task && (
            <Button variant="ghost" className="ms-auto text-red-600 hover:bg-red-50" onClick={() => setConfirm(true)}>
              <Trash2 className="h-4 w-4" /> حذف
            </Button>
          )}
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <Field label="عنوان تسک">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: آماده کردن گزارش ماهانه" />
        </Field>
        <Field label="پروژه">
          <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">بدون پروژه (تسک مستقل)</option>
            {db.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
        </Field>
        <StatusPriority status={status} priority={priority} onStatus={setStatus} onPriority={setPriority} />
        <DateRange start={startDate} end={endDate} onStart={setStart} onEnd={setEnd} endLabel="تاریخ پایان (مهلت)" />
        <Field label="مسئولان انجام">
          <MemberPicker members={db.members} value={assigneeIds} onChange={setAssignees} />
        </Field>
        <Field label="توضیحات">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="جزئیات، لینک‌ها، نکته‌ها…" />
        </Field>
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-slate-600">چک‌لیست (مراحل کار)</span>
          {checklist.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded accent-brand-600"
                checked={item.done}
                onChange={() => setChecklist(checklist.map((c) => (c.id === item.id ? { ...c, done: !c.done } : c)))}
              />
              <input
                className="flex-1 border-b border-transparent bg-transparent py-1 text-sm focus:border-slate-200 focus:outline-none"
                value={item.text}
                onChange={(e) => setChecklist(checklist.map((c) => (c.id === item.id ? { ...c, text: e.target.value } : c)))}
              />
              <button type="button" aria-label="حذف مرحله" className="rounded p-1 text-slate-400 hover:text-red-500" onClick={() => setChecklist(checklist.filter((c) => c.id !== item.id))}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="مرحله جدید…"
              className="h-9"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (!newItem.trim()) return
                  setChecklist([...checklist, { id: newId(), text: newItem.trim(), done: false }])
                  setNewItem('')
                }
              }}
            />
            <Button
              size="sm"
              onClick={() => {
                if (!newItem.trim()) return
                setChecklist([...checklist, { id: newId(), text: newItem.trim(), done: false }])
                setNewItem('')
              }}
            >
              <Plus className="h-3.5 w-3.5" /> افزودن
            </Button>
          </div>
        </div>
        <button type="submit" hidden />
      </form>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={remove} title="حذف تسک" message={`تسک «${task?.title}» برای همه حذف می‌شود. مطمئن هستید؟`} />
    </Modal>
  )
}

function ProjectDialog({ project, defaults, onClose }: { project?: Project; defaults?: Partial<Project>; onClose: () => void }) {
  const { db, commit, session } = useStore()
  const base = { ...defaults, ...project }
  const [title, setTitle] = useState(base.title ?? '')
  const [description, setDescription] = useState(base.description ?? '')
  const [status, setStatus] = useState<Status>(base.status ?? 'todo')
  const [priority, setPriority] = useState<Priority>(base.priority ?? 'medium')
  const [startDate, setStart] = useState(base.startDate ?? '')
  const [endDate, setEnd] = useState(base.endDate ?? '')
  const [assigneeIds, setAssignees] = useState<string[]>(base.assigneeIds ?? [])
  const [color, setColor] = useState(base.color ?? PALETTE[db.projects.length % PALETTE.length])
  const [confirm, setConfirm] = useState(false)
  const taskCount = project ? db.tasks.filter((t) => t.projectId === project.id).length : 0

  const save = () => {
    if (!title.trim()) return
    const now = new Date().toISOString()
    const fields = {
      title: title.trim(),
      description: clean(description),
      status,
      priority,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      assigneeIds,
      color,
      updatedAt: now,
    }
    if (project) {
      commit((d) => {
        const p = d.projects.find((x) => x.id === project.id)
        if (p) Object.assign(p, fields)
      }, `ویرایش پروژه «${fields.title}»`)
    } else {
      const created: Project = { id: newId(), ...fields, createdAt: now, createdBy: session.login }
      commit((d) => void d.projects.push(created), `پروژه جدید «${fields.title}»`)
    }
    onClose()
  }

  const remove = () => {
    if (!project) return
    commit((d) => {
      d.projects = d.projects.filter((x) => x.id !== project.id)
      d.tasks = d.tasks.filter((t) => t.projectId !== project.id)
      d.events.forEach((e) => {
        if (e.projectId === project.id) delete e.projectId
      })
    }, `حذف پروژه «${project.title}»`)
    onClose()
  }

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={project ? 'ویرایش پروژه' : 'پروژه جدید'}
      footer={
        <>
          <Button variant="primary" onClick={save} disabled={!title.trim()}>
            {project ? 'ذخیره تغییرات' : 'ساختن پروژه'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          {project && (
            <Button variant="ghost" className="ms-auto text-red-600 hover:bg-red-50" onClick={() => setConfirm(true)}>
              <Trash2 className="h-4 w-4" /> حذف
            </Button>
          )}
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <Field label="نام پروژه">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: راه‌اندازی وب‌سایت" />
        </Field>
        <StatusPriority status={status} priority={priority} onStatus={setStatus} onPriority={setPriority} />
        <DateRange start={startDate} end={endDate} onStart={setStart} onEnd={setEnd} />
        <Field label="اعضای پروژه">
          <MemberPicker members={db.members} value={assigneeIds} onChange={setAssignees} />
        </Field>
        <Field label="توضیحات">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="هدف پروژه، خروجی‌ها…" />
        </Field>
        <Field label="رنگ">
          <ColorPicker value={color} onChange={setColor} colors={PALETTE} />
        </Field>
        <button type="submit" hidden />
      </form>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={remove}
        title="حذف پروژه"
        message={
          taskCount
            ? `پروژه «${project?.title}» و ${taskCount.toLocaleString('fa')} تسک آن برای همه حذف می‌شوند. مطمئن هستید؟`
            : `پروژه «${project?.title}» برای همه حذف می‌شود. مطمئن هستید؟`
        }
      />
    </Modal>
  )
}

function EventDialog({ event, defaults, onClose }: { event?: CalendarEvent; defaults?: Partial<CalendarEvent>; onClose: () => void }) {
  const { db, commit, session } = useStore()
  const base = { ...defaults, ...event }
  const [title, setTitle] = useState(base.title ?? '')
  const [description, setDescription] = useState(base.description ?? '')
  const [date, setDate] = useState(base.date ?? '')
  const [endDate, setEnd] = useState(base.endDate ?? '')
  const [startTime, setStartTime] = useState(base.startTime ?? '')
  const [endTime, setEndTime] = useState(base.endTime ?? '')
  const [location, setLocation] = useState(base.location ?? '')
  const [attendeeIds, setAttendees] = useState<string[]>(base.attendeeIds ?? [])
  const [projectId, setProjectId] = useState(base.projectId ?? '')
  const [color, setColor] = useState(base.color ?? PALETTE[4])
  const [confirm, setConfirm] = useState(false)
  const valid = !!title.trim() && !!date

  const save = () => {
    if (!valid) return
    const now = new Date().toISOString()
    const fields = {
      title: title.trim(),
      description: clean(description),
      date,
      endDate: endDate && endDate > date ? endDate : undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      location: clean(location),
      attendeeIds,
      projectId: projectId || undefined,
      color,
      updatedAt: now,
    }
    if (event) {
      commit((d) => {
        const e = d.events.find((x) => x.id === event.id)
        if (e) {
          Object.assign(e, fields)
          for (const k of Object.keys(fields) as (keyof typeof fields)[]) if (fields[k] === undefined) delete e[k]
        }
      }, `ویرایش رویداد «${fields.title}»`)
    } else {
      const created: CalendarEvent = { id: newId(), ...fields, createdAt: now, createdBy: session.login }
      commit((d) => void d.events.push(created), `رویداد جدید «${fields.title}»`)
    }
    onClose()
  }

  const remove = () => {
    if (!event) return
    commit((d) => {
      d.events = d.events.filter((x) => x.id !== event.id)
    }, `حذف رویداد «${event.title}»`)
    onClose()
  }

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={event ? 'ویرایش رویداد' : 'رویداد جدید'}
      footer={
        <>
          <Button variant="primary" onClick={save} disabled={!valid}>
            {event ? 'ذخیره تغییرات' : 'افزودن به تقویم'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          {event && (
            <Button variant="ghost" className="ms-auto text-red-600 hover:bg-red-50" onClick={() => setConfirm(true)}>
              <Trash2 className="h-4 w-4" /> حذف
            </Button>
          )}
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <Field label="عنوان رویداد">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: جلسه هفتگی" />
        </Field>
        <DateRange start={date} end={endDate} onStart={setDate} onEnd={setEnd} startLabel="تاریخ" endLabel="تا تاریخ (اختیاری)" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="ساعت شروع">
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} dir="ltr" className="text-right" />
          </Field>
          <Field label="ساعت پایان">
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} dir="ltr" className="text-right" />
          </Field>
        </div>
        <Field label="مکان یا لینک جلسه">
          <Input value={location} onChange={(e) => setLocation(e.target.value)} />
        </Field>
        <Field label="شرکت‌کنندگان">
          <MemberPicker members={db.members} value={attendeeIds} onChange={setAttendees} />
        </Field>
        <Field label="مربوط به پروژه">
          <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">هیچ‌کدام</option>
            {db.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="توضیحات">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="رنگ">
          <ColorPicker value={color} onChange={setColor} colors={PALETTE} />
        </Field>
        <button type="submit" hidden />
      </form>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={remove} title="حذف رویداد" message={`رویداد «${event?.title}» از تقویم همه حذف می‌شود. مطمئن هستید؟`} />
    </Modal>
  )
}

function MemberDialog({ member, onClose }: { member?: Member; onClose: () => void }) {
  const { db, commit } = useStore()
  const [name, setName] = useState(member?.name ?? '')
  const [title, setTitle] = useState(member?.title ?? '')
  const [email, setEmail] = useState(member?.email ?? '')
  const [phone, setPhone] = useState(member?.phone ?? '')
  const [githubLogin, setLogin] = useState(member?.githubLogin ?? '')
  const [color, setColor] = useState(member?.color ?? PALETTE[db.members.length % PALETTE.length])
  const [confirm, setConfirm] = useState(false)
  const login = githubLogin.trim().replace(/^@/, '')
  const loginTaken = !!login && db.members.some((m) => m.id !== member?.id && m.githubLogin?.toLowerCase() === login.toLowerCase())
  const { canInvite, accessOf, invite } = useOrg()
  const toast = useToast()
  const [sendInvite, setSendInvite] = useState(true)
  const inviteTarget = login ? { login } : email.trim() ? { email: email.trim() } : null
  const access = canInvite ? accessOf({ githubLogin: login || undefined, email: email.trim() || undefined }) : null

  const save = () => {
    if (!name.trim() || loginTaken) return
    const fields = {
      name: name.trim(),
      title: clean(title),
      email: clean(email),
      phone: clean(phone),
      githubLogin: login || undefined,
      color,
    }
    if (member) {
      commit((d) => {
        const m = d.members.find((x) => x.id === member.id)
        if (!m) return
        Object.assign(m, fields)
        for (const k of Object.keys(fields) as (keyof typeof fields)[]) if (fields[k] === undefined) delete m[k]
      }, `ویرایش فرد «${fields.name}»`)
    } else {
      const created: Member = { id: newId(), ...fields, createdAt: new Date().toISOString() }
      commit((d) => void d.members.push(created), `فرد جدید «${fields.name}»`)
    }
    if (canInvite && sendInvite && inviteTarget && access === 'none') {
      invite(inviteTarget)
        .then((r) => toast(`${fields.name}: ${INVITE_MESSAGES[r]}`, 'success'))
        .catch((e) => toast(e instanceof Error ? e.message : String(e), 'error'))
    }
    onClose()
  }

  const remove = () => {
    if (!member) return
    commit((d) => {
      d.members = d.members.filter((x) => x.id !== member.id)
      const drop = (ids: string[]) => ids.filter((id) => id !== member.id)
      d.tasks.forEach((t) => (t.assigneeIds = drop(t.assigneeIds)))
      d.projects.forEach((p) => (p.assigneeIds = drop(p.assigneeIds)))
      d.events.forEach((e) => (e.attendeeIds = drop(e.attendeeIds)))
    }, `حذف فرد «${member.name}»`)
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={member ? 'ویرایش مشخصات' : 'افزودن فرد'}
      footer={
        <>
          <Button variant="primary" onClick={save} disabled={!name.trim() || loginTaken}>
            {member ? 'ذخیره' : 'افزودن'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          {member && (
            <Button variant="ghost" className="ms-auto text-red-600 hover:bg-red-50" onClick={() => setConfirm(true)}>
              <Trash2 className="h-4 w-4" /> حذف
            </Button>
          )}
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <Field label="نام و نام خانوادگی">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="سمت">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: کارشناس فروش" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ایمیل">
            <Input type="email" dir="ltr" className="text-right" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="تلفن">
            <Input type="tel" dir="ltr" className="text-right" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>
        <Field
          label="نام کاربری گیت‌هاب"
          hint={loginTaken ? <span className="text-red-500">این نام کاربری به فرد دیگری وصل است.</span> : 'اگر این فرد با گیت‌هاب وارد برنامه می‌شود، نام کاربری‌اش را بنویسید تا کارهایش در «کارهای من» بیاید.'}
        >
          <Input dir="ltr" className="text-right" value={githubLogin} onChange={(e) => setLogin(e.target.value)} placeholder="username" />
        </Field>
        {access === 'member' && <p className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">این فرد عضو سازمان گیت‌هاب است و می‌تواند وارد برنامه شود.</p>}
        {access === 'invited' && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">برای این فرد دعوت فرستاده شده و منتظر قبول است.</p>}
        {access === 'none' && (
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg bg-brand-50/70 p-3 text-xs text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-brand-600"
              checked={sendInvite && !!inviteTarget}
              disabled={!inviteTarget}
              onChange={(e) => setSendInvite(e.target.checked)}
            />
            <span>
              <span className="block font-medium">دعوت برای ورود به برنامه هم فرستاده شود</span>
              <span className="mt-0.5 block text-2xs leading-5 text-slate-500">
                {login
                  ? `دعوت عضویت در سازمان به حساب گیت‌هاب ${login} فرستاده می‌شود.`
                  : inviteTarget
                    ? 'دعوت به همین ایمیل فرستاده می‌شود. اگر حساب گیت‌هاب ندارد، با همان ایمیل می‌سازد.'
                    : 'برای دعوت، نام کاربری گیت‌هاب یا ایمیل این فرد را بنویسید.'}
              </span>
            </span>
          </label>
        )}
        <Field label="رنگ">
          <ColorPicker value={color} onChange={setColor} colors={PALETTE} />
        </Field>
        <button type="submit" hidden />
      </form>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={remove}
        title="حذف فرد"
        message={`«${member?.name}» از فهرست افراد و از همه تسک‌ها، پروژه‌ها و رویدادها برداشته می‌شود. خود تسک‌ها باقی می‌مانند.`}
      />
    </Modal>
  )
}
