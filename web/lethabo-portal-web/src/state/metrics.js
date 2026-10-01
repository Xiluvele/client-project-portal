import { projectProgress } from '../domain/catalog'

export function projectHealth(project, changeRequests = []) {
  const openChange = changeRequests.some(
    (request) => request.projectId === project.id && ['submitted', 'under_review', 'clarification'].includes(request.status),
  )
  const overdueTask = (project.tasks ?? []).some((task) => task.overdue && task.status !== 'done')
  if (project.status === 'at_risk' || openChange || overdueTask) return 'at_risk'
  return 'on_track'
}

export function invoiceTotal(invoice) {
  return invoice.items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
}

export function clientById(clients, clientId) {
  return clients.find((client) => client.id === clientId)
}

export function projectById(projects, projectId) {
  return projects.find((project) => project.id === projectId)
}

export function projectsForClient(projects, clientId) {
  return projects.filter((project) => project.clientId === clientId)
}

export function invoicesForClient(invoices, clientId) {
  return invoices.filter((invoice) => invoice.clientId === clientId)
}

export function unreadClientComments(projects, clientId) {
  return projects
    .filter((project) => (clientId ? project.clientId === clientId : true))
    .flatMap((project) => project.comments)
    .filter((comment) => comment.role === 'client' && !comment.read)
}

export function managerMetrics(projects, invoices, members) {
  const active = projects.filter((project) => project.status !== 'done')
  const openInvoices = invoices.filter((invoice) => invoice.status === 'pending' || invoice.status === 'overdue')
  const allocated = members.filter((member) => member.allocated).length
  return {
    activeCount: active.length,
    dueThisWeek: active.filter((project) => project.dueThisWeek).length,
    pendingAmount: openInvoices.reduce((sum, invoice) => sum + invoiceTotal(invoice), 0),
    awaitingCount: openInvoices.length,
    unreadCount: unreadClientComments(projects).length,
    utilisation: members.length ? Math.round((allocated / members.length) * 100) : 0,
  }
}

export function invoiceMetrics(invoices) {
  const outstanding = invoices.filter((invoice) => invoice.status === 'pending' || invoice.status === 'overdue')
  const overdue = invoices.filter((invoice) => invoice.status === 'overdue')
  const paid = invoices.filter((invoice) => invoice.status === 'paid')
  return {
    outstanding: outstanding.reduce((sum, invoice) => sum + invoiceTotal(invoice), 0),
    paid: paid.reduce((sum, invoice) => sum + invoiceTotal(invoice), 0),
    overdue: overdue.reduce((sum, invoice) => sum + invoiceTotal(invoice), 0),
  }
}

export function clientMetrics(projects, invoices) {
  const active = projects.filter((project) => project.status !== 'done')
  const openInvoices = invoices.filter((invoice) => invoice.status === 'pending' || invoice.status === 'overdue')
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
    outstanding: openInvoices.reduce((sum, invoice) => sum + invoiceTotal(invoice), 0),
    openInvoiceCount: openInvoices.length,
    pendingApprovals,
  }
}
