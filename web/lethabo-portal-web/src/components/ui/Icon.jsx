export function Icon({ name, className = 'icon' }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', className, 'aria-hidden': true }
  switch (name) {
    case 'dashboard':
      return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
    case 'projects':
      return <svg {...common}><path d="M4 7h16M4 12h16M4 17h10" /></svg>
    case 'clients':
      return <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.6-2.6 2.7-4 5.5-4s4.9 1.4 5.5 4" /><circle cx="17" cy="9" r="2.2" /><path d="M16 15.2c2.2.3 3.8 1.5 4.5 3.8" /></svg>
    case 'invoices':
      return <svg {...common}><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v5h5M9 13h6M9 17h6" /></svg>
    case 'team':
      return <svg {...common}><circle cx="8" cy="9" r="2.4" /><circle cx="16" cy="9" r="2.4" /><path d="M3.8 19c.5-2.4 2.2-3.6 4.2-3.6s3.7 1.2 4.2 3.6M12 15.4c1.8.1 3.3 1.2 3.9 3.6" /></svg>
    case 'settings':
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" /></svg>
    case 'search':
      return <svg {...common}><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
    case 'plus':
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>
    case 'close':
      return <svg {...common}><path d="M6 6l12 12M18 6 6 18" /></svg>
    case 'logout':
      return <svg {...common}><path d="M10 7V5H5v14h5v-2" /><path d="M10 12h9M16 8l4 4-4 4" /></svg>
    case 'bell':
      return <svg {...common}><path d="M6 16h12l-1-2v-4a5 5 0 0 0-10 0v4z" /><path d="M10 18a2 2 0 0 0 4 0" /></svg>
    case 'menu':
      return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
    default:
      return null
  }
}
