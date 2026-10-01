import { PageIntro } from '../../components/layout/AppShell'
import { Card } from '../../components/ui/Card'
import { useAppState } from '../../state/useAppState'

export function SettingsPage() {
  const { user } = useAppState()
  return (
    <>
      <PageIntro title="Settings" subtitle="Account details for this workspace. Billing and notification services connect when the API is in place." />
      <Card>
        <div className="stack">
          <div><span className="field__label">Name</span><p>{user?.name}</p></div>
          <div><span className="field__label">Email</span><p>{user?.email}</p></div>
          <div><span className="field__label">Access</span><p>{user?.role === 'manager' ? 'Team / Project Manager' : 'Client'}</p></div>
          <p className="notice">Client records stay separated by account. A client login cannot open another client's projects.</p>
        </div>
      </Card>
    </>
  )
}
