import { useMemo, useState } from 'react'
import { PROJECT_STATUSES } from '../domain/catalog'

export function useProjectFilters(projects, clients = []) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return projects.filter((project) => {
      const client = clients.find((item) => item.id === project.clientId)
      const haystack = `${project.name} ${project.service} ${client?.name ?? ''}`.toLowerCase()
      const matchesStatus = status === 'all' || project.status === status
      return matchesStatus && (!needle || haystack.includes(needle))
    })
  }, [projects, clients, query, status])
  return { query, setQuery, status, setStatus, filtered, statuses: PROJECT_STATUSES }
}
