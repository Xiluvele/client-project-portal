import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { SelectField, TextField } from '../components/ui/Fields'
import { useAppState } from '../state/useAppState'

const PROTOTYPE_ROLES = [
  { id: 'manager', label: 'Project Manager', email: 'naledi@lethabom.co.za' },
  { id: 'kunene', label: 'Client — Kunene Attorneys', email: 'thandi@kunene.co.za' },
  { id: 'vuka', label: 'Client — Vuka Retail', email: 'lindiwe@vukaretail.co.za' },
]

const DEMO_PASSWORD = 'connect123'

export function LoginPage() {
  const { login } = useAppState()
  const navigate = useNavigate()
  const [roleId, setRoleId] = useState(PROTOTYPE_ROLES[0].id)
  const [email, setEmail] = useState(PROTOTYPE_ROLES[0].email)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [error, setError] = useState('')

  const chooseRole = (nextRoleId) => {
    const role = PROTOTYPE_ROLES.find((item) => item.id === nextRoleId) ?? PROTOTYPE_ROLES[0]
    setRoleId(role.id)
    setEmail(role.email)
    setPassword(DEMO_PASSWORD)
    setError('')
  }

  const submit = (event) => {
    event.preventDefault()
    const result = login(email, password)
    if (!result.ok) {
      setError(result.message)
      return
    }
    navigate(result.user.role === 'client' ? '/client/dashboard' : '/team/dashboard')
  }

  return (
    <div className="signin">
      <section className="signin__brand">
        <div className="portal-lockup">
          <span className="logo__mark">LM</span>
          <span>
            <strong>Lethabo M Solutions</strong>
            <small>Client Project Portal</small>
          </span>
        </div>
        <div className="signin__copy">
          <h1>Every project, file and sign-off in one place.</h1>
          <p>Plan work, share designs and track client approvals without digging through WhatsApp chats and email threads.</p>
        </div>
      </section>
      <section className="signin__panel">
        <form className="signin__form" onSubmit={submit}>
          <div className="hazard" aria-hidden="true" />
          <h2>Sign in</h2>
          <p className="signin__lead">Use your Lethabo M Solutions staff account.</p>
          {error ? <div className="form-error">{error}</div> : null}
          <TextField
            label="Email address"
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <SelectField label="Sign in as (prototype only)" name="role" value={roleId} onChange={(event) => chooseRole(event.target.value)}>
            {PROTOTYPE_ROLES.map((role) => (
              <option key={role.id} value={role.id}>{role.label}</option>
            ))}
          </SelectField>
          <Button type="submit" block>Sign in</Button>
          <p className="signin__alt">
            New to the portal? <Link to="/register">Create an account</Link>
          </p>
        </form>
      </section>
    </div>
  )
}
