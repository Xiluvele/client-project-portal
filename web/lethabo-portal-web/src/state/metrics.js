import { projectProgress } from '../domain/catalog'
import { effectiveStatus, todayISO } from '../lib/invoiceDates'

export function projectHealth(project, changeRequests = []) {
  const openChange = changeRequests.some(
    (request) => request.projectId === project.id && ['submitted', 'under_review', 'clarification'].includes(request.status),
  )
  const overdueTask = (project.tasks ?? []).some((task) => task.overdue && task.status !== 'done')
  if (project.status === 'at_risk' || openChange || overdueTask) return 'at_risk'
  return 'on_track'
}

export function invoiceTotal(invoice) {
  return (invoice.items ?? []).reduce((sum, item) => sum + Number(item.qty ?? 1) * Number(item.amount || 0), 0)
}

const isOpen = (invoice) => ['sent', 'overdue', 'approved'].includes(effectiveStatus(invoice))
const totalOf = (list) => list.reduce((sum, invoice) => sum + invoiceTotal(invoice), 0)

export function clientById(clients, clientId) {
  return clients.find((client) => client.id === clientId)
}

export function projectById(projects, projectId) {
  return projects.find((project) => project.id === projectId)
}

export function projectsForClient(projects, clientId) {
  return projects.filter((project) => project.clientId === clientId)
}

export function projectsForMember(projects, memberId, userId) {
  const ids = [memberId, userId].filter(Boolean)
  if (!ids.length) return []
  return projects.filter((project) =>
    ids.some((id) => (project.memberIds ?? []).includes(id))
    || (project.tasks ?? []).some((task) => ids.includes(task.assigneeId)),
  )
}

export function projectsForSignedInClient(projects, user, clients = []) {
  if (!user) return []
  const ids = new Set()
  if (user.clientId) ids.add(user.clientId)
  const email = String(user.email ?? '').toLowerCase()
  clients.forEach((client) => {
    if (email && String(client.email ?? '').toLowerCase() === email) ids.add(client.id)
  })
  return projects.filter((project) => ids.has(project.clientId))
}

// Clients never see drafts
export function invoicesForClient(invoices, clientId, clients = [], email = '') {
  const ids = new Set()
  if (clientId) ids.add(clientId)
  const normalised = String(email ?? '').toLowerCase()
  clients.forEach((client) => {
    if (normalised && String(client.email ?? '').toLowerCase() === normalised) ids.add(client.id)
  })
  return invoices.filter((invoice) => ids.has(invoice.clientId) && invoice.status !== 'draft')
}

export function unreadClientComments(projects, clientId) {
  return projects
    .filter((project) => (clientId ? project.clientId === clientId : true))
    .flatMap((project) => project.comments)
    .filter((comment) => comment.role === 'client' && !comment.read)
}

export function managerMetrics(projects, invoices, members) {
  const active = projects.filter((project) => project.status !== 'done')
  const openInvoices = invoices.filter(isOpen)
  const allocated = members.filter((member) => member.allocated).length
  return {
    activeCount: active.length,
    dueThisWeek: active.filter((project) => project.dueThisWeek).length,
    pendingAmount: totalOf(openInvoices),
    awaitingCount: openInvoices.length,
    unreadCount: unreadClientComments(projects).length,
    utilisation: members.length ? Math.round((allocated / members.length) * 100) : 0,
  }
}

export function invoiceMetrics(invoices) {
  const month = todayISO().slice(0, 7)
  const byState = (state) => invoices.filter((invoice) => effectiveStatus(invoice) === state)
  const open = invoices.filter(isOpen)
  const overdue = byState('overdue')
  const drafts = byState('draft')
  const paid = byState('paid')
  const paidThisMonth = paid.filter((invoice) =>
    String(invoice.paidAt ?? invoice.dueAt ?? invoice.issuedAt ?? '').startsWith(month),
  )
  return {
    outstanding: totalOf(open),
    outstandingCount: open.length,
    paid: totalOf(paid),
    paidThisMonth: totalOf(paidThisMonth),
    paidThisMonthCount: paidThisMonth.length,
    overdue: totalOf(overdue),
    overdueCount: overdue.length,
    drafts: totalOf(drafts),
    draftCount: drafts.length,
  }
}

export function clientMetrics(projects, invoices) {
  const active = projects.filter((project) => project.status !== 'done')
  const openInvoices = invoices.filter((invoice) => invoice.status !== 'draft').filter(isOpen)
  const progressValues = projects.map((project) => projectProgress(project))
  const average = progressValues.length
    ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length)
    : 0
  const pendingApprovals = projects.reduce(
    (sum, project) => sum + project.files.filter((file) => file.approval === 'pending').length,
    0,
  )
  return {
    activeCount: active.length,
    averageProgress: average,
    outstanding: totalOf(openInvoices),
    openInvoiceCount: openInvoices.length,
    pendingApprovals,
  }
}