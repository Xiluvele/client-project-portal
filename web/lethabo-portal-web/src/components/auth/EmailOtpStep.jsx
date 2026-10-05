import { useState } from 'react'
import { Button } from '../ui/Button'
import { TextField } from '../ui/Fields'
import { cx } from '../../lib/format'

export function EmailOtpStep({ email, previewCode, error, onSubmit, onResend, onBack, className, stripe = false }) {
  const [code, setCode] = useState('')
  const [notice, setNotice] = useState('')

  const submit = (event) => {
    event.preventDefault()
    setNotice('')
    onSubmit(code)
  }

  const resend = () => {
    const result = onResend()
    if (!result?.ok) return
    setCode('')
    setNotice('A new code is in the demo inbox.')
  }

  return (
    <form className={cx('stack', className)} onSubmit={submit} noValidate>
      {stripe ? <div className="hazard" aria-hidden="true" /> : null}
      <h2>Check your email</h2>
      <p className="signin__lead">Enter the 6-digit code sent to {email}.</p>
      {error ? <div className="form-error">{error}</div> : null}
      {notice ? <p className="notice">{notice}</p> : null}
      <div className="otp-mail">
        <span>Demo inbox. The API will send this email. Until then, use the code below.</span>
        <strong>{previewCode}</strong>
      </div>
      <TextField
        label="Email code"
        name="otp"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="6-digit code"
      />
      <Button type="submit" block>Verify code</Button>
      <p className="signin__alt">
        <button type="button" className="linkish" onClick={resend}>Send a new code</button>
        <span> · </span>
        <button type="button" className="linkish" onClick={onBack}>Use a different account</button>
      </p>
    </form>
  )
}
