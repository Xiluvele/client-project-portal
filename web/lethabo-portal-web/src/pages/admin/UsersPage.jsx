import { useState } from 'react'
import { PageIntro } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SearchField, SelectField, TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { roleLabel } from '../../lib/roles'
import { useAppState } from '../../state/useAppState'

const ROLES = ['administrator', 'manager', 'developer', 'client']

const ROLE_HINTS = {
  administrator: 'Manages people and access, and reads the audit trail.',
  manager: 'Creates projects, assigns work and handles client requests.',
  developer: 'Sees only the projects and tasks assigned to them.',
  client: 'Follows their own projects in the mobile app.',
}

// There is no password field: the form no longer asks for one.
const emptyForm = {
  id: null, name: '', email: '', role: 'developer', phone: '', password: '', company: '',
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(form, users) {
  const errors = {}
  if (form.name.trim().length < 2) errors.name = 'Enter the full name.'

  const email = form.email.trim().toLowerCase()
  if (!EMAIL.test(email)) errors.email = 'Enter a valid email, like name@company.co.za.'
  else if (users.some((u) => u.id !== form.id && (u.email || '').toLowerCase() === email))
    errors.email = 'Another user already has this email.'

  if (form.role === 'client' && !form.company.trim()) errors.company = 'Enter the client company.'

  const digits = form.phone.replace(/\D/g, '')
  if (form.phone && (digits.length < 9 || digits.length > 15 || /[^\d\s+\-()]/.test(form.phone)))
    errors.phone = 'Enter a valid phone number, like 082 123 4567.'

  return errors
}

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

const ViewIcon = () => (
  <svg {...iconProps}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const DeactivateIcon = () => (
  <svg {...iconProps}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="m17 8 5 5" />
    <path d="m22 8-5 5" />
  </svg>
)

const ActivateIcon = () => (
  <svg {...iconProps}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="m16 11 2 2 4-4" />
  </svg>
)

function FieldError({ message }) {
  return message ? <p className="field-error" role="alert">{message}</p> : null
}

function peopleRows(users, clients) {
  const byId = new Map(clients.map((client) => [client.id, client]))
  const byEmail = new Map(clients.map((client) => [String(client.email || '').toLowerCase(), client]))
  const used = new Set()
  const rows = users.map((user) => {
    const client = (user.clientId && byId.get(user.clientId)) || byEmail.get(String(user.email || '').toLowerCase())
    if (client) used.add(client.id)
    return {
      ...user,
      company: user.company || client?.name || (user.role === 'client' ? user.title : ''),
      hasAccount: user.hasAccount !== false,
    }
  })
  clients.forEach((client) => {
    if (used.has(client.id)) return
    const email = String(client.email || '').toLowerCase()
    if (rows.some((row) => String(row.email || '').toLowerCase() === email)) return
    rows.push({
      id: client.id,
      name: client.contact || client.name,
      email: client.email,
      role: 'client',
      company: client.name,
      phone: '',
      clientId: client.id,
      active: true,
      activated: false,
      hasAccount: false,
    })
  })
  return rows.sort((left, right) => left.name.localeCompare(right.name))
}

export function UsersPage() {
  const { users, clients, saveAccount, setAccountActive } = useAppState()
  const [form, setForm] = useState(emptyForm)
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [confirming, setConfirming] = useState(null)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')

  const openAdd = () => {
    setForm(emptyForm)
    setError('')
    setErrors({})
    setOpen(true)
  }

  const edit = (account) => {
    setForm({
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      phone: account.phone || '',
      password: '',
      company: account.company || '',
    })
    setError('')
    setErrors({})
    setOpen(true)
  }

  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value })

  const submit = async (event) => {
    event.preventDefault()
    const found = validate(form, rows)
    setErrors(found)
    if (Object.keys(found).length) return

    const result = await saveAccount({
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    })
    if (!result.ok) {
      setError(result.message)
      return
    }
    if (!form.id && result.emailed) {
      setNotice(`An activation email was sent to ${form.email.trim()}. They open the link, enter the code, and choose a password.`)
    } else if (!form.id && result.previewCode) {
      setNotice(`The account was saved, but the email did not send. ${result.message} Activation code: ${result.previewCode}.`)
    }
    setOpen(false)
  }

  // Always show the latest data for the user being viewed
  const rows = peopleRows(users, clients)
  const needle = query.trim().toLowerCase()
  const visible = needle
    ? rows.filter((account) => `${account.name} ${account.email} ${account.role} ${account.company || ''}`.toLowerCase().includes(needle))
    : rows
  const viewed = viewing ? rows.find((u) => u.id === viewing) : null
  const viewedInactive = viewed?.active === false
  const toConfirm = confirming ? rows.find((u) => u.id === confirming) : null

  const toggleAccount = async (account) => {
    if (account.active === false) {
      const result = await setAccountActive(account.id, true)
      if (!result?.ok) setError(result?.message || 'The account could not be updated.')
      return
    }
    setConfirming(account.id)
  }

  return (
    <>
      <PageIntro
        title="Team & Access"
        subtitle="Users and clients from the database. Search by name, email, role, or company."
        actions={(
          <>
            <SearchField value={query} onChange={setQuery} placeholder="Search users and clients" />
            <Button onClick={openAdd}>Add user</Button>
          </>
        )}
      />
      {notice ? <p className="notice" role="status">{notice}</p> : null}
      {error && !open ? <p className="notice" role="alert">{error}</p> : null}
      <Card>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Company</th>
                <th>Account</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6}>{rows.length === 0 ? 'No accounts are stored in the database yet.' : 'No people match this search.'}</td>
                </tr>
              ) : null}
              {visible.map((account) => {
                const inactive = account.active === false
                const waiting = account.activated === false && !inactive
                return (
                  <tr key={account.id}>
                    <td>
                      <div className="cell-title">{account.name}</div>
                      <div className="cell-sub">{account.phone}</div>
                    </td>
                    <td>{account.email}</td>
                    <td>{roleLabel(account.role)}</td>
                    <td>{account.company || '—'}</td>
                    <td>
                      <StatusBadge
                        status={inactive ? 'cancelled' : waiting ? 'pending' : 'confirmed'}
                        label={!account.hasAccount ? 'Client record' : inactive ? 'Deactivated' : waiting ? 'Needs password' : 'Active'}
                      />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-btn"
                          type="button"
                          title="View details"
                          aria-label={`View ${account.name}`}
                          onClick={() => setViewing(account.id)}
                        >
                          <ViewIcon />
                        </button>
                        {account.hasAccount ? (
                          <button
                            className={`icon-btn ${inactive ? 'icon-btn--ok' : 'icon-btn--danger'}`}
                            type="button"
                            title={inactive ? 'Activate: allow sign-in again' : 'Deactivate: block sign-in'}
                            aria-label={inactive ? `Activate ${account.name}` : `Deactivate ${account.name}`}
                            onClick={() => toggleAccount(account)}
                          >
                            {inactive ? <ActivateIcon /> : <DeactivateIcon />}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal title="User details" open={Boolean(viewed)} onClose={() => setViewing(null)}>
        {viewed ? (
          <div className="stack">
            <dl className="detail-list">
              <div><dt>Full name</dt><dd>{viewed.name}</dd></div>
              <div><dt>Email</dt><dd>{viewed.email}</dd></div>
              <div><dt>Role</dt><dd>{roleLabel(viewed.role)}</dd></div>
              <div><dt>Company</dt><dd>{viewed.company || '—'}</dd></div>
              <div><dt>Phone</dt><dd>{viewed.phone || '—'}</dd></div>
              <div>
                <dt>Account</dt>
                <dd>
                  <StatusBadge
                    status={viewedInactive ? 'cancelled' : 'confirmed'}
                    label={viewedInactive ? 'Deactivated' : 'Active'}
                  />
                </dd>
              </div>
            </dl>
            {viewed.hasAccount ? (
              <Button onClick={() => { const account = viewed; setViewing(null); edit(account) }}>
                Edit user
              </Button>
            ) : (
              <p className="quiet">This company is stored as a client. Add a user with this email to give them a sign-in.</p>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal title="Block this person from signing in?" open={Boolean(toConfirm)} onClose={() => setConfirming(null)}>
        {toConfirm ? (
          <div className="stack">
            <p>
              {toConfirm.name} will not be able to sign in until you activate the account again.
              Their projects and history stay as they are.
            </p>
            <Button onClick={async () => {
              const result = await setAccountActive(toConfirm.id, false)
              if (!result?.ok) setError(result?.message || 'The account could not be updated.')
              setConfirming(null)
            }}>
              Deactivate {toConfirm.name}
            </Button>
            <button type="button" className="btn btn--secondary" onClick={() => setConfirming(null)}>
              Cancel
            </button>
          </div>
        ) : null}
      </Modal>

      <Modal title={form.id ? 'Edit user' : 'Add user'} open={open} onClose={() => setOpen(false)}>
        <form className="stack" onSubmit={submit} noValidate>
          {error ? <div className="form-error">{error}</div> : null}

          <TextField label="Full name" value={form.name} onChange={set('name')} />
          <FieldError message={errors.name} />

          <TextField label="Email" type="email" value={form.email} onChange={set('email')} />
          <FieldError message={errors.email} />

          <SelectField label="Role" value={form.role} onChange={set('role')}>
            {ROLES.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
          </SelectField>
          <p className="quiet">{ROLE_HINTS[form.role]}</p>

          {form.role === 'client' ? (
            <>
              <TextField label="Company" value={form.company} onChange={set('company')} />
              <FieldError message={errors.company} />
            </>
          ) : null}

          <TextField label="Phone number (optional)" type="tel" value={form.phone} onChange={set('phone')} placeholder="082 123 4567" />
          <FieldError message={errors.phone} />

          <Button type="submit">Save account</Button>
        </form>
      </Modal>
    </>
  )
}