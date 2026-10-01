export function formatRand(amount) {
  const value = Number(amount) || 0
  return `R ${value.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`
}

export function formatRelative(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const delta = Date.now() - then
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (delta < minute) return 'Just now'
  if (delta < hour) {
    const minutes = Math.round(delta / minute)
    return `${minutes} min${minutes === 1 ? '' : 's'} ago`
  }
  if (delta < day) {
    const hours = Math.round(delta / hour)
    return `${hours} hr${hours === 1 ? '' : 's'} ago`
  }
  if (delta < 2 * day) return 'Yesterday'
  if (delta < 7 * day) {
    const days = Math.round(delta / day)
    return `${days} days ago`
  }
  return new Date(iso).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })
}

export function greetingFor(date = new Date()) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function firstName(name = '') {
  return name.trim().split(' ')[0] || name
}

export function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

export function createId(prefix) {
  const random = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${Date.now().toString(36)}-${random}`
}
