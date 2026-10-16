import { PROJECT_STATUSES, statusLabel, TASK_TYPES } from '../../domain/catalog'
import { cx } from '../../lib/format'

const GROUPS = {
  project: PROJECT_STATUSES,
  task: TASK_TYPES,
}

const INVOICE_LABELS = {
  draft: 'Draft',
  sent: 'Sent',
  pending: 'Sent',
  overdue: 'Overdue',
  approved: 'Approved',
  declined: 'Declined',
  paid: 'Paid',
  cancelled: 'Cancelled',
}

export function StatusBadge({ status, group = 'project', label }) {
  let text = label
  if (!text) {
    if (group === 'approval') text = status === 'approved' ? 'Approved' : status === 'declined' ? 'Declined' : status === 'pending' ? 'Awaiting client' : ''
    else if (group === 'invoice') text = INVOICE_LABELS[status] ?? status
    else text = statusLabel(GROUPS[group] ?? [], status)
  }
  if (!text) return null
  return <span className={cx('badge', `badge--${status}`)}>{text}</span>
}