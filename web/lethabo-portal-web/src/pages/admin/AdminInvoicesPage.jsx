import { PageIntro } from '../../components/layout/AppShell'
import { Card } from '../../components/ui/Card'
import { effectiveStatus, invoiceTotal } from '../../lib/invoiceDates'
import { useAppState } from '../../state/useAppState'

const money = (value) => `R ${new Intl.NumberFormat('en-ZA').format(value)}`
const sum = (list) => list.reduce((total, inv) => total + invoiceTotal(inv), 0)

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
)

const STATUS = {
  sent: { label: 'Sent', icon: null },
  overdue: { label: 'Overdue', icon: <ClockIcon /> },
  paid: { label: 'Paid', icon: <CheckIcon /> },
  cancelled: { label: 'Cancelled', icon: null },
}

function InvoiceBadge({ status }) {
  const { label, icon } = STATUS[status] ?? { label: status, icon: null }
  return (
    <span className={`invoice-badge invoice-badge--${status}`}>
      {icon}
      {label}
    </span>
  )
}

export function AdminInvoicesPage() {
  const { invoices, clients, projects, users, markInvoicePaid } = useAppState()

  const rows = invoices
    .map((inv) => ({ ...inv, state: effectiveStatus(inv) }))
    .filter((inv) => inv.state !== 'draft')

  const outstanding = sum(rows.filter((r) => r.state === 'sent' || r.state === 'overdue'))
  const overdue = sum(rows.filter((r) => r.state === 'overdue'))
  const paid = sum(rows.filter((r) => r.state === 'paid'))

  return (
    <>
      <PageIntro
        title="Invoices"
        subtitle="Every invoice sent by a project manager. Mark them as paid here and the manager sees it straight away."
      />

      <div className="invoice-totals">
        <div className="invoice-total"><strong>{money(outstanding)}</strong><span>Outstanding</span></div>
        <div className="invoice-total"><strong>{money(overdue)}</strong><span>Overdue</span></div>
        <div className="invoice-total"><strong>{money(paid)}</strong><span>Paid</span></div>
      </div>

      <Card>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client / Project</th>
                <th>Amount</th>
                <th>Invoice date</th>
                <th>Due date</th>
                <th>Payment</th>
                <th>Sent by</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((inv) => {
                const client = clients.find((c) => c.id === inv.clientId)
                const project = projects.find((p) => p.id === inv.projectId)
                const sender = users.find((u) => u.id === inv.sentBy)
                return (
                  <tr key={inv.id}>
                    <td>
                      <div className="cell-title">#{inv.number}</div>
                      <div className="cell-sub">{inv.title}</div>
                    </td>
                    <td>
                      <div className="cell-title">{client?.name}</div>
                      <div className="cell-sub">{project?.name}</div>
                    </td>
                    <td><strong>{money(invoiceTotal(inv))}</strong></td>
                    <td>{inv.issuedLabel}</td>
                    <td>{inv.dueLabel}</td>
                    <td><InvoiceBadge status={inv.state} /></td>
                    <td>{sender?.name ?? '—'}</td>
                    <td className="invoice-action">
                      {(inv.state === 'sent' || inv.state === 'overdue') && (
                        <button type="button" className="btn-mark-paid" onClick={() => markInvoicePaid(inv.id)}>
                          Mark paid
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 ? <p className="empty">No invoices have been sent yet.</p> : null}
      </Card>
    </>
  )
}