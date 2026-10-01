const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60 * 1000).toISOString()
const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

export const teamMembers = [
  { id: 'nk', name: 'Naledi Khumalo', shortName: 'Naledi K.', role: 'Project Manager', initials: 'NK', email: 'naledi@lethabom.co.za', allocated: true },
  { id: 'tm', name: 'Thabo Molefe', shortName: 'Thabo M.', role: 'UI/UX Designer', initials: 'TM', email: 'thabo@lethabom.co.za', allocated: true },
  { id: 'sd', name: 'Sipho Dlamini', shortName: 'Sipho D.', role: 'Software Developer', initials: 'SD', email: 'sipho@lethabom.co.za', allocated: true },
  { id: 'an', name: 'Amahle Nkosi', shortName: 'Amahle N.', role: 'Software Developer', initials: 'AN', email: 'amahle@lethabom.co.za', allocated: true },
  { id: 'lp', name: 'Lerato Pule', shortName: 'Lerato P.', role: 'Graphic Designer', initials: 'LP', email: 'lerato@lethabom.co.za', allocated: true },
  { id: 'km', name: 'Karabo Mensah', shortName: 'Karabo M.', role: 'Content Creator', initials: 'KM', email: 'karabo@lethabom.co.za', allocated: false },
]

export const clients = [
  { id: 'kunene', name: 'Kunene Attorneys', contact: 'Thandi Kunene', email: 'thandi@kunene.co.za' },
  { id: 'greenfield', name: 'Greenfield Academy', contact: 'Peter Naidoo', email: 'peter@greenfield.co.za' },
  { id: 'vuka', name: 'Vuka Retail', contact: 'Lindiwe Ndlovu', email: 'lindiwe@vukaretail.co.za' },
  { id: 'botlumelo', name: 'Botlumelo Clinic', contact: 'Dr. Masego K.', email: 'masego@botlumelo.co.za' },
  { id: 'northwind', name: 'Northwind Logistics', contact: 'Johan Venter', email: 'johan@northwind.co.za' },
  { id: 'sahara', name: 'Sahara Foods', contact: 'Amina Yusuf', email: 'amina@saharafoods.co.za' },
  { id: 'metrodental', name: 'Metro Dental', contact: 'Dr. Claire Adams', email: 'claire@metrodental.co.za' },
]

export const users = [
  { id: 'user-admin', name: 'Boitumelo Sithole', email: 'admin@lethabom.co.za', password: 'connect123', role: 'administrator', title: 'Administrator', active: true },
  { id: 'user-nk', name: 'Naledi Khumalo', email: 'naledi@lethabom.co.za', password: 'connect123', role: 'manager', memberId: 'nk', title: 'Project Manager', active: true },
  { id: 'user-sipho', name: 'Sipho Dlamini', email: 'sipho@lethabom.co.za', password: 'connect123', role: 'developer', memberId: 'sd', title: 'Software Developer', active: true },
  { id: 'user-thandi', name: 'Thandi Kunene', email: 'thandi@kunene.co.za', password: 'connect123', role: 'client', clientId: 'kunene', title: 'Kunene Attorneys', active: true },
  { id: 'user-lindiwe', name: 'Lindiwe Ndlovu', email: 'lindiwe@vukaretail.co.za', password: 'connect123', role: 'client', clientId: 'vuka', title: 'Vuka Retail', active: true },
]

const kuneneTasks = [
  { id: 't1', title: 'Collect final copy for Practice Areas page', type: 'content', status: 'backlog', assigneeId: null, dueLabel: 'No date', description: 'Waiting for a developer to be assigned.' },
  { id: 't2', title: 'Set up contact form email routing', type: 'dev', status: 'backlog', assigneeId: 'sd', dueLabel: 'No date' },
  { id: 't3', title: 'Build responsive nav + footer components', type: 'dev', status: 'in_progress', assigneeId: 'sd', dueLabel: '22 Aug' },
  { id: 't4', title: 'Design attorney profile page template', type: 'design', status: 'in_progress', assigneeId: 'tm', dueLabel: '22 Aug' },
  { id: 't5', title: 'Homepage hero + services section', type: 'design', status: 'in_review', assigneeId: 'tm', dueLabel: 'Awaiting client' },
  { id: 't6', title: 'Brand colour palette + typography', type: 'design', status: 'done', assigneeId: 'lp', dueLabel: '12 Aug' },
  { id: 't7', title: 'Site map + page structure', type: 'content', status: 'done', assigneeId: 'km', dueLabel: '08 Aug' },
  { id: 't8', title: 'Discovery workshop notes', type: 'content', status: 'done', assigneeId: 'nk', dueLabel: '18 Jul' },
  { id: 't9', title: 'Competitor review', type: 'design', status: 'done', assigneeId: 'tm', dueLabel: '21 Jul' },
]

