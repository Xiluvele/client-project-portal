import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CHANGE_STATUSES, projectProgress } from '../../domain/catalog'
import { readPreview } from '../../lib/filePreview'
import { formatRelative } from '../../lib/format'
import { PageIntro } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { ActivityHistory } from '../../components/project/ProjectControls'
import { CommentThread, FileList, FilePreview } from '../../components/project/ProjectWidgets'
import { useAppState } from '../../state/useAppState'

export function DeveloperProjectPage() {
  const { projectId } = useParams()
  const { user, projects, clients, addFile, changeRequests } = useAppState()
  const project = projects.find((item) => item.id === projectId && (item.memberIds.includes(user?.memberId) || item.tasks.some((task) => task.assigneeId === user?.memberId)))
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const [requestPreview, setRequestPreview] = useState(null)
  const requests = changeRequests.filter((item) => item.projectId === project?.id)

  if (!project) {
    return <PageIntro title="Project not available" subtitle="You can only open projects you are assigned to." actions={<Link to="/developer/projects">Back to projects</Link>} />
  }

  const closeUpload = () => {
    setUploading(false)
    setPreview(null)
    setUploadError('')
  }

  const onUploadFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      setPreview(null)
      return
    }
    try {
      setPreview(await readPreview(file))
      setUploadError('')
    } catch (error) {
      setPreview(null)
      setUploadError(error.message)
    }
  }

  const submitFile = (event) => {
    event.preventDefault()
    if (!preview?.name) {
      setUploadError('Choose a document or photo first.')
      return
    }
    const data = new FormData(event.currentTarget)
    addFile(project.id, {
      name: preview.name,
      kind: preview.kind,
      description: data.get('description'),
      previewUrl: preview.previewUrl,
    })
    closeUpload()
  }

  return (
    <>
      <PageIntro
        eyebrow={<Link to="/developer/projects">Projects</Link>}
        title={project.name}
        subtitle={clients.find((item) => item.id === project.clientId)?.name}
        actions={<div className="progress-pill"><strong>{projectProgress(project)}%</strong><span>Overall progress</span></div>}
      />
      <div className="page-head__actions" style={{ marginBottom: 14 }}>
        <Button onClick={() => setUploading(true)}>Upload file</Button>
      </div>
      <Card className="change-requests">
        <div className="section-head"><h2>Change requests</h2></div>
        {requests.length === 0 ? <p className="empty">No change requests on this project.</p> : null}
        {requests.map((request) => (
          <div className="file-row" key={request.id}>
            <div className="file-copy">
              <strong>{request.description}</strong>
              <small>
                {project.tasks.find((task) => task.id === request.taskId)?.title ?? 'Task not linked'}
                {' · '}
                {formatRelative(request.createdAt)}
                {request.attachment?.name ? ` · ${request.attachment.name}` : ''}
              </small>
            </div>
            {request.attachment?.previewUrl ? (
              <Button size="small" variant="secondary" onClick={() => setRequestPreview(request.attachment)}>Preview</Button>
            ) : null}
            <StatusBadge status={request.status} label={CHANGE_STATUSES.find((status) => status.id === request.status)?.label} />
          </div>
        ))}
      </Card>
      <div className="split">
        <Card>
          <div className="section-head"><h2>Files & designs</h2></div>
          <FileList project={project} />
        </Card>
        <Card>
          <div className="section-head"><h2>Comments</h2></div>
          <CommentThread project={project} />
        </Card>
      </div>
      <div className="split">
        <ActivityHistory projectId={project.id} />
      </div>
      <Modal title={requestPreview?.name || 'Preview'} open={Boolean(requestPreview)} onClose={() => setRequestPreview(null)}>
        <div className="preview-stage">
          {requestPreview?.previewUrl ? <FilePreview file={requestPreview} large /> : <p className="empty">This file has no preview stored.</p>}
        </div>
      </Modal>
      <Modal title="Upload file" open={uploading} onClose={closeUpload}>
        <form className="stack" onSubmit={submitFile}>
          <div className="field">
            <span className="field__label">Document or photo</span>
            <input className="field__control" type="file" accept="image/*,.pdf,.doc,.docx" onChange={onUploadFile} />
            {uploadError ? <span className="field__error">{uploadError}</span> : null}
            {preview ? (
              <div className="upload-preview">
                <FilePreview file={preview} large />
                <small>{preview.name}</small>
              </div>
            ) : null}
          </div>
          <TextField label="Note" name="description" placeholder="What changed in this version" />
          <Button type="submit">Add to project</Button>
        </form>
      </Modal>
    </>
  )
}
