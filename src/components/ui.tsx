import clsx from 'clsx'
import { X } from 'lucide-react'
import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { fa } from '../lib/date'
import { PRIORITY_LABEL, STATUS_LABEL, type Member, type Priority, type Status } from '../data/types'

export { clsx as cx }

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      {...props}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-10 px-4 text-sm',
        variant === 'primary' && 'bg-brand-600 text-white shadow-sm hover:bg-brand-700',
        variant === 'secondary' && 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
        variant === 'ghost' && 'text-slate-600 hover:bg-slate-100',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
        className,
      )}
    />
  )
}

export function IconButton({ className, label, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={clsx(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        className,
      )}
    />
  )
}

const fieldClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(fieldClass, 'h-10', className)} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={clsx(fieldClass, 'py-2 leading-6', className)} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={clsx(fieldClass, 'h-10 appearance-none bg-[length:1rem] pl-8', 'select-chevron', className)}>
      {children}
    </select>
  )
}

export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <label className={clsx('block space-y-1.5', className)}>
      <span className="block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="block text-2xs text-slate-400">{hint}</span>}
    </label>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('rounded-xl border border-slate-200/80 bg-white shadow-sm', className)}>{children}</div>
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.querySelector<HTMLElement>('input,textarea,select')?.focus({ preventScroll: true })
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]" onClick={onClose} />
      <div
        ref={ref}
        className={clsx(
          'relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <IconButton label="بستن" onClick={onClose}>
            <X className="h-5 w-5" />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'حذف',
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
        </>
      }
    >
      <p className="text-sm leading-7 text-slate-600">{message}</p>
    </Modal>
  )
}

const STATUS_STYLE: Record<Status, string> = {
  todo: 'bg-slate-100 text-slate-700 ring-slate-200',
  in_progress: 'bg-blue-50 text-blue-700 ring-blue-200',
  on_hold: 'bg-amber-50 text-amber-700 ring-amber-200',
  done: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cancelled: 'bg-rose-50 text-rose-600 ring-rose-200',
}

export const STATUS_DOT: Record<Status, string> = {
  todo: 'bg-slate-400',
  in_progress: 'bg-blue-500',
  on_hold: 'bg-amber-500',
  done: 'bg-emerald-500',
  cancelled: 'bg-rose-400',
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-2xs font-medium ring-1 ring-inset', STATUS_STYLE[status], className)}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', STATUS_DOT[status])} />
      {STATUS_LABEL[status]}
    </span>
  )
}

const PRIORITY_STYLE: Record<Priority, string> = {
  low: 'text-slate-500',
  medium: 'text-slate-600',
  high: 'text-orange-600',
  urgent: 'text-red-600 font-semibold',
}

export function PriorityLabel({ priority }: { priority: Priority }) {
  if (priority === 'medium' || priority === 'low') return null
  return <span className={clsx('text-2xs', PRIORITY_STYLE[priority])}>اولویت {PRIORITY_LABEL[priority]}</span>
}

export function OverdueBadge() {
  return <span className="inline-flex items-center whitespace-nowrap rounded-full bg-red-50 px-2 py-0.5 text-2xs font-medium text-red-600 ring-1 ring-inset ring-red-200">عقب‌افتاده</span>
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2)
  return parts[0][0] + '‌' + parts[parts.length - 1][0]
}

export function Avatar({ member, size = 'md', className }: { member: Pick<Member, 'name' | 'color'>; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  return (
    <span
      title={member.name}
      className={clsx(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ring-2 ring-white',
        size === 'sm' && 'h-6 w-6 text-[10px]',
        size === 'md' && 'h-8 w-8 text-xs',
        size === 'lg' && 'h-11 w-11 text-sm',
        size === 'xl' && 'h-16 w-16 text-lg',
        className,
      )}
      style={{ backgroundColor: member.color }}
    >
      {initials(member.name)}
    </span>
  )
}

export function AvatarStack({ members, max = 4, size = 'sm' }: { members: Member[]; max?: number; size?: 'sm' | 'md' }) {
  if (!members.length) return <span className="text-2xs text-slate-400">بدون مسئول</span>
  const shown = members.slice(0, max)
  return (
    <span className="flex items-center -space-x-1.5 space-x-reverse" title={members.map((m) => m.name).join('، ')}>
      {shown.map((m) => (
        <Avatar key={m.id} member={m} size={size} />
      ))}
      {members.length > max && (
        <span className={clsx('inline-flex items-center justify-center rounded-full bg-slate-200 font-medium text-slate-600 ring-2 ring-white', size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs')}>
          {fa(`+${members.length - max}`)}
        </span>
      )}
    </span>
  )
}

export function ProgressBar({ value, className }: { value: number | null; className?: string }) {
  const pct = value === null ? 0 : Math.round(value * 100)
  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={clsx('h-full rounded-full', pct === 100 ? 'bg-emerald-500' : 'bg-brand-500')} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 text-left text-2xs tabular-nums text-slate-500">{value === null ? '—' : `${fa(pct)}٪`}</span>
    </div>
  )
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center">
      {icon && <div className="text-slate-300">{icon}</div>}
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {children && <div className="text-xs leading-6 text-slate-400">{children}</div>}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
}) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={clsx(
            'inline-flex h-8 items-center gap-1 rounded-md px-3 text-xs font-medium transition-colors',
            value === o.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