export const projects = [
  {
    id: 'kunene-web',
    clientId: 'kunene',
    name: 'Website Rebuild',
    service: 'Website Rebuild',
    status: 'in_progress',
    stage: 'development',
    startedLabel: '14 Jul',
    dueLabel: '12 Sep',
    dueThisWeek: true,
    memberIds: ['nk', 'tm', 'sd'],
    milestones: [
      { id: 'm1', name: 'Discovery', targetLabel: '21 Jul', status: 'complete' },
      { id: 'm2', name: 'Design', targetLabel: '12 Aug', status: 'complete' },
      { id: 'm3', name: 'Development', targetLabel: '12 Sep', status: 'planned' },
      { id: 'm4', name: 'Testing', targetLabel: '20 Sep', status: 'planned' },
      { id: 'm5', name: 'Launch', targetLabel: '30 Sep', status: 'planned' },
    ],
    tasks: kuneneTasks,
    files: [
      { id: 'f1', name: 'Homepage_v3.fig', kind: 'Fig', uploadedBy: 'Thabo', createdAt: daysAgo(2), approval: 'pending' },
      { id: 'f2', name: 'Sitemap_Final.pdf', kind: 'PDF', uploadedBy: 'Sipho', createdAt: daysAgo(5), approval: 'approved' },
      { id: 'f3', name: 'Attorney_Profile_Template.fig', kind: 'Fig', uploadedBy: 'Thabo', createdAt: hoursAgo(3), approval: 'pending' },
    ],
    comments: [
      { id: 'c1', authorName: 'Kunene Attorneys', initials: 'KA', role: 'client', body: 'Can we make the hero text a bit larger?', createdAt: hoursAgo(1), read: false },
      { id: 'c2', authorName: 'Thabo (Design)', initials: 'TM', role: 'team', body: 'Updated, please review v3.', createdAt: minutesAgo(45), read: true },
    ],
  },
  {
    id: 'greenfield-sms',
    clientId: 'greenfield',
    name: 'School Mgmt System',
    service: 'School Mgmt System',
    status: 'in_progress',
    stage: 'development',
    startedLabel: '01 Aug',
    dueLabel: '28 Sep',
    dueThisWeek: false,
    progress: 46,
    memberIds: ['an', 'sd', 'nk'],
    tasks: [],
    files: [],
    comments: [
      { id: 'c4', authorName: 'Greenfield Academy', initials: 'GA', role: 'client', body: 'Please confirm the parent portal is in this phase.', createdAt: hoursAgo(8), read: false },
    ],
  },
  {
    id: 'vuka-store',
    clientId: 'vuka',
    name: 'E-commerce Store',
    service: 'E-commerce Store',
    status: 'in_review',
    stage: 'testing',
    startedLabel: '20 Jun',
    dueLabel: '03 Sep',
    dueThisWeek: true,
    progress: 81,
    memberIds: ['an', 'tm'],
    tasks: [],
    files: [
      { id: 'f5', name: 'Checkout_flow.fig', kind: 'Fig', uploadedBy: 'Thabo', createdAt: hoursAgo(6), approval: 'pending' },
    ],
    comments: [
      { id: 'c5', authorName: 'Vuka Retail', initials: 'VR', role: 'client', body: 'Left a comment on the checkout flow.', createdAt: minutesAgo(34), read: false },
    ],
  },
  {
    id: 'botlumelo-app',
    clientId: 'botlumelo',
    name: 'Booking Mobile App',
    service: 'Booking Mobile App',
    status: 'at_risk',
    stage: 'design',
    startedLabel: '11 Jul',
    dueLabel: '18 Sep',
    dueThisWeek: false,
    progress: 34,
    memberIds: ['lp', 'nk', 'sd'],
    tasks: [
      { id: 'tb1', title: 'Booking calendar API', type: 'dev', status: 'in_progress', assigneeId: 'sd', dueLabel: '01 Sep', overdue: true, description: 'Past the agreed hand-off date.' },
    ],
    files: [],
    comments: [
      { id: 'c6', authorName: 'Botlumelo Clinic', initials: 'BC', role: 'client', body: 'Flagged a delay concern on the booking calendar.', createdAt: daysAgo(1), read: false },
    ],
  },
  {
    id: 'kunene-brand',
    clientId: 'kunene',
    name: 'Brand Guidelines',
    service: 'Brand System',
    status: 'in_review',
    stage: 'testing',
    startedLabel: '02 Jun',
    dueLabel: '19 Sep',
    dueThisWeek: false,
    progress: 92,
    memberIds: ['lp', 'tm'],
    tasks: [],
    files: [
      { id: 'f4', name: 'Brand_Guidelines_v2.pdf', kind: 'PDF', uploadedBy: 'Lerato', createdAt: daysAgo(1), approval: 'pending' },
    ],
    comments: [
      { id: 'c3', authorName: 'Kunene Attorneys', initials: 'KA', role: 'client', body: 'The gold should match the office signage.', createdAt: hoursAgo(5), read: false },
    ],
  },
  {
    id: 'northwind-portal',
    clientId: 'northwind',
    name: 'Client Portal',
    service: 'Client Portal',
    status: 'in_progress',
    stage: 'development',
    startedLabel: '18 Aug',
    dueLabel: '21 Oct',
    dueThisWeek: false,
    progress: 28,
    memberIds: ['sd', 'km'],
    tasks: [],
    files: [],
    comments: [],
  },
  {
    id: 'metro-appointments',
    clientId: 'metrodental',
    name: 'Appointment Site',
    service: 'Appointment Site',
    status: 'in_review',
    stage: 'testing',
    startedLabel: '04 Aug',
    dueLabel: '09 Oct',
    dueThisWeek: false,
    progress: 74,
    memberIds: ['tm', 'an'],
    tasks: [],
    files: [],
    comments: [],
  },
]

