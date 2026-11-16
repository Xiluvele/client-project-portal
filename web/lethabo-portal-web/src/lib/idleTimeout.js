// Inactivity timeout for signed-in sessions.
// After IDLE_MS without activity the person is signed out. WARNING_MS
// before that, a prompt lets them stay signed in.

export const IDLE_MS = 15 * 60 * 1000
export const WARNING_MS = 60 * 1000

export const IDLE_SIGNOUT_KEY = 'lethabo.idleSignedOut'
export const LAST_ACTIVITY_KEY = 'lethabo.lastActivity'
export const IDLE_NOTICE = 'You were signed out because you were inactive. Sign in again to continue.'

// Works out where the session stands from the time of the last activity.
// Returns { status: 'active' | 'warning' | 'expired', secondsLeft }.
export function idleStatus(now, lastActivity, idleMs = IDLE_MS, warningMs = WARNING_MS) {
  const remaining = lastActivity + idleMs - now
  if (remaining <= 0) return { status: 'expired', secondsLeft: 0 }
  if (remaining <= warningMs) return { status: 'warning', secondsLeft: Math.ceil(remaining / 1000) }
  return { status: 'active', secondsLeft: Math.ceil(remaining / 1000) }
}

// One-time message for the sign-in page after an inactivity sign-out.
export function readIdleNotice() {
  try {
    if (sessionStorage.getItem(IDLE_SIGNOUT_KEY) === '1') {
      sessionStorage.removeItem(IDLE_SIGNOUT_KEY)
      return IDLE_NOTICE
    }
  } catch {
    // Ignore blocked storage.
  }
  return ''
}
