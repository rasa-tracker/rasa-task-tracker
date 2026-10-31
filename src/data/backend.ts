import { ConflictError, readFile, writeFile, type RepoRef } from '../lib/github'
import { normalizeDatabase, type Database } from './types'
import { demoDatabase } from './demo'

export type BackendRead =
  | { kind: 'unchanged' }
  | { kind: 'missing' }
  | { kind: 'file'; db: Database; version: string; etag: string | null }

export interface Backend {
  kind: 'github' | 'demo'
  read(etag: string | null): Promise<BackendRead>
  /** Returns the new version. Throws ConflictError when `version` is stale. */
  write(db: Database, version: string | null, message: string): Promise<string>
}

export function githubBackend(token: string, ref: RepoRef): Backend {
  return {
    kind: 'github',
    async read(etag) {
      const r = await readFile(token, ref, etag)
      if (r.kind !== 'file') return r
      return { kind: 'file', db: normalizeDatabase(JSON.parse(r.text)), version: r.sha, etag: r.etag }
    },
    async write(db, version, message) {
      const text = JSON.stringify(db, null, 2) + '\n'
      const { sha } = await writeFile(token, ref, text, version, message)
      return sha
    },
  }
}

const DEMO_KEY = 'rasa.demo.db'

/** Keeps everything in this browser only. For trying the app without an account. */
export function demoBackend(): Backend {
  const load = (): { db: Database; version: string } => {
    const raw = localStorage.getItem(DEMO_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { db: normalizeDatabase(parsed.db), version: String(parsed.version) }
    }
    const seeded = { db: demoDatabase(), version: '1' }
    localStorage.setItem(DEMO_KEY, JSON.stringify(seeded))
    return seeded
  }
  let lastSeen: string | null = null
  return {
    kind: 'demo',
    async read() {
      const { db, version } = load()
      if (lastSeen === version) return { kind: 'unchanged' }
      lastSeen = version
      return { kind: 'file', db, version, etag: version }
    },
    async write(db, version) {
      const current = load()
      if (version !== current.version) throw new ConflictError('conflict')
      const next = String(Number(current.version) + 1)
      localStorage.setItem(DEMO_KEY, JSON.stringify({ db, version: next }))
      lastSeen = next
      return next
    },
  }
}

export function resetDemo() {
  localStorage.removeItem(DEMO_KEY)
}
