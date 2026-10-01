import { NavLink, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { useAppState } from '../../state/useAppState'
import { Avatar } from '../ui/Avatar'
import { Icon } from '../ui/Icon'
import { Logo } from '../ui/Logo'

const TEAM_LINKS = [
  { to: '/team/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/team/projects', label: 'Projects', icon: 'projects' },
  { to: '/team/clients', label: 'Clients', icon: 'clients' },
  { to: '/team/invoices', label: 'Invoices', icon: 'invoices' },
  { to: '/team/members', label: 'Team', icon: 'team' },
  { to: '/team/settings', label: 'Settings', icon: 'settings' },
]

const CLIENT_LINKS = [
  { to: '/client/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/client/projects', label: 'Projects', icon: 'projects' },
  { to: '/client/invoices', label: 'Invoices', icon: 'invoices' },
]

export function AppShell({ audience }) {
  const { user, logout } = useAppState()
  const [open, setOpen] = useState(false)
  const links = audience === 'client' ? CLIENT_LINKS : TEAM_LINKS
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
        <button className="btn btn--secondary menu-btn" type="button" onClick={() => setOpen(true)}>
          <Icon name="menu" /> Menu
        </button>
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
