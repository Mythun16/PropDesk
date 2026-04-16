/**  Format number in Indian lakhs/crore notation with ₹ prefix */
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

/** Get initials from a full name */
export function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

/** Get the badge class for a status */
export function statusBadgeClass(status) {
  const map = {
    available: 'badge-available',
    committed: 'badge-committed',
    closed: 'badge-closed',
    new: 'badge-new',
    in_progress: 'badge-in_progress',
    converted: 'badge-converted',
    lost: 'badge-lost',
  }
  return `badge ${map[status] || ''}`
}

/** Get image URL from filename */
export function imageUrl(filename) {
  if (!filename) return ''
  if (filename.startsWith('http')) return filename

  // Gets the API URL (e.g. https://propdesk.onrender.com/api) and strips '/api'
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  const baseUrl = apiUrl.replace(/\/api\/?$/, '');

  return `${baseUrl}/uploads/${filename}`;
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
