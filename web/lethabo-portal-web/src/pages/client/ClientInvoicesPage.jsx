import { PageIntro } from '../../components/layout/AppShell'
import { Card, StatCard } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatRand } from '../../lib/format'
import { invoiceMetrics, invoiceTotal, invoicesForClient, projectById } from '../../state/metrics'
import { useAppState } from '../../state/useAppState'

export function ClientInvoicesPage() {
  const { user, invoices, projects } = useAppState()
  const bills = invoicesForClient(invoices, user?.clientId)
  const metrics = invoiceMetrics(bills)
  return (
    <>
      <PageIntro title="Invoices" subtitle="Payment status for your projects. In-app payment is planned for a later phase." />
      <div className="stat-grid stat-grid--three">
        <StatCard label="OUTSTANDING" value={formatRand(metrics.outstanding)} />
        <StatCard label="PAID" value={formatRand(metrics.paid)} />
        <StatCard dark label="OVERDUE" value={formatRand(metrics.overdue)} hint={metrics.overdue ? 'Please arrange payment' : 'Nothing overdue'} hintTone="yellow" />
      </div>
      <Card>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Project</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((invoice) => (
                <tr key={invoice.id}>
                  <td><div className="cell-title">#{invoice.number}</div><div className="cell-sub">Issued {invoice.issuedLabel}</div></td>
                  <td>{projectById(projects, invoice.projectId)?.name} — {invoice.title}</td>
                  <td>{formatRand(invoiceTotal(invoice))}</td>
                  <td><StatusBadge status={invoice.status} group="invoice" /></td>
                  <td>{invoice.dueLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {bills.length === 0 ? <p className="empty">No invoices on your account.</p> : null}
        </div>
      </Card>
    </>
  )
}
