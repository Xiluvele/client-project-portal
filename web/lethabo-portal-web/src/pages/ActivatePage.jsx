import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/Fields'
import { homeFor } from '../lib/roles'
import { useAppState } from '../state/useAppState'

export function ActivatePage() {
  const { activateAccount, logout } = useAppState()
  const navigate = useNavigate()
  const cleared = useRef(false)

  useEffect(() => {
    if (cleared.current) return
    cleared.current = true
    logout()
  }, [logout])
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  const submit = (event) => {
    event.preventDefault()
    if (password !== confirm) {
      setError('The passwords do not match.')
      return
    }
    const result = activateAccount({ email, code, password })
    if (!result.ok) {
      setError(result.message)
      return
    }
    navigate(homeFor(result.user.role))
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
          <h1>Choose your password and open the portal.</h1>
          <p>The activation code was emailed when an administrator added your account.</p>
        </div>
      </section>
      <section className="signin__panel">
        <form className="signin__form" onSubmit={submit}>
          <div className="hazard" aria-hidden="true" />
          <h2>Activate account</h2>
          <p className="signin__lead">Enter the code from the email, then choose a password of at least 8 characters.</p>
          {error ? <div className="form-error">{error}</div> : null}
          <TextField label="Email address" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <TextField label="Activation code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" />
          <TextField label="New password" type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          <TextField label="Confirm password" type="password" autoComplete="new-password" required value={confirm} onChange={(event) => setConfirm(event.target.value)} />
          <Button type="submit" block>Activate and sign in</Button>
          <p className="signin__alt">
            Already activated? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </section>
    </div>
  )
}
