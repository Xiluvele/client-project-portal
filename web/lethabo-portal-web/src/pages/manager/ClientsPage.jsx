import { Link } from 'react-router-dom'
import { PageIntro } from '../../components/layout/AppShell'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatRand } from '../../lib/format'
import { invoiceTotal } from '../../state/metrics'
import { useAppState } from '../../state/useAppState'

export function ClientsPage() {
  const { clients, projects, invoices } = useAppState()
  return (
    <>
      <PageIntro title="Clients" subtitle="Each client only ever sees their own projects. This list is the team view." />
      <div className="client-grid">
        {clients.map((client) => {
          const owned = projects.filter((project) => project.clientId === client.id)
          const outstanding = invoices
            .filter((invoice) => invoice.clientId === client.id && invoice.status !== 'paid')
            .reduce((sum, invoice) => sum + invoiceTotal(invoice), 0)
          return (
            <Card key={client.id}>
              <h2>{client.name}</h2>
              <p className="quiet">{client.contact}<br />{client.email}</p>
              <p><strong>{formatRand(outstanding)}</strong> <span className="quiet">outstanding</span></p>
              {owned.length === 0 ? <p className="empty">No projects yet.</p> : owned.map((project) => (
                <p key={project.id}>
                  <Link to={`/team/projects/${project.id}`}><strong>{project.name}</strong></Link>{' '}
                  <StatusBadge status={project.status} />
                </p>
              ))}
            </Card>
          )
        })}
      </div>
    </>
  )
}
