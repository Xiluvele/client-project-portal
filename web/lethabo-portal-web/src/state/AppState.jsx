import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppStateContext } from './useAppState'
import { teamMembers, cloneSeed } from '../data/seed'
import { createId } from '../lib/format'
import { emailSignInCode } from '../lib/mailCode'
import { assessOtp, createOtpChallenge } from '../lib/otp'
import { roleLabel } from '../lib/roles'
import { addDaysISO, dateLabel, effectiveStatus, todayISO } from '../lib/invoiceDates'

const SESSION_KEY = 'lethabo-connect-session'
const USERS_KEY = 'lethabo-connect-users'
const CLIENTS_KEY = 'lethabo-connect-clients'

function readStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const saved = JSON.parse(raw)
    if (!Array.isArray(saved)) return fallback
    const byId = new Map(fallback.map((item) => [item.id, item]))
    saved.forEach((item) => {
      if (item?.id) byId.set(item.id, { ...(byId.get(item.id) ?? {}), ...item })
    })
    return [...byId.values()]
  } catch {
    return fallback
  }
}

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
  const [users, setUsers] = useState(() => readStored(USERS_KEY, seed.users))
  const [clients, setClients] = useState(() => readStored(CLIENTS_KEY, seed.clients))
  const [projects, setProjects] = useState(seed.projects)
  const [invoices, setInvoices] = useState(seed.invoices)
  const [activities, setActivities] = useState(seed.activities)
  const [changeRequests, setChangeRequests] = useState(seed.changeRequests)
  const [requirements, setRequirements] = useState(seed.requirements)
  const [notifications, setNotifications] = useState(seed.notifications)
  const [session, setSession] = useState(() => readSession())
  const [otpChallenge, setOtpChallenge] = useState(null)
  const [auditLog, setAuditLog] = useState([])

  useEffect(() => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
  }, [users])

  useEffect(() => {
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients))
  }, [clients])

  const record = users.find((item) => item.id === session?.id) ?? null
  const user = record && record.active !== false ? record : null

  const persist = (nextUser) => {
    const safe = publicUser(nextUser)
    setSession(safe)
    if (safe) localStorage.setItem(SESSION_KEY, JSON.stringify(safe))
    else localStorage.removeItem(SESSION_KEY)
  }

  // Records who did what. The actor defaults to the signed-in user.
  const addAudit = (event) =>
    setAuditLog((current) => [
      {
        id: createId('audit'),
        at: new Date().toISOString(),
        actor: user?.name ?? 'Unknown',
        ...event,
      },
      ...current,
    ])

  const activeSignInCode = (account) => {
    if (!account?.signInCode || Date.now() > account.signInCodeExpires) return null
    return {
      purpose: 'login',
      userId: account.id,
      email: account.email,
      code: account.signInCode,
      expiresAt: account.signInCodeExpires,
      attempts: 0,
    }
  }

  const rememberSignInCode = (userId, challenge) => {
    setUsers((current) => current.map((item) => (
      item.id === userId ? { ...item, signInCode: challenge.code, signInCodeExpires: challenge.expiresAt } : item
    )))
  }

  const login = async (email, password) => {
    const match = users.find((item) => item.email.toLowerCase() === email.trim().toLowerCase())
    if (!match || match.active === false) {
      addAudit({ actor: 'Unknown', type: 'signin_failed', category: 'signins', target: email.trim() })
      return { ok: false, message: match?.active === false
        ? 'This account has been deactivated. Contact an administrator.'
        : 'Email or password does not match our records.' }
    }
    if (match.activated === false) {
      return { ok: false, message: 'This account is not active yet. Open Activate account, enter the code from the email, and choose a password.' }
    }
    if (match.locked) {
      return { ok: false, message: 'This account is temporarily locked after repeated failed sign-ins.' }
    }
    if (match.password !== password) {
      addAudit({ actor: 'Unknown', type: 'signin_failed', category: 'signins', target: match.email })
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
    const challenge = activeSignInCode(match) ?? createOtpChallenge({ purpose: 'login', userId: match.id, email: match.email })
    setOtpChallenge(challenge)
    rememberSignInCode(match.id, challenge)
    const delivery = await emailSignInCode({
      email: match.email,
      name: match.name,
      code: challenge.code,
      purpose: 'login',
    })
    return { ok: true, step: 'otp', email: match.email, previewCode: delivery.sent ? null : challenge.code, emailed: delivery.sent, message: delivery.message }
  }

  const logout = () => {
    if (user) addAudit({ type: 'signout', category: 'signins', target: user.email })
    persist(null)
  }

  const register = async ({ name, email, password, role, company, title }) => {
    const normalised = String(email ?? '').trim().toLowerCase()
    if (!name?.trim()) return { ok: false, message: 'Enter your full name.' }
    if (!normalised.includes('@')) return { ok: false, message: 'Enter a valid email address.' }
    if (!password || password.length < 8) return { ok: false, message: 'Use at least 8 characters for the password.' }
    if (role === 'client' && !company?.trim()) return { ok: false, message: 'Enter the company name.' }
    if (role !== 'client' && !title?.trim()) return { ok: false, message: 'Enter your role.' }
    if (users.some((item) => item.email.toLowerCase() === normalised)) {
      return { ok: false, message: 'An account with that email already exists.' }
    }

    const challenge = createOtpChallenge({
      purpose: 'register',
      email: normalised,
      draft: {
        name: name.trim(),
        email: normalised,
        password,
        role,
        company: company?.trim() ?? '',
        title: title?.trim() ?? '',
      },
    })
    setOtpChallenge(challenge)
    const delivery = await emailSignInCode({
      email: normalised,
      name: name.trim(),
      code: challenge.code,
      purpose: 'register',
    })
    return { ok: true, step: 'otp', email: normalised, previewCode: delivery.sent ? null : challenge.code, emailed: delivery.sent, message: delivery.message }
  }

  const resendOtp = async () => {
    if (!otpChallenge) return { ok: false, message: 'Start again to request a code.' }
    const challenge = createOtpChallenge({
      purpose: otpChallenge.purpose,
      userId: otpChallenge.userId,
      email: otpChallenge.email,
      draft: otpChallenge.draft,
    })
    setOtpChallenge(challenge)
    if (challenge.userId) rememberSignInCode(challenge.userId, challenge)
    const delivery = await emailSignInCode({
      email: challenge.email,
      name: users.find((item) => item.id === challenge.userId)?.name ?? challenge.draft?.name ?? '',
      code: challenge.code,
      purpose: challenge.purpose,
    })
    return { ok: true, previewCode: delivery.sent ? null : challenge.code, emailed: delivery.sent, message: delivery.message }
  }

  const cancelOtp = () => setOtpChallenge(null)

  const verifyOtp = (code) => {
    const result = assessOtp(otpChallenge, code)
    if (!result.ok) {
      if (result.clear) setOtpChallenge(null)
      else if (result.attempts) setOtpChallenge({ ...otpChallenge, attempts: result.attempts })
      return { ok: false, message: result.message, clear: Boolean(result.clear) }
    }

    if (otpChallenge.purpose === 'login') {
      const match = users.find((item) => item.id === otpChallenge.userId)
      setOtpChallenge(null)
      if (!match || match.active === false) {
        return { ok: false, message: 'This account can no longer sign in. Contact an administrator.' }
      }
      addAudit({ actor: match.name, type: 'signin', category: 'signins', target: match.email })
      persist(match)
      return { ok: true, user: publicUser(match) }
    }

    const draft = otpChallenge.draft
    if (users.some((item) => item.email.toLowerCase() === draft.email)) {
      setOtpChallenge(null)
      return { ok: false, message: 'An account with that email already exists.' }
    }

    let clientId = null
    if (draft.role === 'client') {
      clientId = createId('client')
      setClients((current) => [
        ...current,
        { id: clientId, name: draft.company, contact: draft.name, email: draft.email },
      ])
    }

    const next = {
      id: createId('user'),
      name: draft.name,
      email: draft.email,
      password: draft.password,
      role: draft.role,
      clientId,
      memberId: null,
      title: draft.role === 'client' ? draft.company : draft.title,
      active: true,
    }
    setUsers((current) => [...current, next])
    setOtpChallenge(null)
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

  const createProject = ({ clientId, name, service, dueLabel, memberIds, description, brief }) => {
    const errors = {}
    if (!clientId) errors.clientId = 'Select a client. The project cannot be saved without one.'
    if (!name?.trim()) errors.name = 'Enter a project title.'
    if (!description?.trim()) errors.description = 'Enter a description.'
    if (!dueLabel?.trim()) errors.dueLabel = 'Enter a due date.'
    if (!service) errors.service = 'Select a service offered by Lethabo M Solutions.'
    if (!memberIds?.length) errors.memberIds = 'Select an available developer.'
    if (Object.keys(errors).length) return { ok: false, errors }

    const project = {
      id: createId('project'),
      clientId,
      name: name.trim(),
      service: (service || name).trim(),
      status: 'in_progress',
      stage: 'discovery',
      startedLabel: new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' }),
      dueLabel: dueLabel.trim(),
      dueThisWeek: false,
      progress: 8,
      memberIds,
      description: description.trim(),
      milestones: [],
      tasks: [],
      files: brief?.name ? [{
        id: createId('file'),
        name: brief.name,
        kind: brief.kind || 'File',
        description: 'Project brief',
        previewUrl: brief.previewUrl || '',
        version: 1,
        uploadedBy: user?.name?.split(' ')[0] ?? 'Team',
        createdAt: new Date().toISOString(),
        approval: 'pending',
      }] : [],
      comments: [],
    }
    setProjects((current) => [project, ...current])
    const client = clients.find((item) => item.id === clientId)
    addActivity(project.id, `${client?.name ?? 'A client'} was added to ${project.name}`)
    notify(clientUserIds(clientId), `${project.name} is now visible on your account.`, project.id)
    addAudit({ type: 'project_created', category: 'projects', target: project.name })
    return { ok: true, project }
  }

  const deleteProject = (projectId) => {
    const project = projects.find((item) => item.id === projectId)
    if (!project) return { ok: false, message: 'That project could not be found.' }
    setProjects((current) => current.filter((item) => item.id !== projectId))
    setInvoices((current) => current.filter((item) => item.projectId !== projectId))
    setChangeRequests((current) => current.filter((item) => item.projectId !== projectId))
    setRequirements((current) => current.filter((item) => item.projectId !== projectId))
    setActivities((current) => current.filter((item) => item.projectId !== projectId))
    setNotifications((current) => current.filter((item) => item.projectId !== projectId))
    return { ok: true }
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

  const addFile = (projectId, { name, kind, description, previewUrl }) => {
    const project = projects.find((item) => item.id === projectId)
    const cleanName = name.trim()
    const existing = project?.files.filter((file) => file.name.toLowerCase() === cleanName.toLowerCase()) ?? []
    const version = existing.reduce((max, file) => Math.max(max, file.version || 1), 0) + (existing.length ? 1 : 0) || 1
    const file = {
      id: createId('file'),
      name: cleanName,
      kind,
      description: (description || '').trim(),
      previewUrl: previewUrl || '',
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

  const generateInvoice = ({ clientId, projectId, issuedAt, dueAt, items, send = true }) => {
    const highest = invoices.reduce(
      (max, item) => Math.max(max, parseInt(String(item.number).replace(/\D/g, ''), 10) || 0),
      230,
    )
    const number = `INV${highest + 1}`
    const issued = issuedAt || todayISO()
    const due = dueAt || addDaysISO(issued, 14)
    const invoice = {
      id: createId('invoice'),
      number,
      clientId,
      projectId,
      title: items[0]?.description || 'Invoice',
      status: send ? 'sent' : 'draft',
      issuedAt: issued,
      dueAt: due,
      issuedLabel: dateLabel(issued),
      dueLabel: dateLabel(due),
      sentBy: user?.id ?? null,
      items: items.map((item) => ({ ...item, id: createId('line'), qty: Number(item.qty) || 1, amount: Number(item.amount) })),
    }
    setInvoices((current) => [invoice, ...current])
    if (send) {
      const client = clients.find((item) => item.id === clientId)
      addActivity(projectId, `Invoice ${number} was sent to ${client?.name ?? 'the client'}`)
      notify(clientUserIds(clientId), `Invoice ${number} is ready to view.`, projectId)
    }
    return invoice
  }

  // Only drafts can be edited. Pass send = true to save and send in one step.
  const updateInvoice = (invoiceId, patch, send = false) => {
    const invoice = invoices.find((item) => item.id === invoiceId)
    if (!invoice) return { ok: false, message: 'That invoice could not be found.' }
    if (invoice.status !== 'draft') return { ok: false, message: 'Only draft invoices can be edited.' }
    const next = { ...patch }
    if (patch.items) {
      next.items = patch.items.map((item) => ({ ...item, qty: Number(item.qty) || 1, amount: Number(item.amount) }))
    }
    if (patch.issuedAt) next.issuedLabel = dateLabel(patch.issuedAt)
    if (patch.dueAt) next.dueLabel = dateLabel(patch.dueAt)
    const merged = { ...invoice, ...next, ...(send ? { status: 'sent' } : {}) }
    setInvoices((current) => current.map((item) => (item.id === invoiceId ? merged : item)))
    if (send) {
      const client = clients.find((item) => item.id === merged.clientId)
      addActivity(merged.projectId, `Invoice ${merged.number} was sent to ${client?.name ?? 'the client'}`)
      notify(clientUserIds(merged.clientId), `Invoice ${merged.number} is ready to view.`, merged.projectId)
    }
    return { ok: true, invoice: merged }
  }

  const sendInvoice = (invoiceId) => updateInvoice(invoiceId, {}, true)

  const deleteInvoice = (invoiceId) => {
    const invoice = invoices.find((item) => item.id === invoiceId)
    if (!invoice || invoice.status !== 'draft') return { ok: false, message: 'Only draft invoices can be deleted.' }
    setInvoices((current) => current.filter((item) => item.id !== invoiceId))
    return { ok: true }
  }

  const markInvoicePaid = (invoiceId) => {
    const invoice = invoices.find((item) => item.id === invoiceId)
    if (!invoice || !['sent', 'overdue'].includes(effectiveStatus(invoice))) {
      return { ok: false, message: 'Only sent invoices can be marked as paid.' }
    }
    const paidAt = todayISO()
    setInvoices((current) => current.map((item) => (item.id === invoiceId ? { ...item, status: 'paid', paidAt } : item)))
    addActivity(invoice.projectId, `Invoice ${invoice.number} was marked as paid`)
    notify([...clientUserIds(invoice.clientId), ...managerIds()], `Invoice ${invoice.number} was marked as paid.`, invoice.projectId)
    return { ok: true }
  }

  const cancelInvoice = (invoiceId) => {
    const invoice = invoices.find((item) => item.id === invoiceId)
    if (!invoice || !['sent', 'overdue'].includes(effectiveStatus(invoice))) {
      return { ok: false, message: 'Only sent invoices can be cancelled.' }
    }
    setInvoices((current) => current.map((item) => (item.id === invoiceId ? { ...item, status: 'cancelled' } : item)))
    addActivity(invoice.projectId, `Invoice ${invoice.number} was cancelled`)
    notify(clientUserIds(invoice.clientId), `Invoice ${invoice.number} was cancelled.`, invoice.projectId)
    return { ok: true }
  }

  const remindInvoice = (invoiceId) => {
    const invoice = invoices.find((item) => item.id === invoiceId)
    if (!invoice || !['sent', 'overdue'].includes(effectiveStatus(invoice))) {
      return { ok: false, message: 'Only sent invoices can have a reminder.' }
    }
    setInvoices((current) => current.map((item) => (item.id === invoiceId ? { ...item, reminded: true } : item)))
    const client = clients.find((item) => item.id === invoice.clientId)
    addActivity(invoice.projectId, `Payment reminder sent to ${client?.name ?? 'the client'} for ${invoice.number}`)
    notify(clientUserIds(invoice.clientId), `Reminder: invoice ${invoice.number} is due ${invoice.dueLabel}.`, invoice.projectId)
    return { ok: true }
  }

  const addMilestone = (projectId, { name, targetLabel }) => {
    const errors = {}
    if (!name?.trim()) errors.name = 'Enter a milestone name.'
    if (!targetLabel?.trim()) errors.targetLabel = 'Enter a target date.'
    if (Object.keys(errors).length) return { ok: false, errors }
    const project = projects.find((item) => item.id === projectId)
    if (!project) return { ok: false, message: 'Open a project before adding a milestone.' }
    const milestone = { id: createId('mile'), name: name.trim(), targetLabel: targetLabel.trim(), status: 'planned' }
    setProjects((current) => current.map((item) => (
      item.id === projectId ? { ...item, milestones: [...(item.milestones ?? []), milestone] } : item
    )))
    addActivity(projectId, `Milestone added: ${milestone.name}`)
    notify(clientUserIds(project.clientId), `${milestone.name} was added to the ${project.name} timeline.`, projectId)
    return { ok: true }
  }

  const updateMilestone = (projectId, milestoneId, { name, targetLabel }) => {
    const errors = {}
    if (!name?.trim()) errors.name = 'Enter a milestone name.'
    if (!targetLabel?.trim()) errors.targetLabel = 'Enter a target date.'
    if (Object.keys(errors).length) return { ok: false, errors }
    const project = projects.find((item) => item.id === projectId)
    const existing = project?.milestones?.find((item) => item.id === milestoneId)
    if (!existing) return { ok: false, message: 'That milestone is no longer on this project.' }
    setProjects((current) => current.map((item) => (
      item.id === projectId
        ? { ...item, milestones: item.milestones.map((milestone) => (milestone.id === milestoneId ? { ...milestone, name: name.trim(), targetLabel: targetLabel.trim() } : milestone)) }
        : item
    )))
    addActivity(projectId, `Milestone updated: ${name.trim()}`)
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
    addAudit({
      type: 'change_decided',
      category: 'changes',
      target: request.description,
      detail: [['Status', request.status.replace('_', ' '), status.replace('_', ' ')]],
    })
  }

  const saveAccount = async ({ id, name, email, role, phone, company }) => {
    const normalised = String(email ?? '').trim().toLowerCase()
    if (users.some((item) => item.email.toLowerCase() === normalised && item.id !== id)) {
      return { ok: false, message: 'An account with that email already exists.' }
    }
    if (!name?.trim() || !normalised || !role) return { ok: false, message: 'Name, email, and role are required.' }
    const cleanPhone = (phone ?? '').trim()

    if (id) {
      const before = users.find((item) => item.id === id)
      if (!before) return { ok: false, message: 'That user could not be found.' }
      const changes = []
      if (before.name !== name.trim()) changes.push(['Name', before.name, name.trim()])
      if (before.email.toLowerCase() !== normalised) changes.push(['Email', before.email, normalised])
      if (before.role !== role) changes.push(['Role', roleLabel(before.role), roleLabel(role)])
      if ((before.phone ?? '') !== cleanPhone) changes.push(['Phone', before.phone || 'none', cleanPhone || 'none'])

      setUsers((current) => current.map((item) => (item.id === id ? {
        ...item,
        name: name.trim(),
        email: normalised,
        role,
        phone: cleanPhone,
        title: before.role === role ? item.title : roleLabel(role),
      } : item)))
      if (changes.length) {
        addAudit({ type: 'user_edited', category: 'accounts', target: name.trim(), detail: changes })
      }
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
      password: '',
      role,
      clientId,
      memberId: null,
      phone: cleanPhone,
      title: role === 'client' ? company.trim() : roleLabel(role),
      active: true,
      activated: false,
    }
    if (role === 'developer') next.memberId = next.id
    const challenge = createOtpChallenge({ purpose: 'welcome', userId: next.id, email: normalised })
    next.signInCode = challenge.code
    next.signInCodeExpires = Date.now() + 24 * 60 * 60 * 1000
    setUsers((current) => [...current, next])
    addAudit({
      type: 'user_added',
      category: 'accounts',
      target: next.name,
      detail: [['Role', '', roleLabel(role)], ['Account', '', 'Waiting for a password']],
    })
    const delivery = await emailSignInCode({
      email: normalised,
      name: next.name,
      code: challenge.code,
      purpose: 'welcome',
      link: `${window.location.origin}/activate`,
    })
    return {
      ok: true,
      emailed: delivery.sent,
      previewCode: delivery.sent ? null : challenge.code,
      message: delivery.sent
        ? `An activation email was sent to ${normalised}.`
        : delivery.message,
    }
  }

  const activateAccount = ({ email, code, password }) => {
    const normalised = String(email ?? '').trim().toLowerCase()
    const match = users.find((item) => item.email.toLowerCase() === normalised)
    if (!match) return { ok: false, message: 'No account was found for that email. Add the person again in Team & Access, then use the new code from the latest email.' }
    if (match.active === false) return { ok: false, message: 'This account has been deactivated. Contact an administrator.' }
    if (match.activated !== false) return { ok: false, message: 'This account already has a password. Sign in instead.' }
    if (!password || password.length < 8) return { ok: false, message: 'Use at least 8 characters for the password.' }

    const result = assessOtp({
      code: match.signInCode,
      expiresAt: match.signInCodeExpires,
      attempts: match.activationAttempts ?? 0,
    }, code)
    if (!result.ok) {
      if (result.clear) {
        setUsers((current) => current.map((item) => (item.id === match.id ? { ...item, signInCode: null, signInCodeExpires: null } : item)))
      } else if (result.attempts) {
        setUsers((current) => current.map((item) => (item.id === match.id ? { ...item, activationAttempts: result.attempts } : item)))
      }
      return { ok: false, message: result.message }
    }

    const ready = { ...match, password, activated: true, signInCode: null, signInCodeExpires: null, activationAttempts: 0, failedAttempts: 0, locked: false }
    setUsers((current) => current.map((item) => (item.id === match.id ? ready : item)))
    addAudit({ actor: match.name, type: 'account_ready', category: 'accounts', target: match.email })
    persist(ready)
    return { ok: true, user: publicUser(ready) }
  }

  const setAccountActive = (userId, active) => {
    if (userId === user?.id) return { ok: false, message: 'You cannot deactivate the account you are using.' }
    const account = users.find((item) => item.id === userId)
    setUsers((current) => current.map((item) => (item.id === userId ? { ...item, active, locked: active ? item.locked : true } : item)))
    if (account) {
      addAudit({
        type: active ? 'user_activated' : 'user_deactivated',
        category: 'accounts',
        target: account.name,
        detail: [['Account', active ? 'Deactivated' : 'Active', active ? 'Active' : 'Deactivated']],
      })
    }
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
    auditLog,
    addAudit,
    members: teamMembers,
    login,
    logout,
    register,
    verifyOtp,
    resendOtp,
    cancelOtp,
    createProject,
    deleteProject,
    updateProject,
    moveTask,
    addTask,
    addComment,
    markProjectCommentsRead,
    addFile,
    approveFile,
    generateInvoice,
    updateInvoice,
    sendInvoice,
    deleteInvoice,
    markInvoicePaid,
    cancelInvoice,
    remindInvoice,
    addMilestone,
    updateMilestone,
    completeMilestone,
    addRequirement,
    setRequirementStatus,
    submitChangeRequest,
    decideChangeRequest,
    saveAccount,
    activateAccount,
    setAccountActive,
    markNotificationRead,
  }

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}