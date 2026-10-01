import { useCallback, useMemo, useState } from 'react'
import { AppStateContext } from './useAppState'
import { teamMembers, cloneSeed } from '../data/seed'
import { createId } from '../lib/format'
import { roleLabel } from '../lib/roles'

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
  const [changeRequests, setChangeRequests] = useState(seed.changeRequests)
  const [requirements, setRequirements] = useState(seed.requirements)
  const [notifications, setNotifications] = useState(seed.notifications)
  const [session, setSession] = useState(() => readSession())

  const record = users.find((item) => item.id === session?.id) ?? null
  const user = record && record.active !== false ? record : null

  const persist = (nextUser) => {
    const safe = publicUser(nextUser)
    setSession(safe)
    if (safe) localStorage.setItem(SESSION_KEY, JSON.stringify(safe))
    else localStorage.removeItem(SESSION_KEY)
  }

  const login = (email, password) => {
    const match = users.find((item) => item.email.toLowerCase() === email.trim().toLowerCase())
    if (!match || match.active === false) {
      return { ok: false, message: match?.active === false
        ? 'This account has been deactivated. Contact an administrator.'
        : 'Email or password does not match our records.' }
    }
    if (match.locked) {
      return { ok: false, message: 'This account is temporarily locked after repeated failed sign-ins.' }
    }
    if (match.password !== password) {
      const failedAttempts = (match.failedAttempts ?? 0) + 1
      const locked = failedAttempts >= 3
      setUsers((current) => current.map((item) => (item.id === match.id ? { ...item, failedAttempts, locked } : item)))
      return {
        ok: false,
        message: locked
          ? 'Too many failed attempts. This account is temporarily locked.'
          : 'Email or password does not match our records.',
      }
    }
    setUsers((current) => current.map((item) => (item.id === match.id ? { ...item, failedAttempts: 0, locked: false } : item)))
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
      active: true,
    }
    setUsers((current) => [...current, next])
    persist(next)
    return { ok: true, user: publicUser(next) }
  }

  const addActivity = useCallback((projectId, text) => {
    setActivities((current) => [{ id: createId('activity'), projectId, text, createdAt: new Date().toISOString(), audience: 'project' }, ...current])
  }, [])

  const notify = (userIds, text, projectId) => {
    const rows = [...new Set(userIds.filter(Boolean))].map((userId) => ({
      id: createId('note'),
      userId,
      projectId,
      text,
      read: false,
      createdAt: new Date().toISOString(),
    }))
    if (rows.length) setNotifications((current) => [...rows, ...current])
  }

  const clientUserIds = (clientId) => users.filter((item) => item.role === 'client' && item.clientId === clientId && item.active !== false).map((item) => item.id)
  const managerIds = () => users.filter((item) => item.role === 'manager' && item.active !== false).map((item) => item.id)

  const createProject = ({ clientId, name, service, dueLabel, memberIds, description }) => {
    if (!clientId || !name?.trim()) return null
    const project = {
      id: createId('project'),
      clientId,
      name: name.trim(),
      service: service.trim() || name.trim(),
      status: 'in_progress',
      stage: 'discovery',
      startedLabel: new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' }),
      dueLabel: (dueLabel || '').trim() || 'Not set',
      dueThisWeek: false,
      progress: 8,
      memberIds,
      description: (description || '').trim(),
      milestones: [],
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
    const project = projects.find((item) => item.id === projectId)
    const task = project?.tasks.find((item) => item.id === taskId)
    setProjects((current) =>
      current.map((item) => {
        if (item.id !== projectId) return item
        return {
          ...item,
          tasks: item.tasks.map((entry) => (entry.id === taskId ? { ...entry, status } : entry)),
        }
      }),
    )
    if (task && project) {
      addActivity(projectId, `${task.title} is now ${status === 'backlog' ? 'To Do' : status.replace('_', ' ')}`)
      notify(clientUserIds(project.clientId), `${project.name} progress was updated.`, projectId)
    }
  }

  const addTask = (projectId, { title, description, dueLabel, assigneeId }) => {
    const project = projects.find((item) => item.id === projectId)
    const task = {
      id: createId('task'),
      title: title.trim(),
      description: description.trim(),
      dueLabel: dueLabel.trim() || 'No date',
      type: 'dev',
      status: 'backlog',
      assigneeId: assigneeId || null,
    }
    setProjects((current) => current.map((item) => (item.id === projectId ? { ...item, tasks: [task, ...item.tasks] } : item)))
    if (!assigneeId) {
      addActivity(projectId, `Unassigned task added: ${task.title}`)
      return task
    }
    const developer = users.find((item) => item.role === 'developer' && (item.memberId || item.id) === assigneeId)
    addActivity(projectId, `${task.title} assigned to ${developer?.name ?? 'a developer'}`)
    notify(developer ? [developer.id] : [], `You were assigned “${task.title}” on ${project?.name ?? 'a project'}.`, projectId)
    return task
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
    if (user.role === 'client') notify(managerIds(), `${comment.authorName} left feedback.`, projectId)
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

  const addFile = (projectId, { name, kind, description }) => {
    const project = projects.find((item) => item.id === projectId)
    const cleanName = name.trim()
    const existing = project?.files.filter((file) => file.name.toLowerCase() === cleanName.toLowerCase()) ?? []
    const version = existing.reduce((max, file) => Math.max(max, file.version || 1), 0) + (existing.length ? 1 : 0) || 1
    const file = {
      id: createId('file'),
      name: cleanName,
      kind,
      description: (description || '').trim(),
      version: existing.length ? version : 1,
      uploadedBy: user?.name?.split(' ')[0] ?? 'Team',
      createdAt: new Date().toISOString(),
      approval: 'pending',
    }
    setProjects((current) =>
      current.map((item) => (item.id === projectId ? { ...item, files: [file, ...item.files] } : item)),
    )
    addActivity(projectId, `${file.uploadedBy} uploaded ${file.name} v${file.version}`)
    if (project) notify(clientUserIds(project.clientId), `A new file was shared on ${project.name}.`, projectId)
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
    notify(managerIds(), `${client?.name ?? 'A client'} approved ${fileName}.`, projectId)
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
    notify(clientUserIds(clientId), `Invoice ${number} is ready to view.`, projectId)
    return invoice
  }

  const updateInvoice = (invoiceId, patch) => {
    const invoice = invoices.find((item) => item.id === invoiceId)
    if (!invoice || invoice.status === 'paid') return { ok: false, message: 'Paid invoices cannot be changed.' }
    setInvoices((current) => current.map((item) => (item.id === invoiceId ? { ...item, ...patch } : item)))
    return { ok: true }
  }

  const cancelInvoice = (invoiceId) => {
    const invoice = invoices.find((item) => item.id === invoiceId)
    if (!invoice || invoice.status === 'paid' || invoice.status === 'cancelled') return
    setInvoices((current) => current.map((item) => (item.id === invoiceId ? { ...item, status: 'cancelled' } : item)))
    addActivity(invoice.projectId, `Invoice ${invoice.number} was cancelled`)
    notify(clientUserIds(invoice.clientId), `Invoice ${invoice.number} was cancelled.`, invoice.projectId)
  }

  const remindInvoice = (invoiceId) => {
    const invoice = invoices.find((item) => item.id === invoiceId)
    if (!invoice || invoice.status === 'paid') return
    setInvoices((current) => current.map((item) => (item.id === invoiceId ? { ...item, reminded: true } : item)))
    const client = clients.find((item) => item.id === invoice.clientId)
    addActivity(invoice.projectId, `Payment reminder sent to ${client?.name ?? 'the client'} for ${invoice.number}`)
  }

  const addMilestone = (projectId, { name, targetLabel }) => {
    if (!name?.trim()) return { ok: false, message: 'Enter a milestone name.' }
    const milestone = { id: createId('mile'), name: name.trim(), targetLabel: (targetLabel || '').trim(), status: 'planned' }
    setProjects((current) => current.map((project) => (
      project.id === projectId ? { ...project, milestones: [...(project.milestones ?? []), milestone] } : project
    )))
    addActivity(projectId, `Milestone added: ${milestone.name}`)
    return { ok: true }
  }

  const completeMilestone = (projectId, milestoneId) => {
    let label = 'Milestone'
    setProjects((current) => current.map((project) => {
      if (project.id !== projectId) return project
      const milestones = (project.milestones ?? []).map((item) => {
        if (item.id !== milestoneId) return item
        label = item.name
        return { ...item, status: 'complete' }
      })
      return { ...project, milestones }
    }))
    addActivity(projectId, `${label} marked complete`)
  }

  const addRequirement = (projectId, text) => {
    const project = projects.find((item) => item.id === projectId)
    if (!text?.trim() || !project) return { ok: false, message: 'Enter the requirement.' }
    const requirement = { id: createId('req'), projectId, text: text.trim(), status: 'recorded' }
    setRequirements((current) => [...current, requirement])
    addActivity(projectId, `Requirement recorded: ${requirement.text}`)
    notify(clientUserIds(project.clientId), `A requirement on ${project.name} is ready for you to confirm.`, projectId)
    return { ok: true }
  }

  const setRequirementStatus = (requirementId, status) => {
    const requirement = requirements.find((item) => item.id === requirementId)
    if (!requirement) return
    setRequirements((current) => current.map((item) => (item.id === requirementId ? { ...item, status } : item)))
    addActivity(requirement.projectId, `Requirement ${status}: ${requirement.text}`)
    if (status === 'disputed') notify(managerIds(), `A client disputed a requirement: ${requirement.text}`, requirement.projectId)
  }

  const submitChangeRequest = (projectId, description) => {
    if (!description?.trim()) return { ok: false, message: 'Describe the change before submitting.' }
    const project = projects.find((item) => item.id === projectId)
    const request = {
      id: createId('change'),
      projectId,
      clientId: user?.clientId,
      description: description.trim(),
      status: 'submitted',
      createdAt: new Date().toISOString(),
    }
    setChangeRequests((current) => [request, ...current])
    addActivity(projectId, `Change request submitted on ${project?.name ?? 'a project'}`)
    notify(managerIds(), `${user?.name ?? 'A client'} submitted a change request on ${project?.name ?? 'a project'}.`, projectId)
    return { ok: true }
  }

  const decideChangeRequest = (requestId, status) => {
    const request = changeRequests.find((item) => item.id === requestId)
    if (!request) return
    setChangeRequests((current) => current.map((item) => (item.id === requestId ? { ...item, status } : item)))
    addActivity(request.projectId, `Change request marked ${status.replace('_', ' ')}`)
    notify(clientUserIds(request.clientId), `Your change request was updated: ${status.replace('_', ' ')}.`, request.projectId)
  }

  const saveAccount = ({ id, name, email, role, title, password, company }) => {
    const normalised = email.trim().toLowerCase()
    if (users.some((item) => item.email.toLowerCase() === normalised && item.id !== id)) {
      return { ok: false, message: 'An account with that email already exists.' }
    }
    if (!name.trim() || !normalised || !role) return { ok: false, message: 'Name, email, and role are required.' }
    if (id) {
      setUsers((current) => current.map((item) => (item.id === id ? {
        ...item,
        name: name.trim(),
        email: normalised,
        role,
        title: title.trim() || roleLabel(role),
        password: password.trim() || item.password,
      } : item)))
      return { ok: true }
    }
    let clientId = null
    if (role === 'client') {
      if (!company?.trim()) return { ok: false, message: 'A client account needs a company name.' }
      clientId = createId('client')
      setClients((current) => [...current, { id: clientId, name: company.trim(), contact: name.trim(), email: normalised }])
    }
    const next = {
      id: createId('user'),
      name: name.trim(),
      email: normalised,
      password: password.trim() || 'connect123',
      role,
      clientId,
      memberId: role === 'developer' ? null : null,
      title: title.trim() || (role === 'client' ? company.trim() : roleLabel(role)),
      active: true,
    }
    if (role === 'developer') next.memberId = next.id
    setUsers((current) => [...current, next])
    return { ok: true }
  }

  const setAccountActive = (userId, active) => {
    if (userId === user?.id) return { ok: false, message: 'You cannot deactivate the account you are using.' }
    setUsers((current) => current.map((item) => (item.id === userId ? { ...item, active, locked: active ? item.locked : true } : item)))
    return { ok: true }
  }

  const markNotificationRead = (notificationId) => {
    setNotifications((current) => current.map((item) => (item.id === notificationId ? { ...item, read: true } : item)))
  }

  const value = {
    user: publicUser(user),
    users,
    clients,
    projects,
    invoices,
    activities,
    changeRequests,
    requirements,
    notifications,
    members: teamMembers,
    login,
    logout,
    register,
    createProject,
    updateProject,
    moveTask,
    addTask,
    addComment,
    markProjectCommentsRead,
    addFile,
    approveFile,
    createInvoice,
    updateInvoice,
    cancelInvoice,
    remindInvoice,
    addMilestone,
    completeMilestone,
    addRequirement,
    setRequirementStatus,
    submitChangeRequest,
    decideChangeRequest,
    saveAccount,
    setAccountActive,
    markNotificationRead,
  }

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}
