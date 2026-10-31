import { Download, ExternalLink, History, LogOut, RefreshCw, RotateCcw, Smartphone } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SyncIndicator } from '../components/Layout'
import { Avatar, Button, Card, Field, Input, PageHeader } from '../components/ui'
import { resetDemo } from '../data/backend'
import { useStore } from '../data/store'
import { fa, todayKey } from '../lib/date'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-3 p-5">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      {children}
    </Card>
  )
}

export function SettingsPage({ onLogout }: { onLogout: () => void }) {
  const { db, me, session, commit, engine } = useStore()
  const [team, setTeam] = useState(db.teamName)
  const repoUrl = session.kind === 'github' ? `https://github.com/${session.owner}/${session.repo}` : null

  const backup = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `rasa-backup-${todayKey()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="تنظیمات" />

      <Section title="حساب من">
        <div className="flex items-center gap-3">
          {me ? <Avatar member={me} size="lg" className="ring-0" /> : <Avatar member={{ name: session.name, color: '#64748b' }} size="lg" className="ring-0" />}
          <div className="min-w-0 flex-1">
            <div className="font-medium">{me?.name ?? session.name}</div>
            <div className="text-xs text-slate-500" dir="ltr">
              {session.kind === 'github' ? `@${session.login}` : 'حالت نمایشی'}
            </div>
          </div>
          {me && (
            <Link to={`/people/${me.id}`} className="text-xs text-brand-600 hover:underline">
              پروفایل من
            </Link>
          )}
        </div>
        <Button onClick={onLogout} variant="secondary">
          <LogOut className="h-4 w-4" /> {session.kind === 'demo' ? 'خروج از حالت نمایشی' : 'خروج از این دستگاه'}
        </Button>
      </Section>

      <Section title="تیم">
        <Field label="نام تیم">
          <div className="flex gap-2">
            <Input value={team} onChange={(e) => setTeam(e.target.value)} />
            <Button
              disabled={!team.trim() || team.trim() === db.teamName}
              onClick={() => {
                const name = team.trim()
                commit((d) => void (d.teamName = name), 'تغییر نام تیم')
              }}
            >
              ذخیره
            </Button>
          </div>
        </Field>
        <p className="text-xs text-slate-500">
          {fa(db.members.length)} نفر، {fa(db.projects.length)} پروژه، {fa(db.tasks.length)} تسک، {fa(db.events.length)} رویداد
        </p>
      </Section>

      <Section title="داده‌ها و همگام‌سازی">
        <div className="flex flex-wrap items-center gap-2">
          <SyncIndicator />
          <Button size="sm" onClick={() => engine.refresh()}>
            <RefreshCw className="h-3.5 w-3.5" /> دریافت آخرین تغییرات
          </Button>
        </div>
        {repoUrl ? (
          <p className="text-xs leading-6 text-slate-500">
            همه داده‌ها در مخزن خصوصی{' '}
            <a href={repoUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline" dir="ltr">
              {session.kind === 'github' && `${session.owner}/${session.repo}`}
            </a>{' '}
            ذخیره می‌شوند. برنامه هر ۳۰ ثانیه تغییرات بقیه را می‌گیرد. هر تغییر یک ثبت (commit) در گیت‌هاب است، پس تاریخچه کامل همیشه در دسترس است.
          </p>
        ) : (
          <p className="text-xs leading-6 text-slate-500">در حالت نمایشی، داده‌ها فقط در همین مرورگر ذخیره می‌شوند و به کسی نمی‌رسند.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={backup}>
            <Download className="h-3.5 w-3.5" /> دانلود نسخه پشتیبان
          </Button>
          {session.kind === 'github' && (
            <a href={`${repoUrl}/commits/HEAD/${session.path}`} target="_blank" rel="noreferrer">
              <Button size="sm">
                <History className="h-3.5 w-3.5" /> تاریخچه تغییرات <ExternalLink className="h-3 w-3" />
              </Button>
            </a>
          )}
          {session.kind === 'demo' && (
            <Button
              size="sm"
              onClick={() => {
                resetDemo()
                location.reload()
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" /> بازگرداندن داده‌های نمایشی
            </Button>
          )}
        </div>
      </Section>

      <Section title="نصب روی گوشی">
        <div className="flex gap-3 text-xs leading-6 text-slate-600">
          <Smartphone className="mt-1 h-5 w-5 shrink-0 text-slate-400" />
          <div>
            <p>
              <b>اندروید (Chrome):</b> منوی سه‌نقطه، سپس «Add to Home screen» یا «Install app».
            </p>
            <p>
              <b>آیفون (Safari):</b> دکمه اشتراک‌گذاری، سپس «Add to Home Screen».
            </p>
            <p className="text-slate-400">بعد از نصب، برنامه مثل یک اپ از صفحه اصلی گوشی باز می‌شود.</p>
          </div>
        </div>
      </Section>
    </div>
  )
}
