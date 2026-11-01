import { useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DialogProvider } from './components/dialogs'
import { ToastProvider } from './components/toast'
import { OrgProvider } from './data/org'
import { Layout } from './components/Layout'
import { clearSession, loadSession, saveSession, type Session } from './data/session'
import { StoreProvider, useStore } from './data/store'
import { CalendarPage } from './pages/CalendarPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { ClaimScreen, Loading, SetupScreen } from './pages/Onboarding'
import { PeoplePage } from './pages/PeoplePage'
import { PersonPage } from './pages/PersonPage'
import { ProjectPage } from './pages/ProjectPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { SettingsPage } from './pages/SettingsPage'
import { TasksPage } from './pages/TasksPage'

const SKIP_KEY = 'rasa.claim.skipped'

function Gate({ onLogout }: { onLogout: () => void }) {
  const { ready, exists, me, session, pendingCount } = useStore()
  const [skipped, setSkipped] = useState(() => sessionStorage.getItem(SKIP_KEY) === session.login)
  if (!ready) return <Loading />
  if (!exists && !pendingCount) return <SetupScreen />
  if (!me && !skipped && session.kind === 'github') {
    return (
      <ClaimScreen
        onSkip={() => {
          sessionStorage.setItem(SKIP_KEY, session.login)
          setSkipped(true)
        }}
      />
    )
  }
  return (
    <ToastProvider>
    <OrgProvider>
    <DialogProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/people" element={<PeoplePage />} />
          <Route path="/people/:id" element={<PersonPage />} />
          <Route path="/settings" element={<SettingsPage onLogout={onLogout} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </DialogProvider>
    </OrgProvider>
    </ToastProvider>
  )
}

export function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession())
  if (!session) {
    return (
      <LoginPage
        onLogin={(s) => {
          saveSession(s)
          setSession(s)
        }}
      />
    )
  }
  return (
    <HashRouter>
      <StoreProvider key={session.kind + session.login} session={session}>
        <Gate
          onLogout={() => {
            clearSession()
            setSession(null)
            window.location.hash = '#/'
          }}
        />
      </StoreProvider>
    </HashRouter>
  )
}
