export interface GitHubSession {
  kind: 'github'
  token: string
  owner: string
  repo: string
  path: string
  login: string
  name: string
  avatarUrl: string
}

export interface DemoSession {
  kind: 'demo'
  login: 'demo'
  name: string
}

export type Session = GitHubSession | DemoSession

const KEY = 'rasa.session'

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function saveSession(s: Session) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export function clearSession() {
  localStorage.removeItem(KEY)
}

/** Where the team's data lives. Set at build time; can be changed on the sign-in page. */
export function defaultDataRepo(): { owner: string; repo: string; path: string } {
  const configured = (import.meta.env.VITE_DATA_REPO as string | undefined) ?? ''
  const [owner = '', repo = 'rasa-task-data'] = configured.split('/')
  return { owner, repo, path: (import.meta.env.VITE_DATA_PATH as string | undefined) || 'data/db.json' }
}
