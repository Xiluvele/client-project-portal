import { Link } from 'react-router-dom'
import { useState } from 'react'
import { commentSpeaker, projectProgress } from '../../domain/catalog'
import { formatRelative } from '../../lib/format'
import { useAppState } from '../../state/useAppState'
import { Avatar, AvatarStack } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { StatusBadge } from '../ui/StatusBadge'

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

const ViewIcon = () => (
  <svg {...iconProps}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const TrashIcon = () => (
  <svg {...iconProps}>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </svg>
)

export function FilePreview({ file, large = false }) {
  if (!file?.previewUrl) return null
  const image = file.previewUrl.startsWith('data:image') || file.kind === 'Image'
  if (image) {
    return <img className={large ? 'upload-preview__media' : 'file-preview'} src={file.previewUrl} alt="" />
  }
  if (large && file.kind === 'PDF') {
    return <iframe className="upload-preview__media" title={file.name} src={file.previewUrl} />
  }
  return <div className="doc-preview">{file.kind} · {file.name}</div>
}

export function FileList({ project, canApprove = false }) {
  const { approveFile } = useAppState()
  if (!project.files.length) return <p className="empty">No files uploaded yet.</p>
  return project.files.map((file) => (
    <div className="file-row" key={file.id}>
      {file.previewUrl ? <FilePreview file={file} /> : <span className="file-mark">{file.kind}</span>}
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
  const { addComment, members } = useAppState()
  const [replyToId, setReplyToId] = useState(null)
  const [reply, setReply] = useState('')
  const comments = project.comments ?? []
  const roots = comments.filter((comment) => !comment.replyToId)

  const submit = (event) => {
    event.preventDefault()
    const input = event.currentTarget.elements.comment
    if (!input.value.trim()) return
    addComment(project.id, input.value)
    input.value = ''
  }

  const sendReply = (event) => {
    event.preventDefault()
    if (!reply.trim() || !replyToId) return
    addComment(project.id, reply, replyToId)
    setReply('')
  }

  return (
    <>
      {roots.length === 0 ? <p className="empty">No comments yet.</p> : null}
      {roots.map((comment) => {
        const answers = comments.filter((item) => item.replyToId === comment.id)
        const answering = replyToId === comment.id
        return (
          <article className="comment" key={comment.id}>
            <Avatar initials={comment.initials} tone="light" />
            <div>
              <strong>{comment.authorName}</strong>
              <small>{commentSpeaker(comment, members)} · {formatRelative(comment.createdAt)}</small>
              <p>{comment.body}</p>
              <section className="reply-box">
                <button
                  type="button"
                  className="reply-box__head"
                  aria-expanded={answering}
                  onClick={() => {
                    setReply('')
                    setReplyToId((current) => (current === comment.id ? null : comment.id))
                  }}
                >
                  <span>{answers.length ? `Reply · ${answers.length}` : 'Reply'}</span>
                </button>
                {answering ? (
                  <div className="reply-box__body">
                    {answers.map((answer) => (
                      <div key={answer.id}>
                        <strong>{answer.authorName} · {commentSpeaker(answer, members)}</strong>
                        <small>{formatRelative(answer.createdAt)}</small>
                        <p>{answer.body}</p>
                      </div>
                    ))}
                    <form className="composer" onSubmit={sendReply}>
                      <input className="field__control" value={reply} onChange={(event) => setReply(event.target.value)} placeholder={`Reply to ${comment.authorName}`} aria-label={`Reply to ${comment.authorName}`} />
                      <Button type="submit">Send</Button>
                    </form>
                  </div>
                ) : null}
              </section>
            </div>
          </article>
        )
      })}
      <form className="composer" onSubmit={submit}>
        <input className="field__control" name="comment" placeholder="Write a comment" aria-label="Write a comment" />
        <Button type="submit">Send</Button>
      </form>
    </>
  )
}

export function ProjectTable({ projects, clients, members, to, onDelete, emptyLabel = 'No projects match this view.' }) {
  const [pending, setPending] = useState(null)
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th>Client / Project</th>
            <th>Completion</th>
            <th>Stage</th>
            <th>Team</th>
            <th>Due</th>
            <th>Actions</th>
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
                <td className="completion-value">{projectProgress(project)}%</td>
                <td><StatusBadge status={project.status} /></td>
                <td><AvatarStack people={people} /></td>
                <td>{project.dueLabel}</td>
                <td>
                  <div className="row-actions">
                    <Link
                      className="icon-btn"
                      to={to(project.id)}
                      title="View project"
                      aria-label={`View ${project.name}`}
                    >
                      <ViewIcon />
                    </Link>
                    {onDelete ? (
                      <button
                        className="icon-btn icon-btn--danger"
                        type="button"
                        title="Delete project"
                        aria-label={`Delete ${project.name}`}
                        onClick={() => setPending(project)}
                      >
                        <TrashIcon />
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {projects.length === 0 ? <p className="empty">{emptyLabel}</p> : null}
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