import { PageIntro } from '../../components/layout/AppShell'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatRelative } from '../../lib/format'
import { useAppState } from '../../state/useAppState'

export function NotificationsPage({ backTo }) {
  const { user, notifications, markNotificationRead } = useAppState()
  const mine = notifications.filter((item) => item.userId === user?.id)
  return (
    <>
      <PageIntro eyebrow={backTo} title="Notifications" subtitle="Updates stay here until you open them, including anything that arrived while you were away." />
      <Card>
        {mine.length === 0 ? <p className="empty">No notifications yet.</p> : null}
        {mine.map((item) => (
          <button className="file-row" key={item.id} type="button" onClick={() => markNotificationRead(item.id)} style={{ width: '100%', background: 'transparent', border: 0, textAlign: 'left' }}>
            <span className="activity__dot" />
            <div className="file-copy">
              <strong>{item.text}</strong>
              <small>{formatRelative(item.createdAt)}{item.read ? '' : ' · New'}</small>
            </div>
            {!item.read ? <StatusBadge status="submitted" label="New" /> : null}
          </button>
        ))}
      </Card>
    </>
  )
}
