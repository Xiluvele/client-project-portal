import { ProjectDirectory } from '../../components/project/ProjectDirectory'
import { firstName, greetingFor } from '../../lib/format'
import { projectsForMember } from '../../state/metrics'
import { useAppState } from '../../state/useAppState'

export function DeveloperProjectsPage() {
  const { user, clients, members, projects } = useAppState()
  const mine = projectsForMember(projects, user?.memberId)

  return (
    <ProjectDirectory
      projects={mine}
      clients={clients}
      members={members}
      title={`${greetingFor()}, ${firstName(user?.name)}`}
      subtitle="Projects assigned to you."
      to={(id) => `/developer/projects/${id}`}
      emptyLabel="No projects are assigned to you yet."
    />
  )
}
