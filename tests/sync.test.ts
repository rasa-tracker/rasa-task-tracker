import { describe, expect, it, vi } from 'vitest'
import { ConflictError } from '../src/lib/github'
import type { Backend, BackendRead } from '../src/data/backend'
import { SyncEngine } from '../src/data/sync'
import { emptyDatabase, type Database } from '../src/data/types'

/** An in-memory "repository" that several engines (teammates) share. */
function sharedRepo(initial: Database | null) {
  let state: { db: Database; version: number } | null = initial ? { db: initial, version: 1 } : null
  const writes: string[] = []
  const backend = (): Backend => ({
    kind: 'demo',
    async read(): Promise<BackendRead> {
      if (!state) return { kind: 'missing' }
      return { kind: 'file', db: structuredClone(state.db), version: String(state.version), etag: null }
    },
    async write(db, version, message) {
      const current = state ? String(state.version) : null
      if (version !== current) throw new ConflictError('stale')
      state = { db: structuredClone(db), version: (state?.version ?? 0) + 1 }
      writes.push(message)
      return String(state.version)
    },
  })
  return { backend, get: () => state, writes }
}

// The engine touches window/document only in start(); refresh/commit work without them.
vi.stubGlobal('structuredClone', globalThis.structuredClone)

describe('SyncEngine', () => {
  it('creates the data file on first save', async () => {
    const repo = sharedRepo(null)
    const a = new SyncEngine(repo.backend())
    await a.refresh()
    expect(a.getSnapshot().exists).toBe(false)
    a.commit((d) => void (d.teamName = 'تیم'), 'setup')
    await a.flush()
    expect(repo.get()?.db.teamName).toBe('تیم')
    expect(a.getSnapshot().exists).toBe(true)
  })

  it('keeps both teammates’ changes when they save at the same time', async () => {
    const repo = sharedRepo(emptyDatabase())
    const alice = new SyncEngine(repo.backend())
    const bob = new SyncEngine(repo.backend())
    await alice.refresh()
    await bob.refresh()

    alice.commit((d) => void d.tasks.push({ id: 'a', title: 'A', status: 'todo', priority: 'medium', assigneeIds: [], checklist: [], createdAt: '', updatedAt: '' }), 'alice')
    await alice.flush()
    // Bob has not seen Alice's change yet; his save hits a conflict and is re-applied on top.
    bob.commit((d) => void d.tasks.push({ id: 'b', title: 'B', status: 'todo', priority: 'medium', assigneeIds: [], checklist: [], createdAt: '', updatedAt: '' }), 'bob')
    await bob.flush()

    expect(repo.get()?.db.tasks.map((t) => t.id).sort()).toEqual(['a', 'b'])
    expect(bob.getSnapshot().db.tasks).toHaveLength(2)
    expect(bob.getSnapshot().status).toBe('synced')
    expect(repo.writes).toEqual(['alice', 'bob'])
  })

  it('shows a change immediately, before it is saved', async () => {
    const repo = sharedRepo(emptyDatabase())
    const a = new SyncEngine(repo.backend())
    await a.refresh()
    a.commit((d) => void (d.teamName = 'X'), 'rename')
    expect(a.getSnapshot().db.teamName).toBe('X')
    expect(a.getSnapshot().pendingCount).toBe(1)
    await a.flush()
    expect(a.getSnapshot().pendingCount).toBe(0)
  })

  it('picks up a teammate’s change on refresh', async () => {
    const repo = sharedRepo(emptyDatabase())
    const a = new SyncEngine(repo.backend())
    const b = new SyncEngine(repo.backend())
    await a.refresh()
    await b.refresh()
    a.commit((d) => void (d.teamName = 'new name'), 'rename')
    await a.flush()
    await b.refresh()
    expect(b.getSnapshot().db.teamName).toBe('new name')
  })

  it('ignores a stale copy served right after a save', async () => {
    const repo = sharedRepo(emptyDatabase())
    const backend = repo.backend()
    const old = await backend.read(null)
    const a = new SyncEngine({ ...backend, read: async (etag) => (stale ? old : backend.read(etag)) })
    let stale = false
    await a.refresh()
    a.commit((d) => void (d.teamName = 'new'), 'rename')
    await a.flush()
    stale = true
    await a.refresh()
    expect(a.getSnapshot().db.teamName).toBe('new')
  })

  it('keeps unsaved changes and reports offline when the network fails', async () => {
    const repo = sharedRepo(emptyDatabase())
    const backend = repo.backend()
    const a = new SyncEngine({ ...backend, write: async () => Promise.reject(new TypeError('Failed to fetch')) })
    vi.useFakeTimers()
    await a.refresh()
    a.commit((d) => void (d.teamName = 'X'), 'rename')
    await a.flush()
    expect(a.getSnapshot().status).toBe('offline')
    expect(a.getSnapshot().pendingCount).toBe(1)
    expect(a.getSnapshot().db.teamName).toBe('X')
    vi.useRealTimers()
  })
})
