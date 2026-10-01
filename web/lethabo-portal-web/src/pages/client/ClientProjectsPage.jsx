import { PageIntro } from '../../components/layout/AppShell'
import { Card } from '../../components/ui/Card'
import { ClientProjectCard } from '../../components/project/ClientProjectCard'
import { projectsForClient } from '../../state/metrics'
import { useAppState } from '../../state/useAppState'

export function ClientProjectsPage() {
  const { user, projects } = useAppState()
  const mine = projectsForClient(projects, user?.clientId)
  return (
    <>
      <PageIntro title="Your projects" subtitle="Status and milestone for each engagement Lethabo M is running for you." />
      <div className="project-list">
        {mine.length === 0 ? <Card><p className="empty">Nothing assigned yet.</p></Card> : null}
        {mine.map((project) => <ClientProjectCard key={project.id} project={project} />)}
      </div>
    </>
  )
}
