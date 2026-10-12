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

const emptyForm = { id: null, name: '', email: '', role: 'developer', title: '', password: '', company: '' }

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

export function UsersPage() {
  const { users, saveAccount, setAccountActive } = useAppState()
  const [form, setForm] = useState(emptyForm)
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [error, setError] = useState('')

  const edit = (account) => {
    setForm({
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      title: account.title || '',
      password: '',
      company: '',
    })
    setError('')
    setOpen(true)
  }

  const submit = (event) => {
    event.preventDefault()
    const result = saveAccount(form)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setOpen(false)
  }

  // Always show the latest data for the user being viewed
  const viewed = viewing ? users.find((u) => u.id === viewing) : null
  const viewedInactive = viewed?.active === false

  return (
    <>
      <PageIntro
        title="Team & Access"
        subtitle="View details, add people, and activate or deactivate who can sign in. A duplicate email is rejected."
        actions={<Button onClick={() => { setForm(emptyForm); setError(''); setOpen(true) }}>Add user</Button>}
      />
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
              {users.map((account) => {
                const inactive = account.active === false
                return (
                  <tr key={account.id}>
                    <td>
                      <div className="cell-title">{account.name}</div>
                      <div className="cell-sub">{account.title}</div>
                    </td>
                    <td>{account.email}</td>
                    <td>{roleLabel(account.role)}</td>
                    <td>
                      <StatusBadge
                        status={inactive ? 'cancelled' : 'confirmed'}
                        label={inactive ? 'Deactivated' : 'Active'}
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
                          onClick={() => setAccountActive(account.id, inactive)}
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
              <div><dt>Job title</dt><dd>{viewed.title || '—'}</dd></div>
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

      <Modal title={form.id ? 'Edit user' : 'Add user'} open={open} onClose={() => setOpen(false)}>
        <form className="stack" onSubmit={submit}>
          {error ? <div className="form-error">{error}</div> : null}
          <TextField label="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          <TextField label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          <SelectField label="Role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
            {ROLES.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
          </SelectField>
          <TextField label="Job title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          {form.role === 'client' && !form.id ? (
            <TextField label="Company" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} required />
          ) : null}
          <TextField label={form.id ? 'New password (optional)' : 'Password'} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={form.id ? 'Leave blank to keep the current password' : 'connect123'} />
          <Button type="submit">Save account</Button>
        </form>
      </Modal>
    </>
  )
}