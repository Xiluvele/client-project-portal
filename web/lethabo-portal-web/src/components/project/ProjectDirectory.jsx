import { Card } from '../ui/Card'
import { SearchField } from '../ui/Fields'
import { PageIntro } from '../layout/AppShell'
import { cx } from '../../lib/format'
import { useProjectFilters } from '../../state/useProjectFilters'
import { ProjectTable } from './ProjectWidgets'

export function ProjectDirectory({
  projects,
  clients,
  members,
  title,
  subtitle,
  to,
  onDelete,
  actions,
  searchPlaceholder = 'Search projects',
  emptyLabel = 'No projects match this view.',
}) {
  const { query, setQuery, status, setStatus, filtered, statuses } = useProjectFilters(projects, clients)
  const empty = projects.length === 0 ? emptyLabel : 'No projects match this view.'

  return (
    <>
      <PageIntro
        title={title}
        subtitle={subtitle}
        actions={(
          <>
            <SearchField value={query} onChange={setQuery} placeholder={searchPlaceholder} />
            {actions}
          </>
        )}
      />
      <div className="filters" role="group" aria-label="Filter by status">
        <button type="button" className={cx('chip', status === 'all' && 'is-active')} onClick={() => setStatus('all')}>All</button>
        {statuses.map((item) => (
          <button key={item.id} type="button" className={cx('chip', status === item.id && 'is-active')} onClick={() => setStatus(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <Card>
        <ProjectTable projects={filtered} clients={clients} members={members} to={to} onDelete={onDelete} emptyLabel={empty} />
      </Card>
    </>
  )
}
