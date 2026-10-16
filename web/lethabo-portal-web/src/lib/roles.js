export function homeFor(role) {
  if (role === 'client') return '/client/dashboard'
  if (role === 'developer') return '/developer/tasks'
  if (role === 'administrator') return '/admin/users'
  return '/team/projects'
}

export function roleLabel(role) {
  if (role === 'administrator') return 'Administrator'
  if (role === 'manager') return 'Project Manager'
  if (role === 'developer') return 'Developer'
  if (role === 'client') return 'Client'
  return role
}
