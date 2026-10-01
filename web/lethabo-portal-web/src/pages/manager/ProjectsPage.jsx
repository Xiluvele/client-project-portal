import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { Card } from '../../components/ui/Card'
import { PageIntro } from '../../components/layout/AppShell'
import { CreateProjectModal } from '../../components/project/CreateProjectModal'
import { ProjectTable } from '../../components/project/ProjectWidgets'
import { useAppState } from '../../state/useAppState'
import { useProjectFilters } from '../../state/useProjectFilters'
import { cx } from '../../lib/format'

export function ProjectsPage() {
  const { projects, clients, members, deleteProject } = useAppState()
  const { status, setStatus, filtered, statuses } = useProjectFilters(projects, clients)
  const [creating, setCreating] = useState(false)

  return (
    <>
      <PageIntro
        title="Projects"
        subtitle="Every active engagement, with status and the people assigned to it."
        actions={<Button onClick={() => setCreating(true)}><Icon name="plus" /> New Project</Button>}
      />
      <div className="filters">
        <button type="button" className={cx('chip', status === 'all' && 'is-active')} onClick={() => setStatus('all')}>All</button>
        {statuses.map((item) => (
          <button key={item.id} type="button" className={cx('chip', status === item.id && 'is-active')} onClick={() => setStatus(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <Card>
        <ProjectTable projects={filtered} clients={clients} members={members} to={(id) => `/team/projects/${id}`} onDelete={deleteProject} />
      </Card>
      <CreateProjectModal open={creating} onClose={() => setCreating(false)} />
    </>
  )
}
