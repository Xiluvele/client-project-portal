export const TASK_LANES = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'in_review', label: 'In Review' },
  { id: 'done', label: 'Done' },
]

export const PROJECT_STATUSES = [
  { id: 'in_progress', label: 'In Progress' },
  { id: 'in_review', label: 'In Review' },
  { id: 'at_risk', label: 'At Risk' },
  { id: 'done', label: 'Done' },
]

export const INVOICE_STATUSES = [
  { id: 'pending', label: 'Pending' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'paid', label: 'Paid' },
]

export const TASK_TYPES = [
  { id: 'content', label: 'Content' },
  { id: 'dev', label: 'Dev' },
  { id: 'design', label: 'Design' },
]

export const STAGES = [
  { id: 'discovery', label: 'Discovery' },
  { id: 'design', label: 'Design' },
  { id: 'development', label: 'Development' },
  { id: 'testing', label: 'Testing' },
  { id: 'launch', label: 'Launch' },
]

export const LANE_MOVE = {
  backlog: { next: 'in_progress', nextLabel: 'Start' },
  in_progress: { next: 'in_review', nextLabel: 'Send to review', previous: 'backlog', previousLabel: 'Move back' },
  in_review: { next: 'done', nextLabel: 'Mark done', previous: 'in_progress', previousLabel: 'Return' },
  done: { previous: 'in_review', previousLabel: 'Reopen' },
}

const PROGRESS_WEIGHT = {
  backlog: 0.08,
  in_progress: 0.55,
  in_review: 0.82,
  done: 1,
}

export function projectProgress(project) {
  if (!project.tasks?.length) return project.progress ?? 0
  const total = project.tasks.reduce((sum, task) => sum + (PROGRESS_WEIGHT[task.status] ?? 0), 0)
  return Math.round((total / project.tasks.length) * 100)
}

export function statusLabel(list, id) {
  return list.find((item) => item.id === id)?.label ?? id
}
