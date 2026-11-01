/**
 * Minimal GitHub REST client for keeping the team's data in one JSON file in a
 * private repository. Every save is a commit, so the repository's history is a
 * full log of who changed what.
 */

const API = 'https://api.github.com'

export class GitHubError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

export class ConflictError extends Error {}

export interface RepoRef {
  owner: string
  repo: string
  path: string
  branch?: string
}

export interface GitHubUser {
  login: string
  name: string | null
  avatar_url: string
}

function headers(token: string, extra: Record<string, string> = {}): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    ...extra,
  }
}

async function failure(res: Response): Promise<GitHubError> {
  let message = res.statusText
  try {
    const body = await res.json()
    if (body?.message) message = body.message
    if (Array.isArray(body?.errors) && body.errors.length) {
      message += ': ' + body.errors.map((e: { message?: string; code?: string }) => e.message ?? e.code ?? '').join('; ')
    }
  } catch {
    /* body was not JSON */
  }
  return new GitHubError(message, res.status)
}

export async function getUser(token: string): Promise<GitHubUser> {
  const res = await fetch(`${API}/user`, { headers: headers(token), cache: 'no-store' })
  if (!res.ok) throw await failure(res)
  return res.json()
}

export interface RepoInfo {
  full_name: string
  private: boolean
  default_branch: string
  permissions?: { push?: boolean; pull?: boolean; admin?: boolean }
}

export async function getRepo(token: string, ref: RepoRef): Promise<RepoInfo> {
  const res = await fetch(`${API}/repos/${ref.owner}/${ref.repo}`, {
    headers: headers(token),
    cache: 'no-store',
  })
  if (!res.ok) throw await failure(res)
  return res.json()
}

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function base64ToUtf8(b64: string): string {
  const binary = atob(b64.replace(/\s/g, ''))
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export type ReadResult =
  | { kind: 'unchanged' }
  | { kind: 'missing' }
  | { kind: 'file'; text: string; sha: string; etag: string | null }

function contentsUrl(ref: RepoRef): string {
  const path = ref.path.split('/').map(encodeURIComponent).join('/')
  const query = ref.branch ? `?ref=${encodeURIComponent(ref.branch)}` : ''
  return `${API}/repos/${ref.owner}/${ref.repo}/contents/${path}${query}`
}

/**
 * Read the data file. Passing the last ETag makes an unchanged file cost a 304,
 * which GitHub does not count against the rate limit.
 */
export async function readFile(token: string, ref: RepoRef, etag?: string | null): Promise<ReadResult> {
  const res = await fetch(contentsUrl(ref), {
    headers: headers(token, etag ? { 'If-None-Match': etag } : {}),
    cache: 'no-store',
  })
  if (res.status === 304) return { kind: 'unchanged' }
  // An empty repository answers 404 too.
  if (res.status === 404) {
    const body = await res.json().catch(() => ({}))
    if (/not found|empty/i.test(String(body?.message ?? ''))) return { kind: 'missing' }
    throw new GitHubError(String(body?.message ?? 'Not Found'), 404)
  }
  if (!res.ok) throw await failure(res)
  const body = await res.json()
  let text: string
  if (body.content) {
    text = base64ToUtf8(body.content)
  } else {
    // Files over 1 MB come without inline content.
    const raw = await fetch(contentsUrl(ref), {
      headers: headers(token, { Accept: 'application/vnd.github.raw' }),
      cache: 'no-store',
    })
    if (!raw.ok) throw await failure(raw)
    text = await raw.text()
  }
  return { kind: 'file', text, sha: body.sha, etag: res.headers.get('ETag') }
}

/** Create or replace the file. Throws ConflictError when someone else saved first. */
export async function writeFile(
  token: string,
  ref: RepoRef,
  text: string,
  sha: string | null,
  message: string,
): Promise<{ sha: string }> {
  const res = await fetch(contentsUrl({ ...ref, branch: undefined }), {
    method: 'PUT',
    headers: headers(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      message,
      content: utf8ToBase64(text),
      ...(sha ? { sha } : {}),
      ...(ref.branch ? { branch: ref.branch } : {}),
    }),
  })
  if (res.status === 409 || (res.status === 422 && sha === null)) {
    throw new ConflictError('conflict')
  }
  if (res.status === 422) {
    const err = await failure(res)
    if (/sha|does not match|expected/i.test(err.message)) throw new ConflictError(err.message)
    throw err
  }
  if (!res.ok) throw await failure(res)
  const body = await res.json()
  return { sha: body.content.sha }
}

