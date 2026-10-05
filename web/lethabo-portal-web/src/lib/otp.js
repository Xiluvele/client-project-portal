const OTP_TTL_MS = 10 * 60 * 1000
const OTP_ATTEMPT_LIMIT = 3

export function createOtpCode() {
  const value = new Uint32Array(1)
  crypto.getRandomValues(value)
  return String(100000 + (value[0] % 900000))
}

export function createOtpChallenge(details, now = Date.now()) {
  return {
    ...details,
    code: createOtpCode(),
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
  }
}

export function assessOtp(challenge, code, now = Date.now()) {
  if (!challenge) return { ok: false, message: 'Request a new code to continue.' }
  const entered = String(code ?? '').replace(/\s/g, '')
  if (!/^\d{6}$/.test(entered)) return { ok: false, message: 'Enter the 6-digit code from the email.' }
  if (now > challenge.expiresAt) return { ok: false, message: 'That code has expired. Request a new one.' }
  if (entered !== challenge.code) {
    const attempts = challenge.attempts + 1
    if (attempts >= OTP_ATTEMPT_LIMIT) {
      return { ok: false, clear: true, message: 'Too many incorrect codes. Start again to get a new one.' }
    }
    return { ok: false, attempts, message: 'That code does not match the email. Try again.' }
  }
  return { ok: true }
}
