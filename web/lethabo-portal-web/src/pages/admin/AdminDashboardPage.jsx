import { Link } from 'react-router-dom'
import { PageIntro } from '../../components/layout/AppShell'
import { Card, StatCard } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { projectHealth } from '../../state/metrics'
import { projectProgress } from '../../domain/catalog'
import { useAppState } from '../../state/useAppState'

export function AdminDashboardPage() {
  const { projects, clients, changeRequests } = useAppState()
  const atRisk = projects.filter((project) => projectHealth(project, changeRequests) === 'at_risk')
  return (
    <>
      <PageIntro title="Project health" subtitle="On track or at risk, from progress, overdue tasks, and open change requests." />
      <div className="stat-grid">
        <StatCard dark label="PROJECTS" value={projects.length} hint="Company-wide" hintTone="yellow" />
        <StatCard label="AT RISK" value={atRisk.length} hint="Needs a project manager" hintTone="danger" />
        <StatCard label="ON TRACK" value={projects.length - atRisk.length} hint="No open risk signals" hintTone="green" />
        <StatCard label="OPEN CHANGES" value={changeRequests.filter((item) => ['submitted', 'under_review', 'clarification'].includes(item.status)).length} hint="Waiting on a decision" />
      </div>
      <Card>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Client / Project</th>
                <th>Progress</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const health = projectHealth(project, changeRequests)
                return (
                  <tr key={project.id}>
                    <td>
                      <div className="cell-title">{clients.find((item) => item.id === project.clientId)?.name}</div>
                      <div className="cell-sub">{project.name}</div>
                    </td>
                    <td>{projectProgress(project)}%</td>
                    <td><StatusBadge status={health === 'at_risk' ? 'at_risk' : 'on_track'} label={health === 'at_risk' ? 'At Risk' : 'On Track'} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="quiet">User accounts are managed separately. <Link to="/admin/users">Open user management</Link></p>
      </Card>
    </>
  )
}
