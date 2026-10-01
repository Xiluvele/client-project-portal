import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ManagerDashboardPage } from './pages/manager/ManagerDashboardPage'
import { ProjectsPage } from './pages/manager/ProjectsPage'
import { ProjectWorkspacePage } from './pages/manager/ProjectWorkspacePage'
import { InvoicesPage } from './pages/manager/InvoicesPage'
import { ClientsPage } from './pages/manager/ClientsPage'
import { TeamPage } from './pages/manager/TeamPage'
import { SettingsPage } from './pages/manager/SettingsPage'
import { ClientDashboardPage } from './pages/client/ClientDashboardPage'
import { ClientProjectsPage } from './pages/client/ClientProjectsPage'
import { ClientProjectPage } from './pages/client/ClientProjectPage'
import { ClientInvoicesPage } from './pages/client/ClientInvoicesPage'
import { useAppState } from './state/useAppState'

function RequireAuth({ role, children }) {
  const { user } = useAppState()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) {
    return <Navigate to={user.role === 'client' ? '/client/dashboard' : '/team/dashboard'} replace />
  }
  return children
}

function HomeRedirect() {
  const { user } = useAppState()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'client' ? '/client/dashboard' : '/team/dashboard'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
      <Route path="/team" element={<RequireAuth role="manager"><AppShell audience="team" /></RequireAuth>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ManagerDashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:projectId" element={<ProjectWorkspacePage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="members" element={<TeamPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="/client" element={<RequireAuth role="client"><AppShell audience="client" /></RequireAuth>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ClientDashboardPage />} />
        <Route path="projects" element={<ClientProjectsPage />} />
        <Route path="projects/:projectId" element={<ClientProjectPage />} />
        <Route path="invoices" element={<ClientInvoicesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function GuestOnly({ children }) {
  const { user } = useAppState()
  if (!user) return children
  return <Navigate to={user.role === 'client' ? '/client/dashboard' : '/team/dashboard'} replace />
}
