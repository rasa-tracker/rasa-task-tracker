import { Loader2, Send } from 'lucide-react'
import { useState } from 'react'
import { INVITE_MESSAGES, useOrg } from '../data/org'
import type { Member } from '../data/types'
import { useDialogs } from './dialogs'
import { useToast } from './toast'
import { Button } from './ui'

/** Whether this person can sign in, with an invite button for organization owners. */
export function AccessStatus({ member }: { member: Member }) {
  const { canInvite, accessOf, invite } = useOrg()
  const { openMember } = useDialogs()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  if (!canInvite) return null
  const access = accessOf(member)
  if (access === 'member') {
    return <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-2xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">می‌تواند وارد برنامه شود</span>
  }
  if (access === 'invited') {
    return <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-2xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">دعوت فرستاده شده، منتظر قبول</span>
  }
  const target = member.githubLogin ? { login: member.githubLogin } : member.email ? { email: member.email } : null
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-2xs text-slate-600">هنوز به برنامه دسترسی ندارد</span>
      <Button
        size="sm"
        disabled={busy}
        onClick={() => {
          if (!target) {
            toast('برای دعوت، نام کاربری گیت‌هاب یا ایمیل این فرد را در مشخصاتش بنویسید.', 'info')
            openMember(member)
            return
          }
          setBusy(true)
          invite(target)
            .then((r) => toast(`${member.name}: ${INVITE_MESSAGES[r]}`, 'success'))
            .catch((e) => toast(e instanceof Error ? e.message : String(e), 'error'))
            .finally(() => setBusy(false))
        }}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        دعوت به برنامه
      </Button>
    </span>
  )
}
