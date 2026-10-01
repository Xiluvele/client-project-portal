import { Link, useParams } from 'react-router-dom'
import { projectProgress } from '../../domain/catalog'
import { PageIntro } from '../../components/layout/AppShell'
import { Card, ProgressBar } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { MilestoneTrack } from '../../components/project/MilestoneTrack'
import { CommentThread, FileList } from '../../components/project/ProjectWidgets'
import { ActivityHistory, ChangeRequestPanel, RequirementPanel } from '../../components/project/ProjectControls'
import { useAppState } from '../../state/useAppState'

export function ClientProjectPage() {
  const { projectId } = useParams()
  const { user, projects } = useAppState()
  const project = projects.find((item) => item.id === projectId && item.clientId === user?.clientId)

  if (!project) {
    return <PageIntro title="Project not available" subtitle="This project is not on your account." actions={<Link to="/client/projects">Back to your projects</Link>} />
  }

  const progress = projectProgress(project)
  return (
    <>
      <PageIntro
        eyebrow={<Link to="/client/projects">Your projects</Link>}
        title={project.name}
        subtitle={project.service}
        meta={<><StatusBadge status={project.status} /><span>Due {project.dueLabel}</span></>}
        actions={(
          <div className="progress-pill">
            <strong>{progress}%</strong>
            <span>Overall progress</span>
          </div>
        )}
      />
      <Card>
        <ProgressBar value={progress} />
        <MilestoneTrack stage={project.stage} milestones={project.milestones} />
      </Card>
      <div className="split">
        <RequirementPanel project={project} canConfirm />
        <ChangeRequestPanel project={project} canSubmit />
      </div>
      <div className="split">
        <ActivityHistory projectId={project.id} />
      </div>
      <div className="split">
        <Card>
          <div className="section-head"><h2>Designs & files</h2></div>
          <p className="quiet">Approve a file to leave a timestamped sign-off for the team.</p>
          <FileList project={project} canApprove />
        </Card>
        <Card>
          <div className="section-head"><h2>Comments</h2></div>
          <CommentThread project={project} />
        </Card>
      </div>
    </>
  )
}
