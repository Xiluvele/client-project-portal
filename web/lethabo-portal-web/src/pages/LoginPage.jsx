import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EmailOtpStep } from '../components/auth/EmailOtpStep'
import { Button } from '../components/ui/Button'
import { SelectField, TextField } from '../components/ui/Fields'
import { homeFor } from '../lib/roles'
import { useAppState } from '../state/useAppState'

const PROTOTYPE_ROLES = [
  { id: 'admin', label: 'Administrator', email: 'admin@lethabom.co.za' },
  { id: 'manager', label: 'Project Manager', email: 'naledi@lethabom.co.za' },
  { id: 'developer', label: 'Developer — Sipho Dlamini', email: 'sipho@lethabom.co.za' },
  { id: 'kunene', label: 'Client — Kunene Attorneys', email: 'thandi@kunene.co.za' },
  { id: 'vuka', label: 'Client — Vuka Retail', email: 'lindiwe@vukaretail.co.za' },
]

const DEMO_PASSWORD = 'connect123'

export function LoginPage() {
  const { login, verifyOtp, resendOtp, cancelOtp } = useAppState()
  const navigate = useNavigate()
  const [roleId, setRoleId] = useState('manager')
  const [email, setEmail] = useState('naledi@lethabom.co.za')
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [error, setError] = useState('')
  const [otp, setOtp] = useState(null)

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
    setError('')
    setOtp({ email: result.email, previewCode: result.previewCode })
  }

  const confirmCode = (code) => {
    const result = verifyOtp(code)
    if (!result.ok) {
      setError(result.message)
      if (result.clear) setOtp(null)
      return
    }
    navigate(homeFor(result.user.role))
  }

  const resend = () => {
    const result = resendOtp()
    if (!result.ok) {
      setError(result.message)
      return result
    }
    setError('')
    setOtp((current) => ({ ...current, previewCode: result.previewCode }))
    return result
  }

  const back = () => {
    cancelOtp()
    setOtp(null)
    setError('')
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
        {otp ? (
          <EmailOtpStep
            className="signin__form"
            stripe
            email={otp.email}
            previewCode={otp.previewCode}
            error={error}
            onSubmit={confirmCode}
            onResend={resend}
            onBack={back}
          />
        ) : (
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
            New to the portal? <Link to="/register" onClick={cancelOtp}>Create an account</Link>
          </p>
        </form>
        )}
      </section>
    </div>
  )
}
