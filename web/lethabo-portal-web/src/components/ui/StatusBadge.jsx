import { INVOICE_STATUSES, PROJECT_STATUSES, statusLabel, TASK_TYPES } from '../../domain/catalog'
import { cx } from '../../lib/format'

const GROUPS = {
  project: PROJECT_STATUSES,
  invoice: INVOICE_STATUSES,
  task: TASK_TYPES,
}

export function StatusBadge({ status, group = 'project', label }) {
  const text = label ?? (group === 'approval'
    ? status === 'approved' ? 'Approved' : status === 'pending' ? 'Awaiting approval' : ''
    : statusLabel(GROUPS[group] ?? [], status))
  if (!text) return null
  return <span className={cx('badge', `badge--${status}`)}>{text}</span>
}
