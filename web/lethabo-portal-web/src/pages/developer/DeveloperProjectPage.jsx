import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { projectProgress } from '../../domain/catalog'
import { PageIntro } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SelectField, TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { ActivityHistory } from '../../components/project/ProjectControls'
import { CommentThread, FileList } from '../../components/project/ProjectWidgets'
import { useAppState } from '../../state/useAppState'

export function DeveloperProjectPage() {
  const { projectId } = useParams()
  const { user, projects, clients, addFile } = useAppState()
  const project = projects.find((item) => item.id === projectId && (item.memberIds.includes(user?.memberId) || item.tasks.some((task) => task.assigneeId === user?.memberId)))
  const [uploading, setUploading] = useState(false)

  if (!project) {
    return <PageIntro title="Project not available" subtitle="You can only open projects you are assigned to." actions={<Link to="/developer/tasks">Back to my tasks</Link>} />
  }

  const submitFile = (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    addFile(project.id, { name: data.get('name'), kind: data.get('kind'), description: data.get('description') })
    setUploading(false)
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
      <Modal title="Upload file" open={uploading} onClose={() => setUploading(false)}>
        <form className="stack" onSubmit={submitFile}>
          <TextField label="File name" name="name" required placeholder="Homepage_v4.fig" />
          <TextField label="Description" name="description" placeholder="What changed in this version" />
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
