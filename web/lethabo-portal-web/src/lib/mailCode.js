import { API_BASE } from './api'

export async function emailSignInCode({ email, name, code, purpose, link }) {
  try {
    const response = await fetch(`${API_BASE}/api/auth/email-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, code, purpose, link }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      return { sent: false, message: body.message || 'The email service did not accept the code.' }
    }
    return {
      sent: Boolean(body.sent),
      message: body.message || '',
    }
  } catch {
    return { sent: false, message: 'The API is not running, so the code could not be emailed.' }
  }
}
