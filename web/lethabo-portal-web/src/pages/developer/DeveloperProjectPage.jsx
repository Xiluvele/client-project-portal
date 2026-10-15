import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { projectProgress } from '../../domain/catalog'
import { readPreview } from '../../lib/filePreview'
import { PageIntro } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { ActivityHistory } from '../../components/project/ProjectControls'
import { CommentThread, FileList, FilePreview } from '../../components/project/ProjectWidgets'
import { useAppState } from '../../state/useAppState'

export function DeveloperProjectPage() {
  const { projectId } = useParams()
  const { user, projects, clients, addFile } = useAppState()
  const project = projects.find((item) => item.id === projectId && (item.memberIds.includes(user?.memberId) || item.tasks.some((task) => task.assigneeId === user?.memberId)))
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [uploadError, setUploadError] = useState('')

  if (!project) {
    return <PageIntro title="Project not available" subtitle="You can only open projects you are assigned to." actions={<Link to="/developer/tasks">Back to my tasks</Link>} />
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
        eyebrow={<Link to="/developer/tasks">My tasks</Link>}
        title={project.name}
        subtitle={clients.find((item) => item.id === project.clientId)?.name}
        actions={<div className="progress-pill"><strong>{projectProgress(project)}%</strong><span>Overall progress</span></div>}
      />
      <div className="page-head__actions" style={{ marginBottom: 14 }}>
        <Button onClick={() => setUploading(true)}>Upload file</Button>
      </div>
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
