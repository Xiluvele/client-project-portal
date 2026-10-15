import { useMemo, useState } from 'react'
import { PageIntro } from '../../components/layout/AppShell'
import { Card } from '../../components/ui/Card'
import { useAppState } from '../../state/useAppState'
import { CATEGORIES, SAMPLE_AUDIT, describeEvent, dayLabel, timeLabel } from '../../lib/auditLog'

const initials = (name = '?') => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

export function AuditTrailPage() {
  // Uses auditLog from app state when it exists, otherwise the sample events.
  const state = useAppState()
  const live = state.auditLog ?? []
  const events = live.length ? [...live, ...SAMPLE_AUDIT.filter((sample) => !live.some((item) => item.id === sample.id))] : SAMPLE_AUDIT
  const [category, setCategory] = useState('signins')

  const counts = useMemo(() => {
    const map = { all: events.length }
    events.forEach((e) => { map[e.category] = (map[e.category] || 0) + 1 })
    return map
  }, [events])

  const days = useMemo(() => {
    const sorted = events
      .filter((e) => category === 'all' || e.category === category)
      .sort((a, b) => new Date(b.at) - new Date(a.at))
    const map = new Map()
    sorted.forEach((e) => {
      const key = dayLabel(e.at)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(e)
    })
    return [...map.entries()]
  }, [events, category])

  return (
    <>
      <PageIntro title="Audit trail" subtitle="User access first: who signed in, who was blocked, and what changed afterwards." />

      <div className="audit-filters" role="group" aria-label="Filter the audit trail">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className="audit-filter"
            aria-pressed={category === c.id}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
            <span className="audit-filter__n">{counts[c.id] || 0}</span>
          </button>
        ))}
      </div>

      <Card>
        <div className="audit-feed">
          {days.length === 0 ? <p className="empty">No activity to show yet.</p> : null}
          {days.map(([day, list]) => (
            <section key={day} className="audit-day">
              <h2 className="audit-day__title">{day}</h2>
              <ol className="audit-list">
                {list.map((e) => {
                  const text = describeEvent(e)
                  const startsWithActor = e.actor && text.startsWith(e.actor)
                  return (
                    <li key={e.id} className="audit-item">
                      <span className="audit-avatar" aria-hidden="true">{initials(e.actor)}</span>
                      <div className="audit-item__body">
                        <p className="audit-item__text">
                          {startsWithActor ? (
                            <>
                              <strong>{e.actor}</strong>
                              {text.slice(e.actor.length)}
                            </>
                          ) : text}
                        </p>
                        {e.detail ? (
                          <p className="audit-item__detail">
                            {e.detail.map(([k, from, to]) => `${k}: ${from ? `${from} → ` : ''}${to}`).join('  |  ')}
                          </p>
                        ) : null}
                      </div>
                      <time className="audit-item__time" dateTime={e.at}>{timeLabel(e.at)}</time>
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
        </div>
      </Card>
    </>
  )
}