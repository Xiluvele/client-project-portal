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

export async function emailPaymentReminder({ token, email, name, invoiceNumber, projectName, amount, dueLabel, link }) {
  try {
    const response = await fetch(`${API_BASE}/api/invoices/payment-reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, name, invoiceNumber, projectName, amount, dueLabel, link }),
    })
    const body = await response.json().catch(() => ({}))
    if (response.status === 401 || response.status === 403) {
      return { sent: false, message: 'Sign in again before sending a payment reminder.' }
    }
    if (!response.ok) {
      return { sent: false, message: body.message || 'The email service did not accept the reminder.' }
    }
    return { sent: Boolean(body.sent), message: body.message || '' }
  } catch {
    return { sent: false, message: 'The API is not running, so the reminder could not be emailed.' }
  }
}
