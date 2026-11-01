import clsx from 'clsx'
import { CheckCircle2, AlertTriangle, X } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Tone = 'success' | 'error' | 'info'
interface Toast {
  id: number
  text: string
  tone: Tone
}

const ToastContext = createContext<(text: string, tone?: Tone) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id))
  const show = useCallback((text: string, tone: Tone = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text, tone }])
    setTimeout(() => dismiss(id), tone === 'error' ? 9000 : 5000)
  }, [])
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={clsx(
              'pointer-events-auto flex w-full max-w-md items-start gap-2 rounded-xl px-4 py-3 text-sm leading-6 shadow-lg ring-1',
              t.tone === 'success' && 'bg-emerald-50 text-emerald-800 ring-emerald-200',
              t.tone === 'error' && 'bg-red-50 text-red-800 ring-red-200',
              t.tone === 'info' && 'bg-white text-slate-700 ring-slate-200',
            )}
          >
            {t.tone === 'error' ? <AlertTriangle className="mt-1 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-1 h-4 w-4 shrink-0" />}
            <span className="flex-1">{t.text}</span>
            <button type="button" aria-label="بستن" onClick={() => dismiss(t.id)} className="mt-0.5 rounded p-0.5 opacity-60 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
