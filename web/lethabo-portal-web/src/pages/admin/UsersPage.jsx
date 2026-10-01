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

export function UsersPage() {
  const { users, saveAccount, setAccountActive } = useAppState()
  const [form, setForm] = useState(emptyForm)
  const [open, setOpen] = useState(false)
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

  return (
    <>
      <PageIntro
        title="User accounts"
        subtitle="Add, edit, or deactivate who can sign in. A duplicate email is rejected."
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
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((account) => (
                <tr key={account.id}>
                  <td><div className="cell-title">{account.name}</div><div className="cell-sub">{account.title}</div></td>
                  <td>{account.email}</td>
                  <td>{roleLabel(account.role)}</td>
                  <td><StatusBadge status={account.active === false ? 'cancelled' : 'confirmed'} label={account.active === false ? 'Deactivated' : 'Active'} /></td>
                  <td>
                    <button className="linkish" type="button" onClick={() => edit(account)}>Edit</button>
                    {' '}
                    <button className="linkish" type="button" onClick={() => setAccountActive(account.id, account.active === false)}>
                      {account.active === false ? 'Activate' : 'Deactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
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
