import { Loader2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Avatar, Button, Card, Field, Input } from '../components/ui'
import { useStore } from '../data/store'
import { newId, PALETTE } from '../data/types'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-brand-50 to-slate-50 p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}

export function Loading() {
  const { error } = useStore()
  return (
    <Shell>
      <div className="flex flex-col items-center gap-3 text-sm text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        در حال دریافت اطلاعات تیم…
        {error && <p className="text-center text-xs text-red-600">{error}</p>}
      </div>
    </Shell>
  )
}

/** First run: the data file does not exist yet. */
export function SetupScreen() {
  const { session, commit, status, error } = useStore()
  const [team, setTeam] = useState('تیم رسا')
  const [name, setName] = useState(session.name && session.name !== session.login ? session.name : '')
  const [title, setTitle] = useState('')
  const busy = status === 'saving'
  const start = () => {
    if (!name.trim()) return
    const now = new Date().toISOString()
    commit((d) => {
      d.teamName = team.trim() || 'تیم رسا'
      if (!d.members.some((m) => m.githubLogin?.toLowerCase() === session.login.toLowerCase())) {
        d.members.push({ id: newId(), name: name.trim(), title: title.trim() || undefined, githubLogin: session.login, color: PALETTE[0], createdAt: now })
      }
    }, 'راه‌اندازی برنامه')
  }
  return (
    <Shell>
      <Card className="space-y-4 p-6">
        <div>
          <h1 className="text-lg font-bold text-slate-900">به برنامه خوش آمدید</h1>
          <p className="mt-1 text-sm leading-7 text-slate-500">مخزن داده‌ها هنوز خالی است. با چند مشخصه ساده شروع کنیم.</p>
        </div>
        <Field label="نام تیم">
          <Input value={team} onChange={(e) => setTeam(e.target.value)} />
        </Field>
        <Field label="نام شما">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام و نام خانوادگی" />
        </Field>
        <Field label="سمت شما">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: مدیر پروژه" />
        </Field>
        {error && <p className="rounded-lg bg-red-50 p-3 text-xs leading-6 text-red-700">{error}</p>}
        <Button variant="primary" className="w-full" disabled={!name.trim() || busy} onClick={start}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} شروع
        </Button>
      </Card>
    </Shell>
  )
}

/** Signed in, but not yet linked to a person in the team list. */
export function ClaimScreen({ onSkip }: { onSkip: () => void }) {
  const { db, session, commit } = useStore()
  const [name, setName] = useState(session.name && session.name !== session.login ? session.name : '')
  const [title, setTitle] = useState('')
  const unlinked = db.members.filter((m) => !m.githubLogin)
  const link = (id: string) =>
    commit((d) => {
      const m = d.members.find((x) => x.id === id)
      if (m && !m.githubLogin) m.githubLogin = session.login
    }, `اتصال حساب ${session.login}`)
  const create = () => {
    if (!name.trim()) return
    const now = new Date().toISOString()
    commit((d) => {
      if (d.members.some((m) => m.githubLogin?.toLowerCase() === session.login.toLowerCase())) return
      d.members.push({ id: newId(), name: name.trim(), title: title.trim() || undefined, githubLogin: session.login, color: PALETTE[d.members.length % PALETTE.length], createdAt: now })
    }, `عضو جدید «${name.trim()}»`)
  }
  return (
    <Shell>
      <Card className="space-y-5 p-6">
        <div>
          <h1 className="text-lg font-bold text-slate-900">خوش آمدید، {session.name}</h1>
          <p className="mt-1 text-sm leading-7 text-slate-500">برای اینکه کارهای خودتان را ببینید، مشخص کنید کدام یک از افراد تیم هستید.</p>
        </div>
        {unlinked.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-600">من این فرد هستم:</div>
            <div className="max-h-60 space-y-1 overflow-y-auto">
              {unlinked.map((m) => (
                <button key={m.id} type="button" onClick={() => link(m.id)} className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-right hover:border-brand-300 hover:bg-brand-50">
                  <Avatar member={m} size="md" className="ring-0" />
                  <span className="flex-1">
                    <span className="block text-sm font-medium">{m.name}</span>
                    {m.title && <span className="block text-2xs text-slate-500">{m.title}</span>}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-3 rounded-xl bg-slate-50 p-4">
          <div className="text-xs font-medium text-slate-600">{unlinked.length ? 'نام من در فهرست نیست:' : 'خودتان را به فهرست افراد اضافه کنید:'}</div>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام و نام خانوادگی" />
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="سمت (اختیاری)" />
          <Button variant="primary" className="w-full" disabled={!name.trim()} onClick={create}>
            <UserPlus className="h-4 w-4" /> افزودن من
          </Button>
        </div>
        <button type="button" onClick={onSkip} className="block w-full text-center text-xs text-slate-400 hover:text-slate-600">
          فعلاً رد شو
        </button>
      </Card>
    </Shell>
  )
}
