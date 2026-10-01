export function Logo({ audience = 'team', tone = 'on-dark' }) {
  const sub = audience === 'client' ? 'CONNECT — CLIENT' : 'CONNECT — TEAM'
  return (
    <div className={tone === 'on-light' ? 'logo logo--on-light' : 'logo'}>
      <span className="logo__mark">LM</span>
      <span>
        <span className="logo__name">LETHABO M</span>
        <span className="logo__sub">{sub}</span>
      </span>
    </div>
  )
}
