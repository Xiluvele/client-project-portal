import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PROJECT_STATUSES, projectProgress } from '../../domain/catalog'
import { readPreview } from '../../lib/filePreview'
import { PageIntro } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SelectField, TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { CommentThread, FileList, FilePreview, TaskBoard } from '../../components/project/ProjectWidgets'
import { ActivityHistory, ChangeRequestPanel, MilestonePanel, NewTaskModal, RequirementPanel } from '../../components/project/ProjectControls'
import { useAppState } from '../../state/useAppState'

export function ProjectWorkspacePage() {
  const { projectId } = useParams()
  const { projects, clients, updateProject, addFile, markProjectCommentsRead } = useAppState()
  const project = projects.find((item) => item.id === projectId)
  const client = clients.find((item) => item.id === project?.clientId)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const [addingTask, setAddingTask] = useState(false)

  useEffect(() => {
    if (projectId) markProjectCommentsRead(projectId)
  }, [projectId, markProjectCommentsRead])

  if (!project) {
    return (
      <PageIntro title="Project not found" subtitle="That project is not on the team workspace." actions={<Link to="/team/projects">Back to projects</Link>} />
    )
  }

  const progress = projectProgress(project)
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
        eyebrow={<Link to="/team/projects">Projects</Link>}
        title={project.name}
        meta={<><span>{client?.name}</span><span>Started {project.startedLabel}</span><span>Due {project.dueLabel}</span></>}
        actions={(
          <>
            <div className="progress-pill">
              <strong>{progress}%</strong>
              <span>Overall Progress</span>
            </div>
            <Button variant="secondary" onClick={() => setAddingTask(true)}>New task</Button>
            <Button variant="secondary" onClick={() => setUploading(true)}>Upload file</Button>
            <Link className="btn btn--primary" to={`/team/invoices?project=${project.id}`}>Create invoice</Link>
          </>
        )}
      />
      <div className="filters">
        <SelectField aria-label="Project status" value={project.status} onChange={(event) => updateProject(project.id, { status: event.target.value })}>
          {PROJECT_STATUSES.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
        </SelectField>
      </div>
      <section className="overview">
        <h2 className="overview__title">Project overview</h2>
        <div className="overview-grid">
          <Card>
            <div className="section-head"><h2>Client comments</h2></div>
            <CommentThread project={project} />
          </Card>
          <ActivityHistory projectId={project.id} />
          <MilestonePanel project={project} />
          <RequirementPanel project={project} canRecord />
        </div>
      </section>
      {project.tasks.length ? <TaskBoard project={project} /> : <Card><p className="empty">No tasks on this project yet.</p></Card>}
      <div className="split">
        <ChangeRequestPanel project={project} canDecide />
        <Card>
          <div className="section-head"><h2>Files & Designs</h2></div>
          <FileList project={project} />
        </Card>
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
      <NewTaskModal project={project} open={addingTask} onClose={() => setAddingTask(false)} />
    </>
  )
}
