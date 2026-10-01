import { STAGES } from '../../domain/catalog'
import { cx } from '../../lib/format'

export function MilestoneTrack({ stage, milestones = [] }) {
  if (milestones.length) {
    const firstOpen = milestones.findIndex((item) => item.status !== 'complete')
    return (
      <div className="milestones">
        {milestones.map((item, index) => (
          <div key={item.id} className={cx('milestone', item.status === 'complete' && 'is-done', index === firstOpen && 'is-current')}>
            <div className="milestone__track" />
            <small>{item.name}</small>
          </div>
        ))}
      </div>
    )
  }
  const currentIndex = Math.max(0, STAGES.findIndex((item) => item.id === stage))
  return (
    <div className="milestones">
      {STAGES.map((item, index) => (
        <div key={item.id} className={cx('milestone', index < currentIndex && 'is-done', index === currentIndex && 'is-current')}>
          <div className="milestone__track" />
          <small>{item.label}</small>
        </div>
      ))}
    </div>
  )
}
