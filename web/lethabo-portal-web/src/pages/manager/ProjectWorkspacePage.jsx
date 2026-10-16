import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PROJECT_STATUSES } from '../../domain/catalog'
import { readPreview } from '../../lib/filePreview'
import { PageIntro } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { SelectField, TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { ProjectBrief } from '../../components/project/ProjectBrief'
import { FilePreview } from '../../components/project/ProjectWidgets'
import { NewTaskModal } from '../../components/project/ProjectControls'
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

  const submitFile = async (event) => {
    event.preventDefault()
    if (!preview?.name) {
      setUploadError('Choose a document or photo first.')
      return
    }
    const data = new FormData(event.currentTarget)
    const result = await addFile(project.id, {
      name: preview.name,
      kind: preview.kind,
      description: data.get('description'),
      previewUrl: preview.previewUrl,
    })
    if (result && result.ok === false) {
      setUploadError(result.message)
      return
    }
    closeUpload()
  }

  return (
    <>
      <PageIntro
        eyebrow={<Link to="/team/projects">Projects</Link>}
        title={project.name}
        meta={<><span>{client?.name}</span><span>Started {project.startedLabel}</span><span>Due {project.dueLabel}</span></>}
        actions={(
          <SelectField aria-label="Project status" value={project.status} onChange={(event) => updateProject(project.id, { status: event.target.value })}>
            {PROJECT_STATUSES.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
          </SelectField>
        )}
      />
      <ProjectBrief project={project} onNewTask={() => setAddingTask(true)} onUpload={() => setUploading(true)} />
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
