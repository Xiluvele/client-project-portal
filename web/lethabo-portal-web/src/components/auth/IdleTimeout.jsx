import { useCallback, useEffect, useRef, useState } from 'react'
import {
  IDLE_SIGNOUT_KEY,
  LAST_ACTIVITY_KEY,
  idleStatus,
} from '../../lib/idleTimeout'
import { useAppState } from '../../state/useAppState'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'wheel']
const SHARE_EVERY_MS = 5000

function readShared() {
  try {
    return Number(localStorage.getItem(LAST_ACTIVITY_KEY)) || 0
  } catch {
    return 0
  }
}

function writeShared(time) {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(time))
  } catch {
    // Storage can be blocked; the timeout still works in this tab.
  }
}

// Signs the person out after a period of inactivity, with a warning first.
// Render it only while someone is signed in.
export function IdleTimeout() {
  const { logout } = useAppState()
  const [secondsLeft, setSecondsLeft] = useState(null)
  const last = useRef(Date.now())
  const shared = useRef(0)
  const warning = useRef(false)

  const signOut = useCallback(() => {
    try {
      sessionStorage.setItem(IDLE_SIGNOUT_KEY, '1')
    } catch {
      // The notice is only a courtesy.
    }
    setSecondsLeft(null)
    logout()
  }, [logout])

  const stay = useCallback(() => {
    const now = Date.now()
    last.current = now
    shared.current = now
    writeShared(now)
    warning.current = false
    setSecondsLeft(null)
  }, [])

  useEffect(() => {
    const now = Date.now()
    last.current = now
    writeShared(now)

    const onActivity = () => {
      // Once the warning is up, only the buttons count as activity.
      if (warning.current) return
      const time = Date.now()
      last.current = time
      if (time - shared.current > SHARE_EVERY_MS) {
        shared.current = time
        writeShared(time)
      }
    }
    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, onActivity, { passive: true }))

    // Compare clock times rather than counting ticks, so a sleeping laptop
    // or a throttled background tab still signs out on time.
    const timer = window.setInterval(() => {
      // Activity in another tab counts too.
      const latest = Math.max(last.current, readShared())
      const { status, secondsLeft: left } = idleStatus(Date.now(), latest)
      if (status === 'expired') {
        window.clearInterval(timer)
        signOut()
      } else if (status === 'warning') {
        warning.current = true
        setSecondsLeft(left)
      } else if (warning.current) {
        // Another tab reported activity, so the warning is no longer needed.
        warning.current = false
        setSecondsLeft(null)
      }
    }, 1000)

    return () => {
      window.clearInterval(timer)
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, onActivity))
    }
  }, [signOut])

  return (
    <Modal title="Are you still there?" open={secondsLeft !== null} onClose={stay}>
      <p role="alert">
        For your security you will be signed out in <strong>{secondsLeft} {secondsLeft === 1 ? 'second' : 'seconds'}</strong> because
        there has been no activity.
      </p>
      <div className="idle-actions">
        <Button onClick={stay}>Stay signed in</Button>
        <Button variant="ghost" onClick={signOut}>Sign out now</Button>
      </div>
    </Modal>
  )
}
