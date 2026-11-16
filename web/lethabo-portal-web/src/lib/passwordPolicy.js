// Password rules for activation and password reset.
// The API enforces the same rules (backend Security/PasswordPolicy.cs);
// keep the two lists in step. This copy only gives instant feedback.

export const MIN_LENGTH = 12
export const MAX_LENGTH = 128

const COMMON = new Set([
  '123456', '1234567', '12345678', '123456789', '1234567890', '0123456789',
  '111111', '000000', '121212', '123123', '654321', '112233', '123321',
  'password', 'passw0rd', 'pass', 'passcode', 'passphrase', 'letmein',
  'welcome', 'admin', 'administrator', 'root', 'user', 'login', 'master',
  'qwerty', 'qwertyuiop', 'qwertyui', 'asdfgh', 'asdfghjkl', 'zxcvbn',
  'zxcvbnm', 'qazwsx', '1q2w3e', '1q2w3e4r', '1qaz2wsx', 'azerty',
  'iloveyou', 'monkey', 'dragon', 'football', 'baseball', 'superman',
  'batman', 'sunshine', 'princess', 'shadow', 'michael', 'trustno1',
  'abc123', 'abcdef', 'abcd1234', 'test', 'testing', 'test123', 'guest',
  'default', 'changeme', 'secret', 'hello', 'freedom', 'whatever',
  'lethabo', 'portal', 'lethaboportal', 'lethabom', 'lethabomsolutions',
  'clientportal', 'projectportal', 'company', 'manager', 'developer',
  'client', 'summer', 'winter', 'spring', 'autumn', 'google', 'gmail',
  'southafrica', 'johannesburg', 'capetown', 'pretoria', 'soweto',
])

const LOOKALIKES = {
  0: 'o', 1: 'l', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b',
  '@': 'a', $: 's', '!': 'i', '|': 'l',
}

const isLetter = (ch) => ch.toLowerCase() !== ch.toUpperCase()

function trimEdges(text) {
  const chars = [...text.trim()]
  let start = 0
  let end = chars.length
  while (start < end && !isLetter(chars[start])) start += 1
  while (end > start && !isLetter(chars[end - 1])) end -= 1
  return chars.slice(start, end).join('')
}

function trimTail(text) {
  const chars = [...text]
  let end = chars.length
  while (end > 0 && !isLetter(chars[end - 1])) end -= 1
  return chars.slice(0, end).join('')
}

function strip(lowered, lookalikes) {
  let text = trimEdges(lowered)
  if (lookalikes) {
    text = trimEdges([...text].map((ch) => LOOKALIKES[ch] ?? ch).join(''))
  }
  return text
}

function isRepeatedCommon(candidate) {
  for (let size = 3; size <= candidate.length / 2; size += 1) {
    if (candidate.length % size !== 0) continue
    const unit = candidate.slice(0, size)
    if (COMMON.has(unit) && unit.repeat(candidate.length / size) === candidate) return true
  }
  return false
}

export function isCommon(password) {
  const lowered = password.toLowerCase()
  for (const candidate of [strip(lowered, false), strip(lowered, true)]) {
    if (candidate.length === 0) return true // nothing but digits and symbols
    if (COMMON.has(candidate) || isRepeatedCommon(candidate)) return true
  }
  return COMMON.has(lowered) || COMMON.has(trimTail(lowered))
}

export function isRepetitiveOrSequential(password) {
  const lowered = password.toLowerCase()
  if (new Set(lowered).size < 5) return true

  for (const step of [-1, 1]) {
    let run = true
    for (let i = 1; i < lowered.length; i += 1) {
      if (lowered.charCodeAt(i) - lowered.charCodeAt(i - 1) !== step) {
        run = false
        break
      }
    }
    if (run) return true
  }

  if (/^\d+$/.test(lowered)) {
    if ('01234567890123456789'.includes(lowered) || '98765432109876543210'.includes(lowered)) return true
  }

  return ['qwertyuiopasdfghjklzxcvbnm', 'mnbvcxzlkjhgfdsapoiuytrewq', '1234567890qwertyuiop']
    .some((row) => row.includes(lowered))
}

export function containsPersonalInfo(password, personal = []) {
  const lowered = password.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
  for (const item of personal) {
    const text = (item || '').trim().toLowerCase()
    if (!text) continue
    const at = text.indexOf('@')
    const parts = [at > 0 ? text.slice(0, at) : text, ...text.split(/[ ._@-]+/)]
    for (const part of parts) {
      const clean = part.replace(/[^\p{L}\p{N}]/gu, '')
      if (clean.length >= 4 && lowered.includes(clean)) return true
    }
  }
  return false
}

// Returns every rule the password breaks. An empty list means it is acceptable.
export function validatePassword(password, personal = []) {
  const value = password ?? ''
  const errors = []
  if (value.length < MIN_LENGTH) errors.push(`Use at least ${MIN_LENGTH} characters.`)
  if (value.length > MAX_LENGTH) errors.push(`Use no more than ${MAX_LENGTH} characters.`)
  if (!value.trim()) return errors

  if (isCommon(value)) {
    errors.push('That password is too common or easy to guess. Choose something less predictable.')
  } else if (isRepetitiveOrSequential(value)) {
    errors.push('Do not use repeated characters or simple sequences such as aaaa or 123456.')
  } else if (containsPersonalInfo(value, personal)) {
    errors.push('Do not include your name or email address in the password.')
  }
  return errors
}

// Live checklist for the requirements box.
export function passwordChecks(password, personal = []) {
  const value = password ?? ''
  const typed = value.length > 0
  return [
    { id: 'length', label: `At least ${MIN_LENGTH} characters`, met: value.length >= MIN_LENGTH, typed },
    {
      id: 'common',
      label: 'Not a common password such as 123456, password or qwerty',
      met: typed && !isCommon(value) && !isRepetitiveOrSequential(value),
      typed,
    },
    {
      id: 'personal',
      label: 'Does not contain your name or email address',
      met: typed && !containsPersonalInfo(value, personal),
      typed,
    },
  ]
}
