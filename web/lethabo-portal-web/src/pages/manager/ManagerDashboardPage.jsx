import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { SearchField } from '../../components/ui/Fields'
import { StatCard, Card } from '../../components/ui/Card'
import { PageIntro } from '../../components/layout/AppShell'
import { CreateProjectModal } from '../../components/project/CreateProjectModal'
import { ProjectTable } from '../../components/project/ProjectWidgets'
import { Avatar } from '../../components/ui/Avatar'
import { DASHBOARD_STATUS_FILTERS } from '../../domain/catalog'
import { cx, firstName, formatRand, formatRelative, greetingFor } from '../../lib/format'
import { managerMetrics, projectHealth } from '../../state/metrics'
import { useProjectFilters } from '../../state/useProjectFilters'
import { useAppState } from '../../state/useAppState'

export function ManagerDashboardPage() {
  const { user, projects, invoices, activities, clients, members, changeRequests, deleteProject } = useAppState()
  const metrics = managerMetrics(projects, invoices, members)
  const { query, setQuery, status, setStatus, filtered } = useProjectFilters(projects, clients)
  const [creating, setCreating] = useState(false)
  const visible = filtered.slice(0, 4)
  const atRisk = projects.filter((project) => projectHealth(project, changeRequests) === 'at_risk').length

  return (
    <>
      <PageIntro
        title={`${greetingFor()}, ${firstName(user?.name)}`}
        subtitle="Here's what's happening across all client projects today."
        actions={(
          <>
            <SearchField value={query} onChange={setQuery} placeholder="Search projects, clients, invoices" />
            <Button onClick={() => setCreating(true)}><Icon name="plus" /> New Project</Button>
            <Avatar initials={user?.name?.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()} size="lg" />
          </>
        )}
      />
      <div className="stat-grid">
        <StatCard dark label="ACTIVE PROJECTS" value={metrics.activeCount} hint={`${metrics.dueThisWeek} due this week`} hintTone="yellow" />
        <StatCard label="PENDING INVOICES" value={formatRand(metrics.pendingAmount)} hint={`${metrics.awaitingCount} awaiting payment`} />
        <StatCard label="UNREAD CLIENT COMMENTS" value={metrics.unreadCount} hint="Needs response" />
        <StatCard label="TEAM UTILISATION" value={`${metrics.utilisation}%`} hint={`${atRisk} at risk`} hintTone={atRisk ? 'danger' : 'green'} />
      </div>
      <div className="filters" role="group" aria-label="Filter projects by status">
        {DASHBOARD_STATUS_FILTERS.map((item) => (
          <button key={item.id} type="button" className={cx('chip', status === item.id && 'is-active')} onClick={() => setStatus(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="dashboard-grid">
        <Card>
          <div className="section-head">
            <h2>Active Projects</h2>
            <span>{filtered.length} shown</span>
          </div>
          <ProjectTable projects={visible} clients={clients} members={members} to={(id) => `/team/projects/${id}`} onDelete={deleteProject} />
        </Card>
        <Card>
          <div className="section-head">
            <h2>Recent Client Activity</h2>
          </div>
          <div className="activity">
            {activities.slice(0, 6).map((item) => (
              <div className="activity__item" key={item.id}>
                <span className="activity__dot" />
                <div>
                  <p>{item.text}</p>
                  <small>{formatRelative(item.createdAt)}</small>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <CreateProjectModal open={creating} onClose={() => setCreating(false)} />
    </>
  )
}
