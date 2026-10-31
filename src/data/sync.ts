/**
 * Keeps the shared database in step with the backend.
 *
 * Every change is recorded as a small function ("mutation") rather than a whole
 * new copy of the data. Saving applies the mutation to the latest saved version.
 * If a teammate saved in the meantime, the engine downloads their version and
 * applies the mutation again on top of it, so neither person's change is lost.
 */
import { ConflictError, GitHubError } from '../lib/github'
import type { Backend } from './backend'
import { emptyDatabase, type Database } from './types'

export type Mutation = (draft: Database) => void

interface Pending {
  mutate: Mutation
  message: string
}

export type SyncStatus = 'loading' | 'synced' | 'saving' | 'offline' | 'error'

export interface SyncSnapshot {
  ready: boolean
  /** False until the data file has been created in the repository. */
  exists: boolean
  db: Database
  status: SyncStatus
  pendingCount: number
  lastSyncedAt: string | null
  error: string | null
}

const POLL_MS = 30_000
const RETRY_MS = 10_000

function apply(db: Database, mutate: Mutation): Database {
  const draft = structuredClone(db)
  mutate(draft)
  draft.revision = (db.revision ?? 0) + 1
  draft.updatedAt = new Date().toISOString()
  return draft
}

function isNetworkError(e: unknown): boolean {
  return e instanceof TypeError || (e instanceof GitHubError && e.status >= 500)
}

export function describeError(e: unknown): string {
  if (e instanceof GitHubError) {
    if (e.status === 401) return 'کلید دسترسی معتبر نیست یا منقضی شده است. دوباره وارد شوید.'
    if (e.status === 403)
      return 'اجازه نوشتن در مخزن داده‌ها را ندارید. از مدیر سازمان بخواهید دسترسی Write بدهد یا کلید شما را تایید کند.'
    if (e.status === 404) return 'مخزن داده‌ها پیدا نشد یا کلید شما به آن دسترسی ندارد.'
    return `خطای گیت‌هاب: ${e.message}`
  }
  if (e instanceof TypeError) return 'اتصال اینترنت برقرار نیست.'
  return e instanceof Error ? e.message : String(e)
}

export class SyncEngine {
  private remote: { db: Database; version: string | null; etag: string | null } = {
    db: emptyDatabase(),
    version: null,
    etag: null,
  }
  private pending: Pending[] = []
  private saving = false
  private listeners = new Set<() => void>()
  private snapshot: SyncSnapshot
  private timer: ReturnType<typeof setInterval> | null = null
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private state = {
    ready: false,
    exists: false,
    status: 'loading' as SyncStatus,
    lastSyncedAt: null as string | null,
    error: null as string | null,
  }

  constructor(private backend: Backend) {
    this.snapshot = this.build()
  }

  get kind() {
    return this.backend.kind
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getSnapshot = () => this.snapshot

  private build(): SyncSnapshot {
    const db = this.pending.reduce((d, p) => apply(d, p.mutate), this.remote.db)
    return { ...this.state, db, pendingCount: this.pending.length }
  }

  private emit() {
    this.snapshot = this.build()
    this.listeners.forEach((fn) => fn())
  }

  private set(patch: Partial<typeof this.state>) {
    Object.assign(this.state, patch)
    this.emit()
  }

  start() {
    void this.refresh()
    this.timer = setInterval(() => {
      if (document.visibilityState === 'visible') void this.refresh()
    }, POLL_MS)
    document.addEventListener('visibilitychange', this.onVisible)
    window.addEventListener('online', this.onOnline)
    window.addEventListener('beforeunload', this.onUnload)
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    if (this.retryTimer) clearTimeout(this.retryTimer)
    document.removeEventListener('visibilitychange', this.onVisible)
    window.removeEventListener('online', this.onOnline)
    window.removeEventListener('beforeunload', this.onUnload)
  }

  private onVisible = () => {
    if (document.visibilityState === 'visible') void this.refresh()
  }

  private onOnline = () => {
    void this.flush()
  }

  private onUnload = (e: BeforeUnloadEvent) => {
    if (this.pending.length) {
      e.preventDefault()
      e.returnValue = ''
    }
  }

  /** Fetch teammates' latest changes. */
  async refresh(force = false): Promise<void> {
    if (this.saving && !force) return
    try {
      const r = await this.backend.read(force ? null : this.remote.etag)
      if (r.kind === 'file') {
        // GitHub can briefly serve the previous copy right after a save. Never go backwards.
        if (r.db.revision >= this.remote.db.revision || r.version === this.remote.version) {
          this.remote = { db: r.db, version: r.version, etag: r.etag }
        }
      }
      // A "missing" answer right after we created the file is a stale read; keep what we have.
      const exists = r.kind === 'file' ? true : r.kind === 'missing' ? this.remote.version !== null : this.state.exists
      this.set({
        ready: true,
        exists,
        lastSyncedAt: new Date().toISOString(),
        status: this.pending.length ? this.state.status : 'synced',
        error: this.pending.length ? this.state.error : null,
      })
    } catch (e) {
      if (force) throw e
      this.set({
        status: isNetworkError(e) ? 'offline' : 'error',
        error: describeError(e),
      })
    }
  }

  /** Record a change. It shows immediately and is saved in the background. */
  commit(mutate: Mutation, message: string) {
    this.pending.push({ mutate, message })
    this.emit()
    void this.flush()
  }

  private flushing: Promise<void> | null = null

  /** Save queued changes. Calling it while a save is running waits for that save. */
  flush(): Promise<void> {
    if (this.flushing) return this.flushing
    if (!this.pending.length) return Promise.resolve()
    this.flushing = this.runFlush().finally(() => {
      this.flushing = null
    })
    return this.flushing
  }

  private async runFlush(): Promise<void> {
    this.saving = true
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.set({ status: 'saving', error: null })
    let conflicts = 0
    try {
      while (this.pending.length) {
        const p = this.pending[0]
        const next = apply(this.remote.db, p.mutate)
        try {
          const version = await this.backend.write(next, this.remote.version, p.message)
          this.remote = { db: next, version, etag: null }
          this.pending.shift()
          conflicts = 0
          this.set({ exists: true, lastSyncedAt: new Date().toISOString() })
        } catch (e) {
          if (e instanceof ConflictError && conflicts < 6) {
            conflicts++
            await new Promise((r) => setTimeout(r, 300 * conflicts))
            await this.refresh(true)
            continue
          }
          throw e
        }
      }
      this.saving = false
      this.set({ status: 'synced', error: null })
    } catch (e) {
      this.saving = false
      if (isNetworkError(e)) {
        this.set({ status: 'offline', error: describeError(e) })
        this.retryTimer = setTimeout(() => void this.flush(), RETRY_MS)
      } else {
        this.set({ status: 'error', error: describeError(e) })
      }
    }
  }

  /** Throw away changes that could not be saved. */
  discardPending() {
    this.pending = []
    this.set({ status: 'synced', error: null })
    void this.refresh(false)
  }
}
