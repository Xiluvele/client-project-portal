import { Link, useParams } from 'react-router-dom'
import { PageIntro } from '../../components/layout/AppShell'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { ProjectBrief } from '../../components/project/ProjectBrief'
import { projectsForSignedInClient } from '../../state/metrics'
import { useAppState } from '../../state/useAppState'

export function ClientProjectPage() {
  const { projectId } = useParams()
  const { user, projects, clients } = useAppState()
  const project = projectsForSignedInClient(projects, user, clients).find((item) => item.id === projectId)

  if (!project) {
    return <PageIntro title="Project not available" subtitle="This project is not on your account." actions={<Link to="/client/dashboard">Back to dashboard</Link>} />
  }

  return (
    <>
      <PageIntro
        eyebrow={<Link to="/client/dashboard">Dashboard</Link>}
        title={project.name}
        subtitle={project.service}
        meta={<><StatusBadge status={project.status} /><span>Due {project.dueLabel}</span></>}
      />
      <ProjectBrief project={project} audience="client" />
    </>
  )
}
