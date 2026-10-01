import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageIntro } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Card, StatCard } from '../../components/ui/Card'
import { SelectField, TextField } from '../../components/ui/Fields'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { createId, formatRand } from '../../lib/format'
import { clientById, invoiceMetrics, invoiceTotal, projectById } from '../../state/metrics'
import { useAppState } from '../../state/useAppState'

export function InvoicesPage() {
  const { invoices, clients, projects, createInvoice, updateInvoice, remindInvoice, cancelInvoice } = useAppState()
  const [params] = useSearchParams()
  const presetProject = params.get('project') || ''
  const preset = projects.find((project) => project.id === presetProject)
  const metrics = invoiceMetrics(invoices)
  const [clientId, setClientId] = useState(preset?.clientId || clients[0]?.id || '')
  const [projectId, setProjectId] = useState(preset?.id || '')
  const [dueLabel, setDueLabel] = useState('29 August 2026')
  const [items, setItems] = useState([{ id: createId('draft'), description: '', amount: '' }])
  const [notice, setNotice] = useState('')
  const [editingId, setEditingId] = useState(null)

  const clientProjects = projects.filter((project) => project.clientId === clientId)
  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

  const updateItem = (id, patch) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const submit = (event) => {
    event.preventDefault()
    const cleaned = items.filter((item) => item.description.trim() && Number(item.amount) > 0)
    if (!clientId || !projectId || cleaned.length === 0) {
      setNotice('Choose a client, a project, and at least one line item.')
      return
    }
    if (editingId) {
      const result = updateInvoice(editingId, { dueLabel, items: cleaned.map((item) => ({ ...item, amount: Number(item.amount) })), title: cleaned[0].description })
      setNotice(result.ok ? 'Invoice updated.' : result.message)
      setEditingId(null)
      return
    }
    const invoice = createInvoice({ clientId, projectId, dueLabel, items: cleaned })
    setNotice(`${invoice.number} was sent. It now shows on the client account.`)
    setItems([{ id: createId('draft'), description: '', amount: '' }])
  }

  return (
    <>
      <PageIntro
        title="Invoices"
        subtitle="Track billing status across every client, synced live from each project."
      />
      <div className="invoice-layout">
        <div className="stack">
          <div className="stat-grid stat-grid--three">
            <StatCard label="TOTAL OUTSTANDING" value={formatRand(metrics.outstanding)} />
            <StatCard label="PAID THIS MONTH" value={formatRand(metrics.paid)} />
            <StatCard label="OVERDUE" value={formatRand(metrics.overdue)} hint={metrics.overdue ? 'Needs a reminder' : 'None overdue'} hintTone={metrics.overdue ? 'danger' : 'green'} />
          </div>
          <Card>
            {notice ? <p className="notice">{notice}</p> : null}
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Client / Project</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Due</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => {
                    const client = clientById(clients, invoice.clientId)
                    const project = projectById(projects, invoice.projectId)
                    return (
                      <tr key={invoice.id}>
                        <td>
                          <div className="cell-title">#{invoice.number}</div>
                          <div className="cell-sub">Issued {invoice.issuedLabel}</div>
                        </td>
                        <td>
                          <div className="cell-title">{client?.name}</div>
                          <div className="cell-sub">{project?.name} — {invoice.title}</div>
                        </td>
                        <td>{formatRand(invoiceTotal(invoice))}</td>
                        <td><StatusBadge status={invoice.status} group="invoice" /></td>
                        <td>{invoice.dueLabel}</td>
                          <td>
                          {invoice.status === 'paid' || invoice.status === 'cancelled' ? <span className="quiet">{invoice.status === 'paid' ? 'Recorded' : 'Cancelled'}</span> : (
                            <>
                              <button className="linkish" type="button" onClick={() => remindInvoice(invoice.id)}>
                                {invoice.reminded ? 'Reminded' : 'Remind'}
                              </button>
                              {' · '}
                              <button className="linkish" type="button" onClick={() => {
                                setEditingId(invoice.id)
                                setClientId(invoice.clientId)
                                setProjectId(invoice.projectId)
                                setDueLabel(invoice.dueLabel)
                                setItems(invoice.items.map((item) => ({ ...item, amount: String(item.amount) })))
                                setNotice(`Editing ${invoice.number}. Paid invoices stay locked.`)
                              }}>Edit</button>
                              {' · '}
                              <button className="linkish" type="button" onClick={() => cancelInvoice(invoice.id)}>Cancel</button>
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
        <Card className="side-panel">
          <h2>{editingId ? 'Edit invoice' : 'Create Invoice'}</h2>
          <span className="quiet">This will appear on the client's project view.</span>
          <form className="stack" onSubmit={submit}>
            <SelectField label="Client" value={clientId} onChange={(event) => { setClientId(event.target.value); setProjectId('') }}>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </SelectField>
            <SelectField label="Project" value={projectId} onChange={(event) => setProjectId(event.target.value)} required>
              <option value="">Select a project</option>
              {clientProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </SelectField>
            <TextField label="Due date" value={dueLabel} onChange={(event) => setDueLabel(event.target.value)} required />
            <div className="field">
              <span className="field__label">Line items</span>
              {items.map((item) => (
                <div className="line-item" key={item.id}>
                  <input className="field__control" placeholder="Description" value={item.description} onChange={(event) => updateItem(item.id, { description: event.target.value })} />
                  <input className="field__control" type="number" min="0" placeholder="0" value={item.amount} onChange={(event) => updateItem(item.id, { amount: event.target.value })} />
                  <button className="linkish" type="button" onClick={() => setItems((current) => current.filter((row) => row.id !== item.id))} aria-label="Remove line">Remove</button>
                </div>
              ))}
              <button className="linkish" type="button" onClick={() => setItems((current) => [...current, { id: createId('draft'), description: '', amount: '' }])}>Add line</button>
            </div>
            <div className="total-row"><span>Total</span><span>{formatRand(total)}</span></div>
            <Button type="submit" block>{editingId ? 'Save invoice' : 'Send Invoice to Client'}</Button>
          </form>
        </Card>
      </div>
    </>
  )
}
