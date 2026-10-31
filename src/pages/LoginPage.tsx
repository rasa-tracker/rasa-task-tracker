import { ExternalLink, KeyRound, Loader2, PlayCircle } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, Field, Input } from '../components/ui'
import { defaultDataRepo, type Session } from '../data/session'
import { getRepo, getUser, GitHubError, newTokenUrl } from '../lib/github'

export function LoginPage({ onLogin }: { onLogin: (s: Session) => void }) {
  const defaults = defaultDataRepo()
  const [token, setToken] = useState('')
  const [repoInput, setRepoInput] = useState(defaults.owner ? `${defaults.owner}/${defaults.repo}` : '')
  const [showRepo, setShowRepo] = useState(!defaults.owner)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [owner, repo] = repoInput.trim().replace(/^https?:\/\/github\.com\//, '').split('/')

  const submit = async () => {
    setError(null)
    const t = token.trim()
    if (!t) return setError('کلید دسترسی را وارد کنید.')
    if (!owner || !repo) return setError('نام مخزن داده‌ها را به شکل سازمان/مخزن بنویسید.')
    setBusy(true)
    try {
      const user = await getUser(t).catch((e) => {
        if (e instanceof GitHubError && e.status === 401) throw new Error('این کلید معتبر نیست. دوباره کپی کنید یا کلید تازه بسازید.')
        throw e
      })
      await getRepo(t, { owner, repo, path: defaults.path }).catch((e) => {
        if (e instanceof GitHubError && (e.status === 404 || e.status === 403)) {
          throw new Error(
            `کلید شما به مخزن ${owner}/${repo} دسترسی ندارد. بررسی کنید: ۱) هنگام ساخت کلید، این مخزن را انتخاب کرده باشید. ۲) عضو سازمان ${owner} باشید. ۳) اگر کلید «در انتظار تایید» است، مدیر سازمان باید آن را تایید کند.`,
          )
        }
        throw e
      })
      onLogin({
        kind: 'github',
        token: t,
        owner,
        repo,
        path: defaults.path,
        login: user.login,
        name: user.name || user.login,
        avatarUrl: user.avatar_url,
      })
    } catch (e) {
      setError(e instanceof TypeError ? 'اتصال به گیت‌هاب برقرار نشد. اینترنت را بررسی کنید.' : e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-brand-50 to-slate-50 p-4">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="mx-auto mb-3 h-14 w-14" />
          <h1 className="text-xl font-bold text-slate-900">مدیریت پروژه و تسک تیم رصا</h1>
          <p className="mt-1 text-sm text-slate-500">پروژه‌ها، تسک‌ها، افراد و تقویم تیم در یک جا</p>
        </div>

        <Card className="space-y-4 p-5">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              void submit()
            }}
          >
            <Field label="کلید دسترسی گیت‌هاب">
              <Input
                type="password"
                dir="ltr"
                autoComplete="current-password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="github_pat_…"
              />
            </Field>
            {showRepo ? (
              <Field label="مخزن داده‌ها" hint="به شکل سازمان/مخزن، مثلاً rasa-tracker/rasa-task-data">
                <Input dir="ltr" value={repoInput} onChange={(e) => setRepoInput(e.target.value)} placeholder="owner/repo" />
              </Field>
            ) : (
              <button type="button" className="text-2xs text-slate-400 hover:text-slate-600" onClick={() => setShowRepo(true)}>
                مخزن داده‌ها: <span dir="ltr">{repoInput}</span> (تغییر)
              </button>
            )}
            {error && <p className="rounded-lg bg-red-50 p-3 text-xs leading-6 text-red-700">{error}</p>}
            <Button type="submit" variant="primary" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              ورود
            </Button>
          </form>

          <details className="group rounded-lg bg-slate-50 p-3 text-xs leading-6 text-slate-600">
            <summary className="cursor-pointer font-medium text-slate-700">کلید دسترسی ندارم. چطور بسازم؟</summary>
            <ol className="mt-2 list-decimal space-y-1.5 pr-4">
              <li>
                اگر حساب گیت‌هاب ندارید، در{' '}
                <a className="text-brand-600 underline" href="https://github.com/signup" target="_blank" rel="noreferrer">
                  github.com
                </a>{' '}
                بسازید و نام کاربری‌تان را به مدیر تیم بدهید تا شما را به سازمان اضافه کند. دعوت‌نامه را از ایمیل قبول کنید.
              </li>
              <li>
                روی{' '}
                <a
                  className="inline-flex items-center gap-0.5 font-medium text-brand-600 underline"
                  href={newTokenUrl(owner || defaults.owner || '', 'RASA')}
                  target="_blank"
                  rel="noreferrer"
                >
                  ساختن کلید <ExternalLink className="h-3 w-3" />
                </a>{' '}
                بزنید. صفحه گیت‌هاب با تنظیمات لازم باز می‌شود.
              </li>
              <li>
                در قسمت <b>Repository access</b> گزینه <b>Only select repositories</b> را بزنید و مخزن <b dir="ltr">{repo || 'rasa-task-data'}</b> را انتخاب کنید.
              </li>
              <li>
                پایین صفحه <b>Generate token</b> را بزنید، کلیدی را که با <span dir="ltr">github_pat_</span> شروع می‌شود کپی کنید و همین‌جا بچسبانید.
              </li>
            </ol>
            <p className="mt-2 text-slate-500">کلید فقط روی همین دستگاه ذخیره می‌شود. روی هر دستگاه یک بار وارد می‌شوید.</p>
          </details>
        </Card>

        <button
          type="button"
          onClick={() => onLogin({ kind: 'demo', login: 'demo', name: 'کاربر نمایشی' })}
          className="mx-auto flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600"
        >
          <PlayCircle className="h-4 w-4" />
          دیدن نسخه نمایشی بدون ورود
        </button>
      </div>
    </div>
  )
}
