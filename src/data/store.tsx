import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import type { Session } from './session'
import { demoBackend, githubBackend } from './backend'
import { SyncEngine, type Mutation, type SyncSnapshot } from './sync'
import type { Member } from './types'

interface StoreValue extends SyncSnapshot {
  session: Session
  engine: SyncEngine
  me: Member | null
  commit: (mutate: Mutation, message: string) => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ session, children }: { session: Session; children: ReactNode }) {
  const engine = useMemo(() => {
    const backend =
      session.kind === 'github'
        ? githubBackend(session.token, { owner: session.owner, repo: session.repo, path: session.path })
        : demoBackend()
    return new SyncEngine(backend)
  }, [session])

  useEffect(() => {
    engine.start()
    return () => engine.stop()
  }, [engine])

  const snap = useSyncExternalStore(engine.subscribe, engine.getSnapshot)

  const me = useMemo(
    () => snap.db.members.find((m) => m.githubLogin?.toLowerCase() === session.login.toLowerCase()) ?? null,
    [snap.db.members, session.login],
  )

  const value = useMemo<StoreValue>(
    () => ({
      ...snap,
      session,
      engine,
      me,
      commit: (mutate, message) => engine.commit(mutate, `${message} (${session.login})`),
    }),
    [snap, session, engine, me],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const v = useContext(StoreContext)
  if (!v) throw new Error('useStore outside StoreProvider')
  return v
}

/** Re-render every minute so relative labels ("۲ دقیقه پیش") stay fresh. */
export function useTick(ms = 60_000) {
  const [, set] = useState(0)
  useEffect(() => {
    const t = setInterval(() => set((n) => n + 1), ms)
    return () => clearInterval(t)
  }, [ms])
}
