import clsx from 'clsx'
import {
  AlertTriangle,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  CloudOff,
  FolderKanban,
  FolderPlus,
  LayoutDashboard,
  ListTodo,
  ListPlus,
  Loader2,
  Plus,
  RefreshCw,
  Settings,
  UserPlus,
  Users,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useStore, useTick } from '../data/store'
import { formatRelative } from '../lib/date'
import { useDialogs } from './dialogs'
import { Avatar, Button } from './ui'

const NAV = [
  { to: '/', label: 'خانه', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'پروژه‌ها', icon: FolderKanban },
  { to: '/tasks', label: 'تسک‌ها', icon: ListTodo },
  { to: '/calendar', label: 'تقویم', icon: CalendarDays },
  { to: '/people', label: 'افراد', icon: Users },
]

export function SyncIndicator({ compact }: { compact?: boolean }) {
  const { status, lastSyncedAt, error, pendingCount, engine, session } = useStore()
  useTick(30_000)
  if (session.kind === 'demo') {
    return <span className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-2xs font-medium text-amber-800">نمایشی</span>
  }
  const content =
    status === 'saving' ? (
      <>
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> در حال ذخیره…
      </>
    ) : status === 'offline' ? (
      <>
        <CloudOff className="h-3.5 w-3.5" /> {pendingCount ? 'آفلاین؛ بعداً ذخیره می‌شود' : 'آفلاین'}
      </>
    ) : status === 'error' ? (
      <>
        <AlertTriangle className="h-3.5 w-3.5" /> خطا در همگام‌سازی
      </>
    ) : status === 'loading' ? (
      <>
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> در حال دریافت…
      </>
    ) : (
      <>
        <CheckCircle2 className="h-3.5 w-3.5" /> {compact ? 'ذخیره شده' : `به‌روز (${formatRelative(lastSyncedAt)})`}
      </>
    )
  return (
    <button
      type="button"
      title={error ?? 'برای دریافت آخرین تغییرات کلیک کنید'}
      onClick={() => (status === 'error' || status === 'offline' ? engine.flush().then(() => engine.refresh()) : engine.refresh())}
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-1 text-2xs font-medium transition-colors',
        status === 'error' && 'bg-red-50 text-red-700',
        status === 'offline' && 'bg-amber-50 text-amber-700',
        (status === 'synced' || status === 'loading' || status === 'saving') && 'text-slate-500 hover:bg-slate-100',
      )}
    >
      {content}
    </button>
  )
}

function ErrorBanner() {
  const { status, error, pendingCount, engine } = useStore()
  if (status !== 'error' || !error) return null
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{error}</span>
      {pendingCount > 0 && (
        <>
          <Button size="sm" onClick={() => engine.flush()}>
            <RefreshCw className="h-3.5 w-3.5" /> تلاش دوباره
          </Button>
          <Button size="sm" variant="ghost" onClick={() => engine.discardPending()}>
            کنار گذاشتن تغییرات ذخیره‌نشده
          </Button>
        </>
      )}
    </div>
  )
}

function QuickAdd({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { openTask, openProject, openEvent, openMember } = useDialogs()
  const location = useLocation()
  useEffect(() => setOpen(false), [location.pathname])
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  const item = (icon: ReactNode, label: string, run: () => void) => (
    <button
      type="button"
      onClick={() => {
        setOpen(false)
        run()
      }}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
    >
      {icon}
      {label}
    </button>
  )
  return (
    <div ref={ref} className={clsx('relative', className)}>
      <Button variant="primary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Plus className="h-4 w-4" /> جدید
      </Button>
      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          {item(<ListPlus className="h-4 w-4 text-slate-400" />, 'تسک', () => openTask())}
          {item(<FolderPlus className="h-4 w-4 text-slate-400" />, 'پروژه', () => openProject())}
          {item(<CalendarPlus className="h-4 w-4 text-slate-400" />, 'رویداد', () => openEvent())}
          {item(<UserPlus className="h-4 w-4 text-slate-400" />, 'فرد', () => openMember())}
        </div>
      )}
    </div>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const { db, me, session } = useStore()
  const who = me ?? { name: session.name || session.login, color: '#64748b' }
  return (
    <div className="min-h-dvh bg-slate-50 md:flex">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-l border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-8 w-8" />
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-slate-900">{db.teamName}</div>
            <div className="text-2xs text-slate-400">مدیریت پروژه و تسک</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100',
                )
              }
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-3">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              clsx('flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors', isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100')
            }
          >
            <Avatar member={who} size="sm" />
            <span className="min-w-0 flex-1 truncate">{who.name}</span>
            <Settings className="h-4 w-4 text-slate-400" />
          </NavLink>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur pt-[env(safe-area-inset-top)]">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
            <div className="flex min-w-0 items-center gap-2 md:hidden">
              <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-7 w-7" />
              <span className="truncate text-sm font-bold">{db.teamName}</span>
            </div>
            <div className="flex-1" />
            <SyncIndicator compact />
            <QuickAdd />
            <NavLink to="/settings" className="md:hidden" aria-label="تنظیمات">
              <Avatar member={who} size="md" />
            </NavLink>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 md:pb-10">
          <ErrorBanner />
          {children}
        </main>
      </div>

      {/* Bottom navigation (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx('flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium', isActive ? 'text-brand-600' : 'text-slate-500')
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
