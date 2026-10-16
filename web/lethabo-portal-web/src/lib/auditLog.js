export const CATEGORIES = [
  { id: 'signins', label: 'User access' },
  { id: 'all', label: 'Everything' },
  { id: 'accounts', label: 'Accounts' },
]

const SENTENCES = {
  signin: (e) => `${e.actor} signed in`,
  signin_failed: (e) => `A failed sign-in was recorded for ${e.target}`,
  signout: (e) => `${e.actor} signed out`,
  user_added: (e) => `${e.actor} added ${e.target} to the team`,
  user_edited: (e) => `${e.actor} updated ${e.target}'s account`,
  user_deactivated: (e) => `${e.actor} blocked ${e.target} from signing in`,
  user_activated: (e) => `${e.actor} allowed ${e.target} to sign in again`,
  account_ready: (e) => `${e.actor} chose a password and activated ${e.target}`,
  password_reset: (e) => `${e.actor} reset the password for ${e.target}`,
  project_created: (e) => `${e.actor} created the project ${e.target}`,
  project_updated: (e) => `${e.actor} updated the project ${e.target}`,
  change_decided: (e) => `${e.actor} decided on the change request ${e.target}`,
}

export const describeEvent = (e) =>
  (SENTENCES[e.type] ?? ((x) => `${x.actor} did something to ${x.target}`))(e)

const sameDay = (a, b) => a.toDateString() === b.toDateString()

export function dayLabel(iso) {
  const d = new Date(iso)
  const now = new Date()
  const yest = new Date(now.getTime() - 86400000)
  if (sameDay(d, now)) return 'Today'
  if (sameDay(d, yest)) return 'Yesterday'
  return d.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })
}

export const timeLabel = (iso) =>
  new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })

const at = (daysAgo, h, m) => {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export const SAMPLE_AUDIT = [
  { id: 'a1', at: at(0, 9, 12), actor: 'Boitumelo Sithole', type: 'signin', category: 'signins', target: '' },
  { id: 'a2', at: at(0, 9, 31), actor: 'Boitumelo Sithole', type: 'user_added', category: 'accounts', target: 'Lindiwe Ndlovu',
    detail: [['Role', '', 'Client'], ['Company', '', 'Vuka Retail']] },
  { id: 'a3', at: at(0, 9, 48), actor: 'Naledi Khumalo', type: 'project_updated', category: 'projects', target: 'Website Rebuild',
    detail: [['Due date', '29 Aug', '12 Sep']] },
  { id: 'a4', at: at(0, 10, 2), actor: 'Unknown', type: 'signin_failed', category: 'signins', target: 'sipho@lethabom.example' },
  { id: 'a5', at: at(1, 15, 20), actor: 'Boitumelo Sithole', type: 'user_deactivated', category: 'accounts', target: 'Thandi Kunene',
    detail: [['Account', 'Active', 'Deactivated']] },
  { id: 'a6', at: at(1, 14, 5), actor: 'Naledi Khumalo', type: 'change_decided', category: 'changes', target: 'Add WhatsApp order button',
    detail: [['Status', 'Under review', 'Approved']] },
  { id: 'a7', at: at(2, 11, 40), actor: 'Boitumelo Sithole', type: 'user_edited', category: 'accounts', target: 'Sipho Dlamini',
    detail: [['Job title', 'Developer', 'Software Developer']] },
  { id: 'a8', at: at(3, 8, 55), actor: 'Naledi Khumalo', type: 'project_created', category: 'projects', target: 'Client Portal' },
]