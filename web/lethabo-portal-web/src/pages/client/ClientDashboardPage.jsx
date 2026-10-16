import { ProjectDirectory } from '../../components/project/ProjectDirectory'
import { firstName, greetingFor } from '../../lib/format'
import { projectsForSignedInClient } from '../../state/metrics'
import { useAppState } from '../../state/useAppState'

export function ClientDashboardPage() {
  const { user, clients, members, projects } = useAppState()
  const client = clients.find((item) => item.id === user?.clientId) ?? clients.find((item) => item.email?.toLowerCase() === user?.email?.toLowerCase())
  const mine = projectsForSignedInClient(projects, user)

  return (
    <ProjectDirectory
      projects={mine}
      clients={clients}
      members={members}
      title={`${greetingFor()}, ${firstName(user?.name)}`}
      subtitle={client ? `${client.name} · your projects and where each one stands.` : 'Your projects and where each one stands.'}
      to={(id) => `/client/projects/${id}`}
      emptyLabel="No projects have been opened for your company yet. They will appear here once the Lethabo M team creates one."
    />
  )
}
