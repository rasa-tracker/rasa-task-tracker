/**
 * Who can sign in: membership of the GitHub organization that owns the data
 * repository. Organization owners whose token has "Members: Read and write"
 * can also send invitations from inside the app.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { GitHubError, inviteToOrg, listInvitations, listOrgMembers, type InviteResult, type OrgInvitation } from '../lib/github'
import { useStore } from './store'
import type { Member } from './types'

export type Access = 'member' | 'invited' | 'none'

interface OrgValue {
  /** null while checking; false when this token cannot manage invitations. */
  canInvite: boolean | null
  /** Why invitations are off: GitHub's own answer, plus a plain hint when we recognise it. */
  reason: { hint: string | null; detail: string } | null
  /** When the last check finished. */
  checkedAt: number | null
  org: string | null
  accessOf: (m: Pick<Member, 'githubLogin' | 'email'>) => Access | null
  invite: (target: { login?: string; email?: string }) => Promise<InviteResult>
  refresh: () => Promise<void>
}

const OrgContext = createContext<OrgValue>({
  canInvite: false,
  reason: null,
  checkedAt: null,
  org: null,
  accessOf: () => null,
  invite: async () => 'sent',
  refresh: async () => {},
})

export function useOrg() {
  return useContext(OrgContext)
}

export function OrgProvider({ children }: { children: ReactNode }) {
  const { session } = useStore()
  const token = session.kind === 'github' ? session.token : null
  const org = session.kind === 'github' ? session.owner : null
  const [canInvite, setCanInvite] = useState<boolean | null>(token ? null : false)
  const [members, setMembers] = useState<Set<string>>(new Set())
  const [invitations, setInvitations] = useState<OrgInvitation[]>([])

  const [reason, setReason] = useState<OrgValue['reason']>(null)
  const [checkedAt, setCheckedAt] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    if (!token || !org) return
    try {
      const invites = await listInvitations(token, org)
      const logins = await listOrgMembers(token, org)
      setInvitations(invites)
      setMembers(new Set(logins))
      setReason(null)
      setCanInvite(true)
    } catch (e) {
      setReason(explain(e))
      setCanInvite(false)
    } finally {
      setCheckedAt(Date.now())
    }
  }, [token, org])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Coming back from GitHub after editing the token: check again on its own.
  useEffect(() => {
    if (canInvite !== false || !token) return
    const onFocus = () => document.visibilityState === 'visible' && void refresh()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [canInvite, token, refresh])

  const value = useMemo<OrgValue>(
    () => ({
      canInvite,
      reason,
      checkedAt,
      org,
      refresh,
      accessOf: (m) => {
        if (!canInvite) return null
        const login = m.githubLogin?.toLowerCase()
        const email = m.email?.toLowerCase()
        if (login && members.has(login)) return 'member'
        if (invitations.some((i) => (login && i.login?.toLowerCase() === login) || (email && i.email?.toLowerCase() === email))) return 'invited'
        return 'none'
      },
      invite: async (target) => {
        if (!token || !org) throw new Error('not signed in with GitHub')
        const result = await inviteToOrg(token, org, target)
        await refresh()
        return result
      },
    }),
    [canInvite, reason, checkedAt, org, refresh, members, invitations, token],
  )

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

export const INVITE_MESSAGES: Record<InviteResult, string> = {
  sent: 'دعوت فرستاده شد. بعد از قبول دعوت (از ایمیل یا صفحه گیت‌هاب)، می‌تواند با کلید خودش وارد برنامه شود.',
  'already-member': 'این فرد از قبل عضو سازمان است و می‌تواند وارد برنامه شود.',
  'already-invited': 'برای این فرد قبلاً دعوت فرستاده شده و منتظر قبول است.',
}

function explain(e: unknown): { hint: string | null; detail: string } {
  if (!(e instanceof GitHubError)) {
    const detail = e instanceof Error ? e.message : String(e)
    return { hint: 'اتصال به گیت‌هاب برقرار نشد. اینترنت را بررسی کنید و دوباره امتحان کنید.', detail }
  }
  const detail = `${e.status} ${e.message}`
  const m = e.message.toLowerCase()
  let hint: string | null = null
  if (m.includes('personal access token')) hint = 'کلیدی که با آن وارد شده‌اید هنوز اجازه Members را ندارد. مطمئن شوید همین کلید را ویرایش کرده‌اید و Update را زده‌اید.'
  else if (m.includes('admin') || m.includes('owner')) hint = 'حساب شما مدیر (Owner) سازمان نیست. فقط مدیر سازمان می‌تواند دعوت بفرستد.'
  else if (e.status === 401) hint = 'کلید معتبر نیست یا منقضی شده است. از برنامه خارج شوید و با کلید درست دوباره وارد شوید.'
  else if (e.status === 404) hint = 'گیت‌هاب سازمان را برای این کلید پیدا نکرد. در صفحه کلید، Resource owner باید همین سازمان باشد.'
  return { hint, detail }
}
