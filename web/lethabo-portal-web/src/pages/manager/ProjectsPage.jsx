import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { CreateProjectModal } from '../../components/project/CreateProjectModal'
import { ProjectDirectory } from '../../components/project/ProjectDirectory'
import { useAppState } from '../../state/useAppState'
import { firstName, greetingFor } from '../../lib/format'

export function ProjectsPage() {
  const { user, projects, clients, members, deleteProject } = useAppState()
  const [creating, setCreating] = useState(false)

  return (
    <>
      <ProjectDirectory
        projects={projects}
        clients={clients}
        members={members}
        title={`${greetingFor()}, ${firstName(user?.name)}`}
        subtitle="Here's what's happening across all client projects today."
        to={(id) => `/team/projects/${id}`}
        onDelete={deleteProject}
        searchPlaceholder="Search projects, clients, invoices"
        actions={<Button onClick={() => setCreating(true)}><Icon name="plus" /> New Project</Button>}
      />
      <CreateProjectModal open={creating} onClose={() => setCreating(false)} />
    </>
  )
}
