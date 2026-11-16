import { passwordChecks } from '../../lib/passwordPolicy'

// Live checklist shown under the new-password field.
export function PasswordRequirements({ password, personal = [] }) {
  const checks = passwordChecks(password, personal)
  return (
    <ul className="pw-rules" aria-live="polite" aria-label="Password requirements">
      {checks.map((check) => {
        const state = !check.typed ? 'idle' : check.met ? 'met' : 'unmet'
        return (
          <li key={check.id} className={`pw-rules__item pw-rules__item--${state}`}>
            <span aria-hidden="true">{state === 'met' ? '✓' : state === 'unmet' ? '✗' : '•'}</span>{' '}
            {check.label}
            <span className="sr-only">{state === 'met' ? ' (met)' : state === 'unmet' ? ' (not met)' : ''}</span>
          </li>
        )
      })}
    </ul>
  )
}
