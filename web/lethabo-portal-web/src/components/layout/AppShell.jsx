import { Link, NavLink, Outlet } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { formatRelative } from '../../lib/format'
import { useAppState } from '../../state/useAppState'
import { Avatar } from '../ui/Avatar'
import { Icon } from '../ui/Icon'
import { Logo } from '../ui/Logo'

const TEAM_LINKS = [
  { to: '/team/projects', label: 'Projects', icon: 'projects' },
  { to: '/team/invoices', label: 'Invoices', icon: 'invoices' },
  { to: '/team/members', label: 'Team', icon: 'team' },
]

const CLIENT_LINKS = [
  { to: '/client/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/client/invoices', label: 'Invoices', icon: 'invoices' },
]

const DEVELOPER_LINKS = [
  { to: '/developer/projects', label: 'Projects', icon: 'projects' },
  { to: '/developer/tasks', label: 'My tasks', icon: 'dashboard' },
]

const NOTIFICATION_PAGE = {
  team: '/team/notifications',
  client: '/client/notifications',
  developer: '/developer/notifications',
}

const ADMIN_LINKS = [
  { to: '/admin/users', label: 'Team & Access', icon: 'team' },
  { to: '/admin/audit', label: 'Audit trail', icon: 'invoices' },
]

const LINKS = {
  team: TEAM_LINKS,
  client: CLIENT_LINKS,
  developer: DEVELOPER_LINKS,
  administrator: ADMIN_LINKS,
}

function NotificationBell({ to }) {
  const { user, notifications, markNotificationRead } = useAppState()
  const [open, setOpen] = useState(false)
  const panel = useRef(null)
  const mine = notifications.filter((item) => item.userId === user?.id)
  const unread = mine.filter((item) => !item.read).length

  useEffect(() => {
    if (!open) return undefined
    const close = (event) => {
      if (!panel.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="bell" ref={panel}>
      <button className="bell__button" type="button" aria-label={unread ? `Notifications, ${unread} new` : 'Notifications'} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <Icon name="bell" />
        {unread ? <span className="bell__count">{unread}</span> : null}
      </button>
      {open ? (
        <div className="bell-menu" role="menu">
          <div className="bell-menu__head">
            <strong>Notifications</strong>
            {to ? <Link to={to} onClick={() => setOpen(false)}>See all</Link> : null}
          </div>
          {mine.length === 0 ? <p className="empty">No notifications yet.</p> : null}
          {mine.slice(0, 5).map((item) => (
            <button
              key={item.id}
              className={item.read ? 'bell-menu__item' : 'bell-menu__item is-new'}
              type="button"
              onClick={() => markNotificationRead(item.id)}
            >
              <span>{item.text}</span>
              <small>{formatRelative(item.createdAt)}</small>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function AppShell({ audience }) {
  const { user, logout } = useAppState()
  const [open, setOpen] = useState(false)
  const links = LINKS[audience] ?? TEAM_LINKS
  const initials = user?.name?.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="shell">
      {open ? <button className="scrim" aria-label="Close menu" onClick={() => setOpen(false)} /> : null}
      <aside className={open ? 'sidebar is-open' : 'sidebar'}>
        <Logo audience={audience} />
        <nav className="sidebar__nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')} onClick={() => setOpen(false)}>
              <Icon name={link.icon} />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__user">
          <Avatar initials={initials || 'LM'} />
          <div>
            <strong>{user?.name}</strong>
            <span>{user?.title}</span>
          </div>
          <button className="sidebar__logout" type="button" aria-label="Log out" onClick={logout}>
            <Icon name="logout" />
          </button>
        </div>
      </aside>
      <main className="shell__main">
        <header className="topbar">
          <button className="btn btn--secondary menu-btn" type="button" onClick={() => setOpen(true)}>
            <Icon name="menu" /> Menu
          </button>
          <NotificationBell to={NOTIFICATION_PAGE[audience]} />
          <Avatar initials={initials || 'LM'} size="lg" />
        </header>
        <Outlet />
      </main>
    </div>
  )
}

export function PageIntro({ eyebrow, title, subtitle, actions, meta }) {
  return (
    <header className="page-head">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
        {meta ? <div className="meta-line">{meta}</div> : null}
      </div>
      {actions ? <div className="page-head__actions">{actions}</div> : null}
    </header>
  )
}