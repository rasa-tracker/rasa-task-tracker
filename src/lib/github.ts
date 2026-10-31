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
