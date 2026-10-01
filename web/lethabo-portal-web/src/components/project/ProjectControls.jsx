import { useState } from 'react'
import { CHANGE_STATUSES, REQUIREMENT_STATUSES } from '../../domain/catalog'
import { formatRelative } from '../../lib/format'
import { useAppState } from '../../state/useAppState'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { TextField } from '../ui/Fields'
import { Modal } from '../ui/Modal'
import { StatusBadge } from '../ui/StatusBadge'

export function MilestonePanel({ project }) {
  const { addMilestone, completeMilestone } = useAppState()
  const [name, setName] = useState('')
  const [targetLabel, setTargetLabel] = useState('')
  const [error, setError] = useState('')
  const milestones = project.milestones ?? []

  const submit = (event) => {
    event.preventDefault()
    const result = addMilestone(project.id, { name, targetLabel })
    if (!result.ok) {
      setError(result.message)
      return
    }
    setName('')
    setTargetLabel('')
    setError('')
  }

  return (
    <Card>
      <div className="section-head"><h2>Milestones</h2></div>
      {milestones.length === 0 ? <p className="empty">No milestones yet. Add the planned stages for this project.</p> : null}
      {milestones.map((milestone) => (
        <div className="file-row" key={milestone.id}>
          <div className="file-copy">
            <strong>{milestone.name}</strong>
            <small>{milestone.targetLabel || 'No target date'}</small>
          </div>
          <StatusBadge status={milestone.status === 'complete' ? 'confirmed' : 'recorded'} label={milestone.status === 'complete' ? 'Complete' : 'Planned'} />
          {milestone.status !== 'complete' ? (
            <Button size="small" onClick={() => completeMilestone(project.id, milestone.id)}>Mark complete</Button>
          ) : null}
        </div>
      ))}
      <form className="stack" onSubmit={submit}>
        {error ? <p className="field__error">{error}</p> : null}
        <TextField label="Milestone name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Design" />
        <TextField label="Target date" value={targetLabel} onChange={(event) => setTargetLabel(event.target.value)} placeholder="12 Sep" />
        <Button type="submit">Add milestone</Button>
      </form>
    </Card>
  )
}

export function RequirementPanel({ project, canRecord = false, canConfirm = false }) {
  const { requirements, addRequirement, setRequirementStatus } = useAppState()
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const rows = requirements.filter((item) => item.projectId === project.id)

  const submit = (event) => {
    event.preventDefault()
    const result = addRequirement(project.id, text)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setText('')
    setError('')
  }

  return (
    <Card>
      <div className="section-head"><h2>Requirements</h2></div>
      {rows.length === 0 ? <p className="empty">No requirements have been recorded for this project.</p> : null}
      {rows.map((item) => (
        <div className="file-row" key={item.id}>
          <div className="file-copy">
            <strong>{item.text}</strong>
          </div>
          <StatusBadge status={item.status} group="requirement" label={REQUIREMENT_STATUSES.find((status) => status.id === item.status)?.label} />
          {canConfirm && item.status === 'recorded' ? (
            <>
              <Button size="small" onClick={() => setRequirementStatus(item.id, 'confirmed')}>Confirm</Button>
              <Button size="small" variant="secondary" onClick={() => setRequirementStatus(item.id, 'disputed')}>Dispute</Button>
            </>
          ) : null}
          {canRecord && item.status === 'disputed' ? (
            <Button size="small" onClick={() => setRequirementStatus(item.id, 'recorded')}>Re-submit</Button>
          ) : null}
        </div>
      ))}
      {canRecord ? (
        <form className="stack" onSubmit={submit}>
          {error ? <p className="field__error">{error}</p> : null}
          <TextField label="Requirement" value={text} onChange={(event) => setText(event.target.value)} placeholder="What was agreed with the client" />
          <Button type="submit">Record requirement</Button>
        </form>
      ) : null}
    </Card>
  )
}

export function ChangeRequestPanel({ project, canSubmit = false, canDecide = false }) {
  const { changeRequests, submitChangeRequest, decideChangeRequest } = useAppState()
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const rows = changeRequests.filter((item) => item.projectId === project.id)

  const submit = (event) => {
    event.preventDefault()
    const result = submitChangeRequest(project.id, description)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setDescription('')
    setError('')
  }

  return (
    <Card>
      <div className="section-head"><h2>Change requests</h2></div>
      <p className="quiet">These sit outside the confirmed requirements.</p>
      {rows.length === 0 ? <p className="empty">No change requests.</p> : null}
      {rows.map((request) => (
        <div className="file-row" key={request.id}>
          <div className="file-copy">
            <strong>{request.description}</strong>
            <small>{formatRelative(request.createdAt)}</small>
          </div>
          <StatusBadge status={request.status} label={CHANGE_STATUSES.find((status) => status.id === request.status)?.label} />
          {canDecide && ['submitted', 'under_review', 'clarification'].includes(request.status) ? (
            <div className="task__actions">
              <Button size="small" onClick={() => decideChangeRequest(request.id, 'approved')}>Approve</Button>
              <Button size="small" variant="secondary" onClick={() => decideChangeRequest(request.id, 'rejected')}>Reject</Button>
              <Button size="small" variant="ghost" onClick={() => decideChangeRequest(request.id, 'clarification')}>Ask for detail</Button>
            </div>
          ) : null}
        </div>
      ))}
      {canSubmit ? (
        <form className="stack" onSubmit={submit}>
          {error ? <p className="field__error">{error}</p> : null}
          <label className="field">
            <span className="field__label">Requested change</span>
            <textarea className="field__control" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
          </label>
          <Button type="submit">Request a change</Button>
        </form>
      ) : null}
    </Card>
  )
}

export function ActivityHistory({ projectId }) {
  const { activities } = useAppState()
  const rows = activities.filter((item) => item.projectId === projectId)
  return (
    <Card>
      <div className="section-head"><h2>Activity history</h2></div>
      {rows.length === 0 ? <p className="empty">No activity on this project yet.</p> : null}
      <div className="activity">
        {rows.map((item) => (
          <div className="activity__item" key={item.id}>
            <span className="activity__dot" />
            <div>
              <p>{item.text}</p>
              <small>{formatRelative(item.createdAt)}</small>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function NewTaskModal({ project, open, onClose }) {
  const { users, addTask } = useAppState()
  const developers = users.filter((item) => item.role === 'developer' && item.active !== false)

  const submit = (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    if (!data.get('title')?.toString().trim()) return
    addTask(project.id, {
      title: data.get('title'),
      description: data.get('description') || '',
      dueLabel: data.get('dueLabel') || '',
      assigneeId: data.get('assigneeId') || '',
    })
    onClose()
  }

  return (
    <Modal title="New task" open={open} onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <TextField label="Task title" name="title" required placeholder="Build the contact form" />
        <TextField label="Description" name="description" placeholder="What the developer needs to deliver" />
        <TextField label="Due date" name="dueLabel" placeholder="22 Aug" />
        <label className="field">
          <span className="field__label">Developer</span>
          <select className="field__control" name="assigneeId" defaultValue="">
            <option value="">Leave unassigned</option>
            {developers.map((developer) => (
              <option key={developer.id} value={developer.memberId || developer.id}>{developer.name}</option>
            ))}
          </select>
        </label>
        <Button type="submit">Save task</Button>
      </form>
    </Modal>
  )
}
