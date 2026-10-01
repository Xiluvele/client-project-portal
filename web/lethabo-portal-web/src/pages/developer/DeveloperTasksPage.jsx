import { Link } from 'react-router-dom'
import { TASK_LANES, projectProgress } from '../../domain/catalog'
import { PageIntro } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useAppState } from '../../state/useAppState'

export function DeveloperTasksPage() {
  const { user, projects, clients, moveTask } = useAppState()
  const tasks = projects.flatMap((project) => project.tasks
    .filter((task) => task.assigneeId && task.assigneeId === user?.memberId)
    .map((task) => ({ ...task, project })))

  return (
    <>
      <PageIntro title="My tasks" subtitle="Update a task as you work. Project progress recalculates for the client." />
      {tasks.length === 0 ? <Card><p className="empty">No tasks are assigned to you yet.</p></Card> : null}
      <div className="project-list">
        {tasks.map((task) => (
          <Card key={task.id}>
            <div className="project-card__top">
              <div>
                <h2>{task.title}</h2>
                <p className="quiet">{clients.find((item) => item.id === task.project.clientId)?.name} · {task.project.name}</p>
                {task.description ? <p>{task.description}</p> : null}
              </div>
              <strong>{projectProgress(task.project)}%</strong>
            </div>
            <div className="filters">
              {TASK_LANES.map((lane) => (
                <Button key={lane.id} size="small" variant={task.status === lane.id ? 'primary' : 'secondary'} onClick={() => moveTask(task.project.id, task.id, lane.id)}>
                  {lane.label}
                </Button>
              ))}
            </div>
            <Link className="btn btn--secondary" to={`/developer/projects/${task.project.id}`}>Open project files</Link>
          </Card>
        ))}
      </div>
    </>
  )
}
