import { useCallback, useMemo, useState } from 'react'
import { AppStateContext } from './useAppState'
import { teamMembers, cloneSeed } from '../data/seed'
import { createId } from '../lib/format'

const SESSION_KEY = 'lethabo-connect-session'

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function publicUser(user) {
  if (!user) return null
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    clientId: user.clientId ?? null,
    memberId: user.memberId ?? null,
    title: user.title ?? '',
  }
}

export function AppStateProvider({ children }) {
  const seed = useMemo(() => cloneSeed(), [])
  const [users, setUsers] = useState(seed.users)
  const [clients, setClients] = useState(seed.clients)
  const [projects, setProjects] = useState(seed.projects)
  const [invoices, setInvoices] = useState(seed.invoices)
  const [activities, setActivities] = useState(seed.activities)
  const [session, setSession] = useState(() => readSession())

  const user = users.find((item) => item.id === session?.id) ?? null

  const persist = (nextUser) => {
    const safe = publicUser(nextUser)
    setSession(safe)
    if (safe) localStorage.setItem(SESSION_KEY, JSON.stringify(safe))
    else localStorage.removeItem(SESSION_KEY)
  }

  const login = (email, password) => {
    const match = users.find(
      (item) => item.email.toLowerCase() === email.trim().toLowerCase() && item.password === password,
    )
    if (!match) return { ok: false, message: 'Email or password does not match our records.' }
    persist(match)
    return { ok: true, user: publicUser(match) }
  }

  const logout = () => persist(null)

  const register = ({ name, email, password, role, company, title }) => {
    const normalised = email.trim().toLowerCase()
    if (users.some((item) => item.email.toLowerCase() === normalised)) {
      return { ok: false, message: 'An account with that email already exists.' }
    }

    let clientId = null
    if (role === 'client') {
      clientId = createId('client')
      setClients((current) => [
        ...current,
        { id: clientId, name: company.trim(), contact: name.trim(), email: normalised },
      ])
    }

    const next = {
      id: createId('user'),
      name: name.trim(),
      email: normalised,
      password,
      role,
      clientId,
      memberId: null,
      title: role === 'client' ? company.trim() : title.trim(),
    }
    setUsers((current) => [...current, next])
    persist(next)
    return { ok: true, user: publicUser(next) }
  }

  const addActivity = useCallback((projectId, text) => {
    setActivities((current) => [{ id: createId('activity'), projectId, text, createdAt: new Date().toISOString() }, ...current])
  }, [])

  const createProject = ({ clientId, name, service, dueLabel, memberIds }) => {
    const project = {
      id: createId('project'),
      clientId,
      name: name.trim(),
      service: service.trim() || name.trim(),
      status: 'in_progress',
      stage: 'discovery',
      startedLabel: new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' }),
      dueLabel: dueLabel.trim() || 'Not set',
      dueThisWeek: false,
      progress: 8,
      memberIds,
      tasks: [],
      files: [],
      comments: [],
    }
    setProjects((current) => [project, ...current])
    const client = clients.find((item) => item.id === clientId)
    addActivity(project.id, `${client?.name ?? 'A client'} was added to ${project.name}`)
    return project
  }

  const updateProject = (projectId, patch) => {
    setProjects((current) => current.map((project) => (project.id === projectId ? { ...project, ...patch } : project)))
  }

  const moveTask = (projectId, taskId, status) => {
    setProjects((current) =>
      current.map((project) => {
        if (project.id !== projectId) return project
        return {
          ...project,
          tasks: project.tasks.map((task) => (task.id === taskId ? { ...task, status } : task)),
        }
      }),
    )
  }

  const addComment = (projectId, body) => {
    if (!user) return
    const comment = {
      id: createId('comment'),
      authorName: user.role === 'client' ? clients.find((item) => item.id === user.clientId)?.name ?? user.name : user.name,
      initials: user.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase(),
      role: user.role === 'client' ? 'client' : 'team',
      body: body.trim(),
      createdAt: new Date().toISOString(),
      read: user.role !== 'client',
    }
    setProjects((current) =>
      current.map((project) => (project.id === projectId ? { ...project, comments: [...project.comments, comment] } : project)),
    )
    addActivity(projectId, `${comment.authorName} left a comment`)
  }

  const markProjectCommentsRead = useCallback((projectId) => {
    setProjects((current) => {
      const project = current.find((item) => item.id === projectId)
      if (!project?.comments.some((comment) => comment.role === 'client' && !comment.read)) return current
      return current.map((item) =>
        item.id === projectId
          ? { ...item, comments: item.comments.map((comment) => (comment.role === 'client' ? { ...comment, read: true } : comment)) }
          : item,
      )
    })
  }, [])

  const addFile = (projectId, { name, kind }) => {
    const file = {
      id: createId('file'),
      name: name.trim(),
      kind,
      uploadedBy: user?.name?.split(' ')[0] ?? 'Team',
      createdAt: new Date().toISOString(),
      approval: 'pending',
    }
    setProjects((current) =>
      current.map((project) => (project.id === projectId ? { ...project, files: [file, ...project.files] } : project)),
    )
    addActivity(projectId, `${file.uploadedBy} uploaded ${file.name}`)
  }

  const approveFile = (projectId, fileId) => {
    let fileName = 'a file'
    setProjects((current) =>
      current.map((project) => {
        if (project.id !== projectId) return project
        return {
          ...project,
          files: project.files.map((file) => {
            if (file.id !== fileId) return file
            fileName = file.name
            return { ...file, approval: 'approved' }
          }),
        }
      }),
    )
    const client = clients.find((item) => item.id === user?.clientId)
    addActivity(projectId, `${client?.name ?? user?.name ?? 'Client'} approved ${fileName}`)
  }

  const createInvoice = ({ clientId, projectId, dueLabel, items }) => {
    const number = `INV${230 + invoices.length + 1}`
    const invoice = {
      id: createId('invoice'),
      number,
      clientId,
      projectId,
      title: items[0]?.description || 'Invoice',
      status: 'pending',
      issuedLabel: new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' }),
      dueLabel,
      items: items.map((item) => ({ ...item, id: createId('line'), amount: Number(item.amount) })),
    }
    setInvoices((current) => [invoice, ...current])
    const client = clients.find((item) => item.id === clientId)
    addActivity(projectId, `Invoice ${number} was sent to ${client?.name ?? 'the client'}`)
    return invoice
  }

  const remindInvoice = (invoiceId) => {
    const invoice = invoices.find((item) => item.id === invoiceId)
    if (!invoice || invoice.status === 'paid') return
    setInvoices((current) => current.map((item) => (item.id === invoiceId ? { ...item, reminded: true } : item)))
    const client = clients.find((item) => item.id === invoice.clientId)
    addActivity(invoice.projectId, `Payment reminder sent to ${client?.name ?? 'the client'} for ${invoice.number}`)
  }

  const value = {
    user: publicUser(user),
    users,
    clients,
    projects,
    invoices,
    activities,
    members: teamMembers,
    login,
    logout,
    register,
    createProject,
    updateProject,
    moveTask,
    addComment,
    markProjectCommentsRead,
    addFile,
    approveFile,
    createInvoice,
    remindInvoice,
  }

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}
