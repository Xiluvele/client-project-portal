
export const todayISO = () => new Date().toISOString().slice(0, 10)

export const effectiveStatus = (invoice, today = todayISO()) =>
  invoice.status === 'sent' && invoice.dueAt < today ? 'overdue' : invoice.status

export const invoiceTotal = (invoice) =>
  invoice.lines.reduce((total, line) => total + line.qty * line.amount, 0)

export const nextInvoiceNumber = (invoices) => {
  const highest = invoices.reduce((max, inv) => Math.max(max, parseInt(inv.number.replace(/\D/g, ''), 10) || 0), 0)
  return `INV-${String(highest + 1).padStart(4, '0')}`
}