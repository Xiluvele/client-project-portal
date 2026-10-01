import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PROJECT_STATUSES, STAGES, projectProgress } from '../../domain/catalog'
import { PageIntro } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SelectField, TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { CommentThread, FileList, TaskBoard } from '../../components/project/ProjectWidgets'
import { useAppState } from '../../state/useAppState'

export function ProjectWorkspacePage() {
  const { projectId } = useParams()
  const { projects, clients, updateProject, addFile, markProjectCommentsRead } = useAppState()
  const project = projects.find((item) => item.id === projectId)
  const client = clients.find((item) => item.id === project?.clientId)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (projectId) markProjectCommentsRead(projectId)
  }, [projectId, markProjectCommentsRead])

  if (!project) {
    return (
      <PageIntro title="Project not found" subtitle="That project is not on the team workspace." actions={<Link to="/team/projects">Back to projects</Link>} />
    )
  }

  const progress = projectProgress(project)
  const submitFile = (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    addFile(project.id, { name: data.get('name'), kind: data.get('kind') })
    setUploading(false)
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
            <Button variant="secondary" onClick={() => setUploading(true)}>Upload Design</Button>
            <Link className="btn btn--primary" to={`/team/invoices?project=${project.id}`}>Send Invoice</Link>
          </>
        )}
      />
      <div className="filters">
        <SelectField aria-label="Project status" value={project.status} onChange={(event) => updateProject(project.id, { status: event.target.value })}>
          {PROJECT_STATUSES.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
        </SelectField>
        <SelectField aria-label="Milestone" value={project.stage} onChange={(event) => updateProject(project.id, { stage: event.target.value })}>
          {STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
        </SelectField>
      </div>
      {project.tasks.length ? <TaskBoard project={project} /> : <Card><p className="empty">No tasks on this project yet. Status and milestone still update the client view.</p></Card>}
      <div className="split">
        <Card>
          <div className="section-head"><h2>Files & Designs</h2></div>
          <FileList project={project} />
        </Card>
        <Card>
          <div className="section-head"><h2>Client Comments</h2></div>
          <CommentThread project={project} />
        </Card>
      </div>
      <Modal title="Upload design" open={uploading} onClose={() => setUploading(false)}>
        <form className="stack" onSubmit={submitFile}>
          <TextField label="File name" name="name" required placeholder="Homepage_v4.fig" />
          <SelectField label="Type" name="kind" defaultValue="Fig">
            <option>Fig</option>
            <option>PDF</option>
            <option>PNG</option>
          </SelectField>
          <Button type="submit">Add to project</Button>
        </form>
      </Modal>
    </>
  )
}
