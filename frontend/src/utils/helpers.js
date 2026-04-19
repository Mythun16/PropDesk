/** Format number in Indian lakhs/crore notation with ₹ prefix */
export function formatIndianPrice(value) {
  if (value == null) return '—'
  const num = Number(value)
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`
  return `₹${num.toLocaleString('en-IN')}`
}

/** Format number with Indian comma grouping */
export function formatIndianNumber(value) {
  if (value == null) return '—'
  return Number(value).toLocaleString('en-IN')
}

/** Zero-pad set number to 3 digits */
export function formatSetNo(num) {
  return `#${String(num).padStart(3, '0')}`
}

/** Convert facing short code to full word */
const facingMap = {
  E: 'East', W: 'West', N: 'North', S: 'South',
  NE: 'North-East', NW: 'North-West', SE: 'South-East', SW: 'South-West',
}
export function formatFacing(code) {
  return facingMap[code] || code
}

/** Format date to DD/MM/YYYY */
export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB')
}

/** Format datetime to DD/MM/YYYY HH:MM */
export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

/** Get initials from a full name */
export function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

/**
 * Get badge CSS class for property status (new extended set) or lead status.
 * Returns a string like "badge badge-available".
 */
export function statusBadgeClass(status) {
  const map = {
    // Property statuses
    available: 'badge-available',
    in_discussion: 'badge-committed',   // maps to same amber style
    committed: 'badge-committed',       // legacy
    negotiating: 'badge-negotiating',
    deal_closed: 'badge-closed',
    closed: 'badge-closed',             // legacy
    withdrawn: 'badge-withdrawn',
    // Lead statuses
    new: 'badge-new',
    contacted: 'badge-contacted',
    follow_up: 'badge-follow_up',
    site_visit: 'badge-site_visit',
    in_progress: 'badge-in_progress',   // legacy
    converted: 'badge-converted',
    lost: 'badge-lost',
  }
  return `badge ${map[status] || ''}`
}

/** Human-readable label for a status value */
export function statusLabel(status) {
  const labels = {
    available: 'Available',
    in_discussion: 'In Discussion',
    committed: 'In Discussion',
    negotiating: 'Negotiating',
    deal_closed: 'Deal Closed',
    closed: 'Deal Closed',
    withdrawn: 'Withdrawn',
    new: 'New',
    contacted: 'Contacted',
    follow_up: 'Follow Up',
    site_visit: 'Site Visit',
    in_progress: 'In Progress',
    negotiating_lead: 'Negotiating',
    converted: 'Converted',
    lost: 'Lost',
  }
  return labels[status] || status
}

/** Human-readable label for a source value */
export function sourceLabel(source) {
  const labels = {
    '99acres': '99acres',
    magicbricks: 'MagicBricks',
    nobroker: 'NoBroker',
    olx: 'OLX',
    walk_in: 'Walk-in',
    agent_upload: 'Agent Upload',
    whatsapp: 'WhatsApp',
  }
  return labels[source] || source || '—'
}

/** Get image URL from filename */
export function imageUrl(filename) {
  if (!filename) return ''
  if (filename.startsWith('http')) return filename
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
  const baseUrl = apiUrl.replace(/\/api\/?$/, '')
  return `${baseUrl}/uploads/${filename}`
}

/** Extract display location string from either new or legacy format */
export function displayLocation(property) {
  if (property?.location?.locality || property?.location?.city) {
    const parts = [property.location.locality, property.location.city].filter(Boolean)
    return parts.join(', ')
  }
  return [property?.location_str, property?.district].filter(Boolean).join(', ') || property?.location || '—'
}

/** Extract display price — prefers new 'price' field, falls back to total_property_value */
export function displayPrice(property) {
  return property?.price ?? property?.total_property_value ?? null
}

/** Get current user from localStorage */
export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user'))
  } catch { return null }
}

/** Check if user is logged in */
export function isLoggedIn() {
  return !!localStorage.getItem('token')
}

/** Logout */
export function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  window.location.href = '/login'
}
