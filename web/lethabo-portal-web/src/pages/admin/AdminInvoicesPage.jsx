import { useState } from 'react'
import { PageIntro } from '../../components/layout/AppShell'
import { Card } from '../../components/ui/Card'

const money = (value) => `R ${new Intl.NumberFormat('en-ZA').format(value)}`
const sum = (list) => list.reduce((total, inv) => total + inv.amount, 0)

const SEED_INVOICES = [
  { id: 'INV-0041', label: 'Deposit', project: 'Mokoena Hardware online store', amount: 45000, due: '5 Aug', status: 'paid' },
  { id: 'INV-0047', label: 'Design approved milestone', project: 'Mokoena Hardware online store', amount: 38500, due: '15 Oct', status: 'sent' },
  { id: 'INV-0049', label: 'Deposit', project: 'Ubuntu Learning Hub results portal', amount: 30000, due: '25 Sept', status: 'overdue' },
  { id: 'INV-0044', label: 'Deposit', project: 'Karoo Freight tracking dashboard', amount: 62000, due: '1 Jul', status: 'paid' },
  { id: 'INV-0050', label: 'Final payment', project: 'Karoo Freight tracking dashboard', amount: 26000, due: '30 Oct', status: 'sent' },
  { id: 'INV-0052', label: 'Deposit', project: 'Bophelo Clinic booking website', amount: 18000, due: '14 Oct', status: 'draft' },
]

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
  paid: { label: 'Paid', icon: <CheckIcon /> },
  sent: { label: 'Sent', icon: null },
  overdue: { label: 'Overdue', icon: <ClockIcon /> },
  draft: { label: 'Draft', icon: null },
}

function InvoiceBadge({ status }) {
  const { label, icon } = STATUS[status]
  return (
    <span className={`invoice-badge invoice-badge--${status}`}>
      {icon}
      {label}
    </span>
  )
}

export function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState(SEED_INVOICES)

  const setStatus = (id, status) =>
    setInvoices((list) => list.map((inv) => (inv.id === id ? { ...inv, status } : inv)))

  const outstanding = sum(invoices.filter((inv) => inv.status === 'sent' || inv.status === 'overdue'))
  const overdue = sum(invoices.filter((inv) => inv.status === 'overdue'))
  const paid = sum(invoices.filter((inv) => inv.status === 'paid'))

  return (
    <>
      <PageIntro
        title="Invoices"
        subtitle="Invoices appear in the client's Android app once they are sent."
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
                <th>Project</th>
                <th>Amount</th>
                <th>Due</th>
                <th>Payment</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <div className="cell-title">{inv.id}</div>
                    <div className="cell-sub">{inv.label}</div>
                  </td>
                  <td>{inv.project}</td>
                  <td><strong>{money(inv.amount)}</strong></td>
                  <td>{inv.due}</td>
                  <td><InvoiceBadge status={inv.status} /></td>
                  <td className="invoice-action">
                    {(inv.status === 'sent' || inv.status === 'overdue') && (
                      <button type="button" className="btn-mark-paid" onClick={() => setStatus(inv.id, 'paid')}>
                        Mark paid
                      </button>
                    )}
                    {inv.status === 'draft' && (
                      <button type="button" className="btn-send" onClick={() => setStatus(inv.id, 'sent')}>
                        Send to client
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}