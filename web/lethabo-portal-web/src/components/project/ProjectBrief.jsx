import { useState } from 'react'
import { Link } from 'react-router-dom'
import { REQUIREMENT_STATUSES, TASK_LANES, commentSpeaker, projectProgress } from '../../domain/catalog'
import { effectiveStatus, invoiceTotal } from '../../lib/invoiceDates'
import { cx, formatRand, formatRelative } from '../../lib/format'
import { useAppState } from '../../state/useAppState'
import { Button } from '../ui/Button'
import { ProgressBar } from '../ui/Card'
import { Icon } from '../ui/Icon'
import { StatusBadge } from '../ui/StatusBadge'

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const OPEN_DECISIONS = ['submitted', 'under_review', 'clarification']
const LANE_LABEL = { backlog: 'To do', in_progress: 'In progress', in_review: 'In review', done: 'Done' }

function daysUntil(label) {
  const match = String(label ?? '').match(/(\d{1,2})\s+([A-Za-z]{3})/)
  if (!match) return null
  const month = MONTHS.indexOf(match[2].toLowerCase())
  if (month < 0) return null
  const target = new Date(new Date().getFullYear(), month, Number(match[1]))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function trackingSentence(milestones) {
  const list = milestones ?? []
  if (!list.length) return 'Add milestones to show where this project stands.'
  const index = list.findIndex((item) => item.status !== 'complete')
  if (index < 0) return 'Every milestone on this project is complete.'
  const current = list[index]
  const previous = list[index - 1]
  const days = daysUntil(current.targetLabel)
  const name = current.name.toLowerCase()
  if (previous && days > 1) return `${previous.name} is done and ${name} starts in ${days} days.`
  if (previous && days === 1) return `${previous.name} is done and ${name} starts tomorrow.`
  if (previous && days === 0) return `${previous.name} is done and ${name} starts today.`
  if (previous) return `${previous.name} is done and ${current.name} is next${current.targetLabel ? `, due ${current.targetLabel}` : ''}.`
  if (days > 1) return `${current.name} starts in ${days} days.`
  return `${current.name} is the current milestone${current.targetLabel ? `, due ${current.targetLabel}` : ''}.`
}

function waitingSentence(count) {
  if (!count) return ''
  return count === 1 ? '1 thing is waiting on you.' : `${count} things are waiting on you.`
}

function dueText(label) {
  if (!label || label === 'No date') return ''
  return /\d/.test(label) ? `due ${label}` : label
}

function Panel({ icon, title, summary, count, open, onToggle, children }) {
  return (
    <section className="accordion">
      <button type="button" className="accordion__head" aria-expanded={open} onClick={onToggle}>
        <Icon name={icon} />
        <span className="accordion__copy">
          <strong>{title}</strong>
          {summary ? <small>{summary}</small> : null}
        </span>
        {count ? <span className="accordion__count">{count}</span> : <span />}
        <Icon name="chevron" className={cx('icon accordion__chevron', open && 'is-open')} />
      </button>
      {open ? <div className="accordion__body">{children}</div> : null}
    </section>
  )
}

export function ProjectBrief({ project, onNewTask, onUpload }) {
  const {
    members,
    users,
    invoices,
    changeRequests,
    requirements,
    moveTask,
    assignTask,
    nudgeClient,
    addComment,
    addRequirement,
    decideChangeRequest,
    completeMilestone,
    addMilestone,
  } = useAppState()
  const [open, setOpen] = useState(() => new Set(['tasks']))
  const [nudged, setNudged] = useState({})
  const [assigningId, setAssigningId] = useState(null)
  const [assignError, setAssignError] = useState('')
  const [reply, setReply] = useState('')
  const [requirement, setRequirement] = useState('')
  const [requirementError, setRequirementError] = useState('')
  const [addingMilestone, setAddingMilestone] = useState(false)
  const [milestoneName, setMilestoneName] = useState('')
  const [milestoneDate, setMilestoneDate] = useState('')
  const [milestoneError, setMilestoneError] = useState('')

  const toggle = (id) => {
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const milestones = project.milestones ?? []
  const currentMilestone = milestones.find((item) => item.status !== 'complete')
  const tasks = project.tasks ?? []
  const openTasks = tasks.filter((task) => task.status !== 'done')
  const unassigned = openTasks.filter((task) => !task.assigneeId)
  const reviews = openTasks.filter((task) => task.status === 'in_review')
  const requests = changeRequests.filter((item) => item.projectId === project.id && OPEN_DECISIONS.includes(item.status))
  const projectRequirements = requirements.filter((item) => item.projectId === project.id)
  const unconfirmed = projectRequirements.filter((item) => item.status !== 'confirmed')
  const projectInvoices = invoices.filter((item) => item.projectId === project.id)
  const unpaid = projectInvoices.filter((item) => !['paid', 'cancelled', 'draft'].includes(effectiveStatus(item)))
  const unpaidTotal = unpaid.reduce((sum, item) => sum + invoiceTotal(item), 0)
  const pendingFiles = (project.files ?? []).filter((file) => file.approval === 'pending')
  const approvedFiles = (project.files ?? []).filter((file) => file.approval === 'approved')
  const developers = users.filter((item) => item.role === 'developer' && item.active !== false)
  const latestComment = [...(project.comments ?? [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
  const needs = [
    ...reviews.map((task) => ({ kind: 'review', id: task.id, task })),
    ...requests.map((request) => ({ kind: 'change', id: request.id, request })),
    ...unassigned.filter((task) => task.status !== 'in_review').map((task) => ({ kind: 'owner', id: task.id, task })),
  ]
  const lead = [trackingSentence(milestones), waitingSentence(needs.length)].filter(Boolean).join(' ')

  const person = (assigneeId) => members.find((member) => member.id === assigneeId)

  const saveAssignment = (event, taskId) => {
    event.preventDefault()
    const assigneeId = new FormData(event.currentTarget).get('assigneeId')
    const result = assignTask(project.id, taskId, assigneeId)
    if (!result.ok) {
      setAssignError(result.message)
      return
    }
    setAssigningId(null)
    setAssignError('')
  }

  const sendReply = (event) => {
    event.preventDefault()
    if (!reply.trim()) return
    addComment(project.id, reply)
    setReply('')
  }

  const saveRequirement = (event) => {
    event.preventDefault()
    const result = addRequirement(project.id, requirement)
    if (!result.ok) {
      setRequirementError(result.message)
      return
    }
    setRequirement('')
    setRequirementError('')
  }

  const saveMilestone = (event) => {
    event.preventDefault()
    const result = addMilestone(project.id, { name: milestoneName, targetLabel: milestoneDate })
    if (!result.ok) {
      setMilestoneError(result.errors?.name || result.errors?.targetLabel || result.message || 'Check the milestone details.')
      return
    }
    setMilestoneName('')
    setMilestoneDate('')
    setMilestoneError('')
    setAddingMilestone(false)
  }

  const orderedTasks = [...openTasks].sort((a, b) => {
    const attention = (task) => (!task.assigneeId ? 0 : task.status === 'in_review' ? 1 : 2)
    const byAttention = attention(a) - attention(b)
    if (byAttention !== 0) return byAttention
    return TASK_LANES.findIndex((lane) => lane.id === a.status) - TASK_LANES.findIndex((lane) => lane.id === b.status)
  })

  return (
    <div className="brief">
      <p className="brief__lead">{lead}</p>
      <div className="brief__meter">
        <span>Work done</span>
        <ProgressBar value={projectProgress(project)} />
        <strong>{projectProgress(project)}%</strong>
      </div>
      <div className="brief__pills">
        {milestones.map((item) => {
          const done = item.status === 'complete'
          const now = item.id === currentMilestone?.id
          return (
            <span key={item.id} className={cx('pill', done && 'pill--done', now && 'pill--now', !done && !now && 'pill--later')}>
              {done ? <Icon name="check" className="icon icon--sm" /> : null}
              {item.name}{!done && item.targetLabel ? ` · ${item.targetLabel}` : ''}
            </span>
          )
        })}
        {currentMilestone ? (
          <Button size="small" variant="secondary" onClick={() => completeMilestone(project.id, currentMilestone.id)}>
            Mark {currentMilestone.name} complete
          </Button>
        ) : null}
        <Button size="small" variant="ghost" onClick={() => setAddingMilestone((value) => !value)}>
          {addingMilestone ? 'Close' : 'Add milestone'}
        </Button>
      </div>
      {addingMilestone ? (
        <form className="inline-fields" onSubmit={saveMilestone}>
          {milestoneError ? <p className="field__error">{milestoneError}</p> : null}
          <label className="field">
            <span className="field__label">Milestone name</span>
            <input className="field__control" value={milestoneName} onChange={(event) => setMilestoneName(event.target.value)} placeholder="Testing" />
          </label>
          <label className="field">
            <span className="field__label">Target date</span>
            <input className="field__control" value={milestoneDate} onChange={(event) => setMilestoneDate(event.target.value)} placeholder="20 Sep" />
          </label>
          <Button type="submit">Add</Button>
        </form>
      ) : null}

      <Panel
        icon="clipboard"
        title="Tasks"
        summary={tasks.length ? `${needs.length} waiting · ${openTasks.length} open · ${tasks.length - openTasks.length} done` : 'No tasks yet'}
        count={needs.length || null}
        open={open.has('tasks')}
        onToggle={() => toggle('tasks')}
      >
        {requests.map((request) => (
          <div className="accordion__row" key={request.id}>
            <div className="file-copy">
              <strong>Change request: {request.description.split('.')[0]}</strong>
              <small>Outside the agreed requirements</small>
            </div>
            <div className="accordion__actions">
              <Button size="small" variant="secondary" onClick={() => decideChangeRequest(request.id, 'approved')}>Approve</Button>
              <Button size="small" variant="secondary" onClick={() => decideChangeRequest(request.id, 'rejected')}>Reject</Button>
            </div>
          </div>
        ))}
        {orderedTasks.length === 0 && requests.length === 0 ? <p className="empty">No open tasks.</p> : null}
        {orderedTasks.map((task) => {
          const owner = person(task.assigneeId)
          const lane = TASK_LANES.find((item) => item.id === task.status)
          const meta = owner ? [owner.shortName?.replace(/\.$/, '') || owner.name, dueText(task.dueLabel)].filter(Boolean).join(' · ') : ''
          return (
            <div className="accordion__row" key={task.id}>
              <div className="file-copy">
                <strong>{task.title}</strong>
                {owner ? <small>{meta}</small> : <small className="brief__unassigned">Unassigned</small>}
              </div>
              <div className="accordion__actions">
                {!owner ? (
                  assigningId === task.id ? (
                    <form className="accordion__assign" onSubmit={(event) => saveAssignment(event, task.id)}>
                      <select className="field__control" name="assigneeId" defaultValue="" aria-label="Developer">
                        <option value="">Choose</option>
                        {developers.map((developer) => (
                          <option key={developer.id} value={developer.memberId || developer.id}>{developer.name}</option>
                        ))}
                      </select>
                      <Button size="small" type="submit">Save</Button>
                    </form>
                  ) : (
                    <Button size="small" variant="secondary" onClick={() => { setAssigningId(task.id); setAssignError('') }}>Assign</Button>
                  )
                ) : null}
                {task.status === 'in_review' ? (
                  <Button
                    size="small"
                    variant="secondary"
                    disabled={nudged[task.id]}
                    onClick={() => {
                      const result = nudgeClient(project.id, task.id)
                      if (result.ok) setNudged((current) => ({ ...current, [task.id]: true }))
                    }}
                  >
                    {nudged[task.id] ? 'Sent' : 'Remind client'}
                  </Button>
                ) : null}
                {task.status === 'in_review' ? (
                  <Button size="small" variant="secondary" onClick={() => moveTask(project.id, task.id, 'done')}>Approve</Button>
                ) : null}
                <StatusBadge status={task.status} label={LANE_LABEL[task.status] ?? lane?.label ?? task.status} />
              </div>
            </div>
          )
        })}
        {assignError ? <p className="field__error">{assignError}</p> : null}
        <div className="accordion__compose">
          <Button variant="secondary" onClick={onNewTask}>New task</Button>
        </div>
      </Panel>

      <Panel
        icon="folder"
        title="Files and designs"
        summary={(project.files ?? []).length ? `${pendingFiles.length} awaiting approval · ${approvedFiles.length} approved` : 'No files yet'}
        open={open.has('files')}
        onToggle={() => toggle('files')}
      >
        {(project.files ?? []).length === 0 ? <p className="empty">No files uploaded yet.</p> : null}
        {[...pendingFiles, ...approvedFiles].map((file) => (
          <div className="accordion__row" key={file.id}>
            <div className="file-copy">
              <strong>{file.name}</strong>
              <small>{file.uploadedBy} · {formatRelative(file.createdAt)}</small>
            </div>
            <StatusBadge status={file.approval} group="approval" label={file.approval === 'pending' ? 'Awaiting client' : undefined} />
          </div>
        ))}
        <div className="accordion__compose">
          <Button variant="secondary" onClick={onUpload}>Upload file</Button>
        </div>
      </Panel>

      <Panel
        icon="chat"
        title="Messages"
        summary={[
          latestComment ? `Last message ${formatRelative(latestComment.createdAt)}` : 'No messages yet',
          unconfirmed.length ? `${unconfirmed.length} requirement${unconfirmed.length === 1 ? '' : 's'} unconfirmed` : '',
        ].filter(Boolean).join(' · ')}
        open={open.has('messages')}
        onToggle={() => toggle('messages')}
      >
        {(project.comments ?? []).length === 0 ? <p className="empty">No messages yet.</p> : null}
        {(project.comments ?? []).map((comment) => (
          <div className="accordion__row" key={comment.id}>
            <div className="file-copy">
              <strong>{comment.authorName} · {commentSpeaker(comment, members)}</strong>
              <small>{comment.body}</small>
            </div>
            <small>{formatRelative(comment.createdAt)}</small>
          </div>
        ))}
        <form className="accordion__compose" onSubmit={sendReply}>
          <input className="field__control" value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a message" aria-label="Write a message" />
          <Button variant="secondary" type="submit">Send</Button>
        </form>
        {projectRequirements.map((item) => (
          <div className="accordion__row" key={item.id}>
            <div className="file-copy"><strong>{item.text}</strong></div>
            <StatusBadge status={item.status} group="requirement" label={REQUIREMENT_STATUSES.find((status) => status.id === item.status)?.label} />
          </div>
        ))}
        <form className="accordion__compose" onSubmit={saveRequirement}>
          {requirementError ? <p className="field__error">{requirementError}</p> : null}
          <input className="field__control" value={requirement} onChange={(event) => setRequirement(event.target.value)} placeholder="What was agreed with the client" aria-label="Requirement" />
          <Button variant="secondary" type="submit">Record</Button>
        </form>
      </Panel>

      <Panel
        icon="invoices"
        title="Billing"
        summary={unpaidTotal ? `${formatRand(unpaidTotal).replace(/^R\s/, 'R')} unpaid${unpaid[0]?.dueLabel ? ` · due ${unpaid[0].dueLabel}` : ''}` : 'Nothing outstanding'}
        open={open.has('billing')}
        onToggle={() => toggle('billing')}
      >
        {projectInvoices.length === 0 ? <p className="empty">No invoices for this project yet.</p> : null}
        {projectInvoices.map((invoice) => {
          const status = effectiveStatus(invoice)
          return (
            <div className="accordion__row" key={invoice.id}>
              <div className="file-copy">
                <strong>{invoice.number} · {invoice.title}</strong>
                <small>{status === 'paid' ? `Paid ${invoice.issuedLabel}` : `Due ${invoice.dueLabel}`}</small>
              </div>
              <strong>{formatRand(invoiceTotal(invoice))}</strong>
              <StatusBadge status={status} group="invoice" />
            </div>
          )
        })}
        <div className="accordion__compose">
          <Link className="btn btn--secondary" to={`/team/invoices?project=${project.id}`}>Create invoice</Link>
        </div>
      </Panel>

    </div>
  )
}
