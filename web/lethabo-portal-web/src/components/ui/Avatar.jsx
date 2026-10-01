import { cx } from '../../lib/format'

export function Avatar({ initials, size, tone = 'dark' }) {
  return <span className={cx('avatar', size === 'lg' && 'avatar--lg', tone === 'light' && 'avatar--light')}>{initials}</span>
}

export function AvatarStack({ people }) {
  return (
    <span className="avatar-stack" aria-hidden="true">
      {people.slice(0, 3).map((person) => (
        <Avatar key={person.id} initials={person.initials} />
      ))}
    </span>
  )
}
