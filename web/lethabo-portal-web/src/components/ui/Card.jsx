import { cx } from '../../lib/format'

export function Card({ children, className, padded = true }) {
  return <section className={cx('card', padded && 'card__pad', className)}>{children}</section>
}

export function StatCard({ label, value, hint, hintTone, dark = false }) {
  return (
    <article className={cx('card', 'stat', dark && 'stat--dark')}>
      <div>
        <div className="stat__label">{label}</div>
        <div className="stat__value">{value}</div>
      </div>
      {hint ? <div className={cx('stat__hint', hintTone && `stat__hint--${hintTone}`)}>{hint}</div> : null}
    </article>
  )
}

export function ProgressBar({ value, thin = false }) {
  const safe = Math.max(0, Math.min(100, value))
  return (
    <div className={cx('progress', thin && 'progress--thin')} role="meter" aria-valuenow={safe} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress__bar" style={{ width: `${safe}%` }} />
    </div>
  )
}
