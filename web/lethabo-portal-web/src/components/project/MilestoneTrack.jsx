import { STAGES } from '../../domain/catalog'
import { cx } from '../../lib/format'

export function MilestoneTrack({ stage }) {
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
