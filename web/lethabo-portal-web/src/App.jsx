import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './pages/LoginPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ActivatePage } from './pages/ActivatePage'
import { ManagerDashboardPage } from './pages/manager/ManagerDashboardPage'
import { ProjectsPage } from './pages/manager/ProjectsPage'
import { ProjectWorkspacePage } from './pages/manager/ProjectWorkspacePage'
import { InvoicesPage } from './pages/manager/InvoicesPage'
import { ClientsPage } from './pages/manager/ClientsPage'
import { TeamPage } from './pages/manager/TeamPage'
import { ClientDashboardPage } from './pages/client/ClientDashboardPage'
import { ClientProjectsPage } from './pages/client/ClientProjectsPage'
import { ClientProjectPage } from './pages/client/ClientProjectPage'
import { ClientInvoicesPage } from './pages/client/ClientInvoicesPage'
import { homeFor } from './lib/roles'
import { useAppState } from './state/useAppState'
import { UsersPage } from './pages/admin/UsersPage'
import { AuditTrailPage } from './pages/admin/AuditTrailPage'
import { DeveloperTasksPage } from './pages/developer/DeveloperTasksPage'
import { DeveloperProjectPage } from './pages/developer/DeveloperProjectPage'
import { NotificationsPage } from './pages/shared/NotificationsPage'

function RequireAuth({ role, children }) {
  const { user } = useAppState()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />
  return children
}

function HomeRedirect() {
  const { user } = useAppState()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={homeFor(user.role)} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/register" element={<Navigate to="/forgot-password" replace />} />
      <Route path="/activate" element={<ActivatePage />} />
      <Route path="/team" element={<RequireAuth role="manager"><AppShell audience="team" /></RequireAuth>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ManagerDashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:projectId" element={<ProjectWorkspacePage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="members" element={<TeamPage />} />
        <Route path="settings" element={<Navigate to="/team/dashboard" replace />} />
      </Route>
      <Route path="/client" element={<RequireAuth role="client"><AppShell audience="client" /></RequireAuth>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ClientDashboardPage />} />
        <Route path="projects" element={<ClientProjectsPage />} />
        <Route path="projects/:projectId" element={<ClientProjectPage />} />
        <Route path="invoices" element={<ClientInvoicesPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>
      <Route path="/developer" element={<RequireAuth role="developer"><AppShell audience="developer" /></RequireAuth>}>
        <Route index element={<Navigate to="tasks" replace />} />
        <Route path="tasks" element={<DeveloperTasksPage />} />
        <Route path="projects/:projectId" element={<DeveloperProjectPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>
      <Route path="/admin" element={<RequireAuth role="administrator"><AppShell audience="administrator" /></RequireAuth>}>
        <Route index element={<Navigate to="users" replace />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="audit" element={<AuditTrailPage />} />
        {/* Old links to the removed pages land on Team & Access */}
        <Route path="dashboard" element={<Navigate to="/admin/users" replace />} />
        <Route path="invoices" element={<Navigate to="/admin/users" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function GuestOnly({ children }) {
  const { user } = useAppState()
  if (!user) return children
  return <Navigate to={homeFor(user.role)} replace />
}