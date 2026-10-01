import { PageIntro } from '../../components/layout/AppShell'
import { Card, StatCard } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { ClientProjectCard } from '../../components/project/ClientProjectCard'
import { firstName, formatRand, formatRelative, greetingFor } from '../../lib/format'
import { clientMetrics, invoiceTotal, projectsForClient, invoicesForClient } from '../../state/metrics'
import { useAppState } from '../../state/useAppState'

export function ClientDashboardPage() {
  const { user, clients, projects, invoices, activities } = useAppState()
  const client = clients.find((item) => item.id === user?.clientId)
  const mine = projectsForClient(projects, user?.clientId)
  const bills = invoicesForClient(invoices, user?.clientId)
  const metrics = clientMetrics(mine, bills)
  const projectIds = new Set(mine.map((project) => project.id))
  const feed = activities.filter((item) => projectIds.has(item.projectId))

  return (
    <>
      <PageIntro
        title={`${greetingFor()}, ${firstName(user?.name)}`}
        subtitle={client ? `${client.name} · progress, approvals, and invoices in one place.` : 'Your projects, progress, and invoices.'}
      />
      <div className="stat-grid">
        <StatCard dark label="YOUR PROJECTS" value={mine.length} hint="Only your work is visible" hintTone="yellow" />
        <StatCard label="AVERAGE PROGRESS" value={`${metrics.averageProgress}%`} hint="Across your projects" />
        <StatCard label="OUTSTANDING" value={formatRand(metrics.outstanding)} hint={`${metrics.openInvoiceCount} open invoice${metrics.openInvoiceCount === 1 ? '' : 's'}`} />
        <StatCard label="TO APPROVE" value={metrics.pendingApprovals} hint="Files waiting for sign-off" />
      </div>
      <div className="dashboard-grid">
        <div className="project-list">
          {mine.length === 0 ? <Card><p className="empty">No projects have been opened for your company yet. They will appear here once the Lethabo M team creates one.</p></Card> : null}
          {mine.map((project) => <ClientProjectCard key={project.id} project={project} />)}
        </div>
        <div className="stack">
          <Card>
            <div className="section-head"><h2>Invoices</h2></div>
            {bills.length === 0 ? <p className="empty">No invoices yet.</p> : bills.slice(0, 4).map((invoice) => (
              <div className="file-row" key={invoice.id}>
                <div className="file-copy">
                  <strong>#{invoice.number}</strong>
                  <small>Due {invoice.dueLabel} · {formatRand(invoiceTotal(invoice))}</small>
                </div>
                <StatusBadge status={invoice.status} group="invoice" />
              </div>
            ))}
          </Card>
          <Card>
            <div className="section-head"><h2>Updates</h2></div>
            <div className="activity">
              {feed.length === 0 ? <p className="empty">No updates yet.</p> : feed.slice(0, 5).map((item) => (
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
      </div>
    </>
  )
}
