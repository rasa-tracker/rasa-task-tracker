/**
 * Who can sign in: membership of the GitHub organization that owns the data
 * repository. Organization owners whose token has "Members: Read and write"
 * can also send invitations from inside the app.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { inviteToOrg, listInvitations, listOrgMembers, type InviteResult, type OrgInvitation } from '../lib/github'
import { useStore } from './store'
import type { Member } from './types'

export type Access = 'member' | 'invited' | 'none'

interface OrgValue {
  /** null while checking; false when this token cannot manage invitations. */
  canInvite: boolean | null
  org: string | null
  accessOf: (m: Pick<Member, 'githubLogin' | 'email'>) => Access | null
  invite: (target: { login?: string; email?: string }) => Promise<InviteResult>
  refresh: () => Promise<void>
}

const OrgContext = createContext<OrgValue>({
  canInvite: false,
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

  const refresh = useCallback(async () => {
    if (!token || !org) return
    try {
      const invites = await listInvitations(token, org)
      if (invites === null) {
        setCanInvite(false)
        return
      }
      setInvitations(invites)
      setMembers(new Set(await listOrgMembers(token, org)))
      setCanInvite(true)
    } catch {
      setCanInvite(false)
    }
  }, [token, org])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo<OrgValue>(
    () => ({
      canInvite,
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
    [canInvite, org, refresh, members, invitations, token],
  )

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

export const INVITE_MESSAGES: Record<InviteResult, string> = {
  sent: 'دعوت فرستاده شد. بعد از قبول دعوت (از ایمیل یا صفحه گیت‌هاب)، می‌تواند با کلید خودش وارد برنامه شود.',
  'already-member': 'این فرد از قبل عضو سازمان است و می‌تواند وارد برنامه شود.',
  'already-invited': 'برای این فرد قبلاً دعوت فرستاده شده و منتظر قبول است.',
}
