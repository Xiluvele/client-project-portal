import { useState } from 'react'
import { PageIntro } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SelectField, TextField } from '../../components/ui/Fields'
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

  if (form.role === 'client' && !form.id && !form.company.trim()) errors.company = 'Enter the client company.'

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

export function UsersPage() {
  const { users, saveAccount, setAccountActive } = useAppState()
  const [form, setForm] = useState(emptyForm)
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [confirming, setConfirming] = useState(null)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState('')

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
      company: '',
    })
    setError('')
    setErrors({})
    setOpen(true)
  }

  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value })

  const submit = async (event) => {
    event.preventDefault()
    const found = validate(form, users)
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
      setNotice(`The account was saved, but the email did not send. ${result.message} Activation code: ${result.previewCode}. They open Activate account from the sign-in page.`)
    }
    setOpen(false)
  }

  // Always show the latest data for the user being viewed
  const viewed = viewing ? users.find((u) => u.id === viewing) : null
  const viewedInactive = viewed?.active === false
  const toConfirm = confirming ? users.find((u) => u.id === confirming) : null

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
        subtitle="View details, add people, and activate or deactivate who can sign in. A duplicate email is rejected."
        actions={<Button onClick={openAdd}>Add user</Button>}
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
                <th>Account</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5}>No accounts are stored in the database yet.</td>
                </tr>
              ) : null}
              {users.map((account) => {
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
                    <td>
                      <StatusBadge
                        status={inactive ? 'cancelled' : waiting ? 'pending' : 'confirmed'}
                        label={inactive ? 'Deactivated' : waiting ? 'Needs password' : 'Active'}
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
                        <button
                          className={`icon-btn ${inactive ? 'icon-btn--ok' : 'icon-btn--danger'}`}
                          type="button"
                          title={inactive ? 'Activate: allow sign-in again' : 'Deactivate: block sign-in'}
                          aria-label={inactive ? `Activate ${account.name}` : `Deactivate ${account.name}`}
                          onClick={() => toggleAccount(account)}
                        >
                          {inactive ? <ActivateIcon /> : <DeactivateIcon />}
                        </button>
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
            <Button onClick={() => { const account = viewed; setViewing(null); edit(account) }}>
              Edit user
            </Button>
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

          {form.role === 'client' && !form.id ? (
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