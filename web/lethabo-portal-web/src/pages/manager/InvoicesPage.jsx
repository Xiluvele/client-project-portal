import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageIntro } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Card, StatCard } from '../../components/ui/Card'
import { SelectField, TextField } from '../../components/ui/Fields'
import { Icon } from '../../components/ui/Icon'
import { Modal } from '../../components/ui/Modal'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { createId, formatRand } from '../../lib/format'
import { addDaysISO, dateLabel, effectiveStatus, todayISO } from '../../lib/invoiceDates'
import { clientById, invoiceMetrics, invoiceTotal, projectById } from '../../state/metrics'
import { useAppState } from '../../state/useAppState'

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

const ViewIcon = () => (
  <svg {...iconProps}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const SendIcon = () => (
  <svg {...iconProps}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
)

const BellIcon = () => (
  <svg {...iconProps}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
  </svg>
)

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

const freshForm = (preset, clients) => ({
  clientId: preset?.clientId || clients[0]?.id || '',
  projectId: preset?.id || '',
  issuedAt: todayISO(),
  dueAt: addDaysISO(todayISO(), 14),
  amount: '',
})

export function InvoicesPage() {
  const {
    invoices, clients, projects,
    generateInvoice, updateInvoice, sendInvoice, deleteInvoice, remindInvoice, cancelInvoice,
  } = useAppState()
  const [params] = useSearchParams()
  const preset = projects.find((project) => project.id === params.get('project'))
  const metrics = invoiceMetrics(invoices)

  const [open, setOpen] = useState(Boolean(preset))
  const [form, setForm] = useState(() => freshForm(preset, clients))
  const [editingId, setEditingId] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [confirming, setConfirming] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const clientProjects = projects.filter((project) => project.clientId === form.clientId)
  const drafts = invoices.filter((invoice) => effectiveStatus(invoice) === 'draft')
  const viewed = viewing ? invoices.find((invoice) => invoice.id === viewing) : null
  const viewedState = viewed ? effectiveStatus(viewed) : ''

  const setField = (patch) => setForm((current) => ({ ...current, ...patch }))

  const openGenerate = () => {
    setForm(freshForm(null, clients))
    setEditingId(null)
    setError('')
    setOpen(true)
  }

  const openEdit = (invoice) => {
    setForm({
      clientId: invoice.clientId,
      projectId: invoice.projectId,
      issuedAt: invoice.issuedAt || todayISO(),
      dueAt: invoice.dueAt || addDaysISO(todayISO(), 14),
      amount: String(invoice.items.reduce((sum, item) => sum + (Number(item.qty) || 1) * (Number(item.amount) || 0), 0) || ''),
    })
    setEditingId(invoice.id)
    setError('')
    setViewing(null)
    setConfirming('')
    setOpen(true)
  }

  const closeView = () => {
    setViewing(null)
    setConfirming('')
  }

  const submit = async () => {
    const project = projects.find((item) => item.id === form.projectId)
    const amount = Number(form.amount)
    if (!form.clientId || !form.projectId || !(amount > 0)) {
      setError('Choose a client, one of that client’s projects, and an amount.')
      return
    }
    if (!form.issuedAt || !form.dueAt || form.dueAt < form.issuedAt) {
      setError("The due date can't be before the invoice date.")
      return
    }
    const payload = {
      clientId: form.clientId,
      projectId: form.projectId,
      issuedAt: form.issuedAt,
      dueAt: form.dueAt,
      items: [{ id: createId('line'), description: project?.name || 'Project invoice', qty: 1, amount }],
    }
    if (editingId) {
      const result = await updateInvoice(editingId, { ...payload, title: project?.name || 'Project invoice' }, true)
      if (!result.ok) {
        setError(result.message)
        return
      }
      setNotice(`#${result.invoice.number} was sent to the client.`)
    } else {
      const invoice = await generateInvoice({ ...payload, send: true })
      if (!invoice?.number) {
        setError(invoice?.message || 'The invoice could not be saved.')
        return
      }
      setNotice(`#${invoice.number} was generated and sent to the client.`)
    }
    setOpen(false)
    setEditingId(null)
  }

  const handleSend = async (invoice) => {
    const result = await sendInvoice(invoice.id)
    setNotice(result.ok ? `#${invoice.number} was sent to the client.` : result.message)
    if (result.ok) closeView()
  }

  const handleRemind = async (invoice) => {
    const result = await remindInvoice(invoice.id)
    setNotice(result.message)
  }

  const handleCancel = async (invoice) => {
    const result = await cancelInvoice(invoice.id)
    setNotice(result.ok ? `#${invoice.number} was cancelled.` : result.message)
    if (result.ok) closeView()
  }

  const handleDelete = async (invoice) => {
    const result = await deleteInvoice(invoice.id)
    setNotice(result.ok ? `Draft #${invoice.number} was deleted.` : result.message)
    if (result.ok) closeView()
  }

  return (
    <>
      <PageIntro
        title="Invoices"
        subtitle="Generate invoices for your projects and track them until they are paid."
        actions={<Button onClick={openGenerate}><Icon name="plus" /> Generate Invoice</Button>}
      />

      <div className="stat-grid">
        <StatCard label="TOTAL OUTSTANDING" value={formatRand(metrics.outstanding)} hint={`${plural(metrics.outstandingCount, 'invoice')} sent`} />
        <StatCard label="PAID THIS MONTH" value={formatRand(metrics.paidThisMonth)} hint={plural(metrics.paidThisMonthCount, 'invoice')} hintTone="green" />
        <StatCard label="OVERDUE" value={formatRand(metrics.overdue)} hint={metrics.overdueCount ? 'Needs a reminder' : 'None overdue'} hintTone={metrics.overdueCount ? 'danger' : 'green'} />
        <StatCard dark label="DRAFTS" value={formatRand(metrics.drafts)} hint={`${metrics.draftCount} not sent yet`} />
      </div>

      {drafts.length ? (
        <div className="draft-grid">
          {drafts.map((invoice) => {
            const client = clientById(clients, invoice.clientId)
            const project = projectById(projects, invoice.projectId)
            return (
              <button key={invoice.id} type="button" className="draft-card" onClick={() => setViewing(invoice.id)}>
                <span>Draft</span>
                <strong>#{invoice.number}</strong>
                <small>{client?.name} · {project?.name}</small>
                <b>{formatRand(invoiceTotal(invoice))}</b>
              </button>
            )
          })}
        </div>
      ) : null}

      <Card className="card__pad">
        {notice ? <p className="notice" role="status">{notice}</p> : null}
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client / Project</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Invoice date</th>
                <th>Due date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const state = effectiveStatus(invoice)
                const client = clientById(clients, invoice.clientId)
                const project = projectById(projects, invoice.projectId)
                return (
                  <tr key={invoice.id}>
                    <td>
                      <div className="cell-title">#{invoice.number}</div>
                      {state === 'draft' ? <div className="cell-sub">Not sent yet</div> : null}
                    </td>
                    <td>
                      <div className="cell-title">{client?.name}</div>
                      <div className="cell-sub">{project?.name} — {invoice.title}</div>
                    </td>
                    <td>{formatRand(invoiceTotal(invoice))}</td>
                    <td>
                      <StatusBadge status={state} group="invoice" />
                      {state === 'paid' && invoice.paidAt ? <div className="cell-sub">Marked paid {dateLabel(invoice.paidAt)}</div> : null}
                    </td>
                    <td>{invoice.issuedLabel}</td>
                    <td>{invoice.dueLabel}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-btn"
                          type="button"
                          title="View invoice"
                          aria-label={`View invoice ${invoice.number}`}
                          onClick={() => setViewing(invoice.id)}
                        >
                          <ViewIcon />
                        </button>
                        {state === 'draft' ? (
                          <button
                            className="icon-btn"
                            type="button"
                            title="Send to client"
                            aria-label={`Send invoice ${invoice.number} to client`}
                            onClick={() => handleSend(invoice)}
                          >
                            <SendIcon />
                          </button>
                        ) : null}
                        {state === 'sent' || state === 'overdue' ? (
                          <button
                            className="icon-btn"
                            type="button"
                            title={invoice.reminded ? 'Send another reminder' : 'Send reminder'}
                            aria-label={`Send reminder for invoice ${invoice.number}`}
                            onClick={() => handleRemind(invoice)}
                          >
                            <BellIcon />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {invoices.length === 0 ? <p className="empty">No invoices yet. Use Generate Invoice to create one.</p> : null}
        </div>
      </Card>

      <Modal title={viewed ? `Invoice #${viewed.number}` : 'Invoice'} open={Boolean(viewed)} onClose={closeView}>
        {viewed ? (
          <div className="stack">
            <dl className="detail-list">
              <div><dt>Client</dt><dd>{clientById(clients, viewed.clientId)?.name}</dd></div>
              <div><dt>Project</dt><dd>{projectById(projects, viewed.projectId)?.name}</dd></div>
              <div><dt>Invoice date</dt><dd>{viewed.issuedLabel}</dd></div>
              <div><dt>Due date</dt><dd>{viewed.dueLabel}</dd></div>
              <div><dt>Status</dt><dd><StatusBadge status={viewedState} group="invoice" /></dd></div>
              <div><dt>Amount</dt><dd>{formatRand(invoiceTotal(viewed))}</dd></div>
            </dl>

            {confirming ? (
              <>
                <p className="notice">
                  {confirming === 'cancel'
                    ? 'Cancel this invoice? The client will be told it was cancelled.'
                    : 'Delete this draft? This cannot be undone.'}
                </p>
                <div className="task__actions">
                  <Button variant="secondary" onClick={() => setConfirming('')}>Keep invoice</Button>
                  <Button onClick={() => (confirming === 'cancel' ? handleCancel(viewed) : handleDelete(viewed))}>
                    {confirming === 'cancel' ? 'Yes, cancel it' : 'Yes, delete it'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="task__actions">
                {viewedState === 'draft' ? (
                  <>
                    <Button onClick={() => handleSend(viewed)}>Send to client</Button>
                    <Button variant="secondary" onClick={() => openEdit(viewed)}>Edit</Button>
                    <Button variant="ghost" onClick={() => setConfirming('delete')}>Delete draft</Button>
                  </>
                ) : null}
                {viewedState === 'sent' || viewedState === 'overdue' ? (
                  <>
                    <Button variant="secondary" onClick={() => handleRemind(viewed)}>Send reminder</Button>
                    <Button variant="ghost" onClick={() => setConfirming('cancel')}>Cancel invoice</Button>
                  </>
                ) : null}
                {viewedState === 'paid' ? <p className="quiet">Paid invoices are locked.</p> : null}
                {viewedState === 'cancelled' ? <p className="quiet">This invoice was cancelled.</p> : null}
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal title={editingId ? 'Edit draft invoice' : 'Generate Invoice'} open={open} onClose={() => setOpen(false)}>
        <form className="stack" onSubmit={(event) => event.preventDefault()}>
          <span className="quiet">It appears on the client's project view and on the admin's invoice list once sent.</span>
          {error ? <div className="form-error">{error}</div> : null}
          <SelectField label="Client" value={form.clientId} onChange={(event) => setField({ clientId: event.target.value, projectId: '' })}>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </SelectField>
          <SelectField label="Project" value={form.projectId} onChange={(event) => setField({ projectId: event.target.value })} required>
            <option value="">{clientProjects.length ? 'Select a project' : 'This client has no projects'}</option>
            {clientProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </SelectField>
          <div className="field-row">
            <TextField
              label="Invoice date"
              type="date"
              value={form.issuedAt}
              onChange={(event) => {
                const issuedAt = event.target.value
                setField({ issuedAt, ...(issuedAt && form.dueAt < issuedAt ? { dueAt: addDaysISO(issuedAt, 14) } : {}) })
              }}
              required
            />
            <TextField label="Due date" type="date" value={form.dueAt} onChange={(event) => setField({ dueAt: event.target.value })} required />
          </div>
          <TextField label="Amount (R)" type="number" min="0" value={form.amount} onChange={(event) => setField({ amount: event.target.value })} placeholder="0" required />
          <div className="task__actions">
            <Button type="button" onClick={() => submit()}>{editingId ? 'Send to Client' : 'Generate & Send to Client'}</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}