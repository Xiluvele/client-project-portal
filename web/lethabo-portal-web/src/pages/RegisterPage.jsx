import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '../components/ui/Logo'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/Fields'
import { useAppState } from '../state/useAppState'

export function RegisterPage() {
  const { register } = useAppState()
  const navigate = useNavigate()
  const [role, setRole] = useState('client')
  const [error, setError] = useState('')

  const submit = (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const password = data.get('password')
    const confirm = data.get('confirm')
    if (password.length < 8) {
      setError('Use at least 8 characters for the password.')
      return
    }
    if (password !== confirm) {
      setError('The passwords do not match.')
      return
    }
    const result = register({
      name: data.get('name'),
      email: data.get('email'),
      password,
      role,
      company: data.get('company') || '',
      title: data.get('title') || 'Team member',
    })
    if (!result.ok) {
      setError(result.message)
      return
    }
    navigate(result.user.role === 'client' ? '/client/dashboard' : '/team/dashboard')
  }

  return (
    <div className="auth">
      <section className="auth__brand">
        <Logo />
        <h1>Join the project workspace.</h1>
        <p>Managers run delivery from the team app. Clients follow their own work, approve files, and see invoices.</p>
      </section>
      <section className="auth__form">
        <div className="auth-card">
          <h2>Create account</h2>
          <form className="stack" onSubmit={submit} style={{ marginTop: 18 }}>
            {error ? <div className="form-error">{error}</div> : null}
            <div className="field">
              <span className="field__label">I am joining as</span>
              <div className="role-switch">
                <button type="button" className={role === 'manager' ? 'is-active' : ''} onClick={() => setRole('manager')}>Team</button>
                <button type="button" className={role === 'client' ? 'is-active' : ''} onClick={() => setRole('client')}>Client</button>
              </div>
            </div>
            <TextField label="Full name" name="name" required placeholder="Thandi Kunene" />
            <TextField label="Email" name="email" type="email" autoComplete="email" required />
            {role === 'client' ? (
              <TextField label="Company" name="company" required placeholder="Kunene Attorneys" />
            ) : (
              <TextField label="Role" name="title" required placeholder="Project Manager" />
            )}
            <TextField label="Password" name="password" type="password" autoComplete="new-password" required />
            <TextField label="Confirm password" name="confirm" type="password" autoComplete="new-password" required />
            <Button type="submit" block>Create account</Button>
          </form>
          <p className="quiet" style={{ marginTop: 14 }}>
            Already registered? <Link to="/login"><strong>Sign in</strong></Link>
          </p>
        </div>
      </section>
    </div>
  )
}
