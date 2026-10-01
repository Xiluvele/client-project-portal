import { PageIntro } from '../../components/layout/AppShell'
import { Avatar } from '../../components/ui/Avatar'
import { Card } from '../../components/ui/Card'
import { useAppState } from '../../state/useAppState'

export function TeamPage() {
  const { members, projects } = useAppState()
  return (
    <>
      <PageIntro title="Team" subtitle="Developers, designers, and content — the people assigned across client work." />
      <div className="team-grid">
        {members.map((member) => {
          const assigned = projects.filter((project) => project.memberIds.includes(member.id) && project.status !== 'done')
          return (
            <Card key={member.id}>
              <div className="person">
                <Avatar initials={member.initials} size="lg" />
                <div>
                  <strong>{member.name}</strong>
                  <span>{member.role}</span>
                </div>
              </div>
              <p>{assigned.length} active project{assigned.length === 1 ? '' : 's'}</p>
              <p className="quiet">{member.allocated ? 'Allocated this week' : 'Available'}</p>
            </Card>
          )
        })}
      </div>
    </>
  )
}