export const invoices = [
  {
    id: 'inv231',
    number: 'INV231',
    clientId: 'kunene',
    projectId: 'kunene-web',
    title: 'Milestone 2',
    status: 'pending',
    issuedLabel: '14 Aug',
    dueLabel: '29 Aug',
    items: [
      { id: 'li1', description: 'Milestone 2 — Development', amount: 16000 },
      { id: 'li2', description: 'Third party API setup', amount: 2500 },
    ],
  },
  {
    id: 'inv230',
    number: 'INV230',
    clientId: 'vuka',
    projectId: 'vuka-store',
    title: 'Final',
    status: 'overdue',
    issuedLabel: '02 Aug',
    dueLabel: '16 Aug',
    items: [{ id: 'li3', description: 'Final delivery', amount: 26000 }],
  },
  {
    id: 'inv229',
    number: 'INV229',
    clientId: 'greenfield',
    projectId: 'greenfield-sms',
    title: 'Deposit',
    status: 'paid',
    issuedLabel: '28 Jul',
    dueLabel: '04 Aug',
    items: [{ id: 'li4', description: 'Project deposit', amount: 15000 }],
  },
  {
    id: 'inv228',
    number: 'INV228',
    clientId: 'botlumelo',
    projectId: 'botlumelo-app',
    title: 'Deposit',
    status: 'paid',
    issuedLabel: '20 Jul',
    dueLabel: '27 Jul',
    items: [{ id: 'li5', description: 'Project deposit', amount: 12000 }],
  },
  {
    id: 'inv227',
    number: 'INV227',
    clientId: 'northwind',
    projectId: 'northwind-portal',
    title: 'Discovery',
    status: 'paid',
    issuedLabel: '18 Aug',
    dueLabel: '25 Aug',
    items: [{ id: 'li6', description: 'Discovery and scope', amount: 22000 }],
  },
  {
    id: 'inv226',
    number: 'INV226',
    clientId: 'metrodental',
    projectId: 'metro-appointments',
    title: 'Design phase',
    status: 'paid',
    issuedLabel: '04 Aug',
    dueLabel: '11 Aug',
    items: [{ id: 'li7', description: 'Design phase', amount: 19500 }],
  },
]

export const activities = [
  { id: 'a1', projectId: 'kunene-web', text: 'Kunene Attorneys approved the homepage design', createdAt: minutesAgo(10) },
  { id: 'a2', projectId: 'vuka-store', text: 'Vuka Retail left a comment on checkout flow', createdAt: minutesAgo(34) },
  { id: 'a3', projectId: 'greenfield-sms', text: 'Greenfield Academy viewed invoice #INV229', createdAt: hoursAgo(2) },
  { id: 'a4', projectId: 'botlumelo-app', text: 'Botlumelo Clinic flagged a delay concern', createdAt: daysAgo(1) },
]

export const changeRequests = [
  {
    id: 'cr1',
    projectId: 'kunene-web',
    clientId: 'kunene',
    description: 'Add a second-language toggle on the homepage. This was not in the agreed page list.',
    status: 'submitted',
    createdAt: hoursAgo(4),
  },
]

export const requirements = [
  { id: 'rq1', projectId: 'kunene-web', text: 'Practice areas page with an attorney profile for each partner.', status: 'confirmed' },
  { id: 'rq2', projectId: 'kunene-web', text: 'Contact form delivered to reception@kunene.co.za.', status: 'recorded' },
]

export const notifications = [
  { id: 'n1', userId: 'user-nk', projectId: 'kunene-web', text: 'Kunene Attorneys submitted a change request on Website Rebuild.', read: false, createdAt: hoursAgo(4) },
  { id: 'n2', userId: 'user-sipho', projectId: 'kunene-web', text: 'You were assigned “Build responsive nav + footer components”.', read: false, createdAt: hoursAgo(6) },
  { id: 'n3', userId: 'user-thandi', projectId: 'kunene-web', text: 'A new design was uploaded to Website Rebuild.', read: false, createdAt: hoursAgo(3) },
]

export function cloneSeed() {
  return {
    users: structuredClone(users),
    clients: structuredClone(clients),
    projects: structuredClone(projects),
    invoices: structuredClone(invoices),
    activities: structuredClone(activities),
    changeRequests: structuredClone(changeRequests),
    requirements: structuredClone(requirements),
    notifications: structuredClone(notifications),
  }
}