/** Link that opens GitHub's "new token" form with the right settings filled in. */
export function newTokenUrl(owner: string, teamName: string): string {
  const params = new URLSearchParams({
    name: `${teamName} - task tracker`.slice(0, 40),
    description: 'ورود به برنامه مدیریت پروژه و تسک',
    target_name: owner,
    expires_in: '366',
    contents: 'write',
    metadata: 'read',
  })
  return `https://github.com/settings/personal-access-tokens/new?${params}`
}

/* ---------------------------------------------------------------------------
 * Organization invitations
 *
 * Only an organization owner whose token also has the organization permission
 * "Members: Read and write" can use these. Everyone else simply does not see
 * the invite controls.
 * ------------------------------------------------------------------------- */

export interface OrgInvitation {
  id: number
  login: string | null
  email: string | null
}

async function getJson<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: headers(token), cache: 'no-store' })
  if (!res.ok) throw await failure(res)
  return res.json()
}

/** Pending invitations, or null when this token may not manage the organization's members. */
export async function listInvitations(token: string, org: string): Promise<OrgInvitation[] | null> {
  try {
    const rows = await getJson<{ id: number; login: string | null; email: string | null }[]>(
      token,
      `/orgs/${encodeURIComponent(org)}/invitations?per_page=100`,
    )
    return rows.map((r) => ({ id: r.id, login: r.login, email: r.email }))
  } catch (e) {
    if (e instanceof GitHubError && (e.status === 403 || e.status === 404)) return null
    throw e
  }
}

/** Logins (lower-case) of everyone in the organization. */
export async function listOrgMembers(token: string, org: string): Promise<string[]> {
  const logins: string[] = []
  for (let page = 1; page <= 5; page++) {
    const rows = await getJson<{ login: string }[]>(token, `/orgs/${encodeURIComponent(org)}/members?per_page=100&page=${page}`)
    logins.push(...rows.map((r) => r.login.toLowerCase()))
    if (rows.length < 100) break
  }
  return logins
}

export type InviteResult = 'sent' | 'already-member' | 'already-invited'

export class InviteError extends Error {}

/** Invite someone to the organization by GitHub username, or by email when they have no account yet. */
export async function inviteToOrg(token: string, org: string, target: { login?: string; email?: string }): Promise<InviteResult> {
  let body: Record<string, unknown>
  if (target.login) {
    const res = await fetch(`${API}/users/${encodeURIComponent(target.login)}`, { headers: headers(token), cache: 'no-store' })
    if (res.status === 404) throw new InviteError(`کاربری با نام «${target.login}» در گیت‌هاب پیدا نشد.`)
    if (!res.ok) throw await failure(res)
    const user = await res.json()
    body = { invitee_id: user.id, role: 'direct_member' }
  } else if (target.email) {
    body = { email: target.email, role: 'direct_member' }
  } else {
    throw new InviteError('برای دعوت، نام کاربری گیت‌هاب یا ایمیل این فرد لازم است.')
  }
  const res = await fetch(`${API}/orgs/${encodeURIComponent(org)}/invitations`, {
    method: 'POST',
    headers: headers(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  })
  if (res.ok) return 'sent'
  const detail = (await failure(res)).message
  if (res.status === 422 && /already.*(member|part of)/i.test(detail)) return 'already-member'
  if (res.status === 422 && /already.*invit|pending/i.test(detail)) return 'already-invited'
  if (res.status === 403 || res.status === 404)
    throw new InviteError('کلید شما اجازه دعوت به سازمان را ندارد. در تنظیمات برنامه، بخش «دعوت همکاران» را ببینید.')
  throw new InviteError(`گیت‌هاب دعوت را نپذیرفت: ${detail}`)
}

/** GitHub's list of the signed-in user's fine-grained tokens, where a token's permissions can be edited. */
export const TOKENS_PAGE = 'https://github.com/settings/personal-access-tokens'
