import { Link } from 'react-router-dom'
import { projectProgress } from '../../domain/catalog'
import { Card, ProgressBar } from '../ui/Card'
import { StatusBadge } from '../ui/StatusBadge'
import { MilestoneTrack } from './MilestoneTrack'

export function ClientProjectCard({ project }) {
  const progress = projectProgress(project)
  return (
    <Card className="project-card">
      <div className="project-card__top">
        <div>
          <h2>{project.name}</h2>
          <p className="quiet">{project.service} · Due {project.dueLabel}</p>
        </div>
        <StatusBadge status={project.status} />
      </div>
      <div className="progress-pill">
        <strong>{progress}%</strong>
        <span>Overall progress</span>
      </div>
      <ProgressBar value={progress} />
      <MilestoneTrack stage={project.stage} milestones={project.milestones} />
      <Link className="btn btn--secondary" to={`/client/projects/${project.id}`}>Open project</Link>
    </Card>
  )
}
