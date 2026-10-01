import { Link } from 'react-router-dom'
import { useState } from 'react'
import { LANE_MOVE, TASK_LANES, projectProgress } from '../../domain/catalog'
import { formatRelative } from '../../lib/format'
import { useAppState } from '../../state/useAppState'
import { Avatar, AvatarStack } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { ProgressBar } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { StatusBadge } from '../ui/StatusBadge'

export function TaskBoard({ project }) {
  const { members, moveTask } = useAppState()
  return (
    <div className="board">
      {TASK_LANES.map((lane) => {
        const tasks = project.tasks.filter((task) => task.status === lane.id)
        return (
          <section key={lane.id} className="lane" aria-label={lane.label}>
            <div className="lane__head">
              <span>{lane.label.toUpperCase()}</span>
              <span className="badge badge--count">{tasks.length}</span>
            </div>
            {tasks.length === 0 ? <p className="empty">Nothing in this lane</p> : null}
            {tasks.map((task) => {
              const assignee = members.find((member) => member.id === task.assigneeId)
              const move = LANE_MOVE[task.status]
              return (
                <article key={task.id} className="task">
                  <StatusBadge
                    status={task.status === 'done' ? 'done' : task.type}
                    group={task.status === 'done' ? 'project' : 'task'}
                    label={task.status === 'done' ? 'Done' : undefined}
                  />
                  <h3>{task.title}</h3>
                  <div className="task__foot">
                    <span>{task.dueLabel}</span>
                    {assignee ? <Avatar initials={assignee.initials} /> : null}
                  </div>
                  <div className="task__actions">
                    {move.previous ? (
                      <Button size="small" variant="secondary" onClick={() => moveTask(project.id, task.id, move.previous)}>
                        {move.previousLabel}
                      </Button>
                    ) : null}
                    {move.next ? (
                      <Button size="small" onClick={() => moveTask(project.id, task.id, move.next)}>
                        {move.nextLabel}
                      </Button>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}

export function FileList({ project, canApprove = false }) {
  const { approveFile } = useAppState()
  if (!project.files.length) return <p className="empty">No files uploaded yet.</p>
  return project.files.map((file) => (
    <div className="file-row" key={file.id}>
      <span className="file-mark">{file.kind}</span>
      <div className="file-copy">
        <strong>{file.name}</strong>
        <small>Uploaded by {file.uploadedBy} · v{file.version || 1} · {formatRelative(file.createdAt)}{file.description ? ` · ${file.description}` : ''}</small>
      </div>
      <StatusBadge status={file.approval} group="approval" />
      {canApprove && file.approval === 'pending' ? (
        <Button size="small" onClick={() => approveFile(project.id, file.id)}>Approve</Button>
      ) : null}
    </div>
  ))
}

export function CommentThread({ project }) {
  const { addComment } = useAppState()
  const submit = (event) => {
    event.preventDefault()
    const input = event.currentTarget.elements.comment
    if (!input.value.trim()) return
    addComment(project.id, input.value)
    input.value = ''
  }
  return (
    <>
      {project.comments.length === 0 ? <p className="empty">No comments yet.</p> : null}
      {project.comments.map((comment) => (
        <article className="comment" key={comment.id}>
          <Avatar initials={comment.initials} tone="light" />
          <div>
            <strong>{comment.authorName}</strong>
            <small>{formatRelative(comment.createdAt)}</small>
            <p>{comment.body}</p>
          </div>
        </article>
      ))}
      <form className="composer" onSubmit={submit}>
        <input className="field__control" name="comment" placeholder="Write a comment" aria-label="Write a comment" />
        <Button type="submit">Send</Button>
      </form>
    </>
  )
}

export function ProjectTable({ projects, clients, members, to, onDelete }) {
  const [pending, setPending] = useState(null)
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th>Client / Project</th>
            <th>Progress</th>
            <th>Status</th>
            <th>Team</th>
            <th>Due</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => {
            const client = clients.find((item) => item.id === project.clientId)
            const people = members.filter((member) => (project.memberIds ?? []).includes(member.id))
            return (
              <tr key={project.id}>
                <td>
                  <div className="cell-title">{client?.name}</div>
                  <div className="cell-sub">{project.name}</div>
                </td>
                <td className="progress-cell"><ProgressBar value={projectProgress(project)} thin /></td>
                <td><StatusBadge status={project.status} /></td>
                <td><AvatarStack people={people} /></td>
                <td>{project.dueLabel}</td>
                <td>
                  <div className="task__actions">
                    <Link className="btn btn--secondary btn--small" to={to(project.id)}>View</Link>
                    {onDelete ? <Button size="small" variant="ghost" onClick={() => setPending(project)}>Delete</Button> : null}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {projects.length === 0 ? <p className="empty">No projects match this view.</p> : null}
      <Modal title="Delete project" open={Boolean(pending)} onClose={() => setPending(null)}>
        <p>Delete <strong>{pending?.name}</strong>? The client will no longer see this project, its files, or its invoices.</p>
        <div className="task__actions">
          <Button variant="secondary" onClick={() => setPending(null)}>Keep project</Button>
          <Button onClick={() => { onDelete?.(pending.id); setPending(null) }}>Delete project</Button>
        </div>
      </Modal>
    </div>
  )
}
