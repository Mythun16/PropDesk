import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from './Sidebar'

export function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="loading-screen">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // First-time users always go through onboarding.
  if (user.is_new_user === true || user.role === 'guest') {
    return <Navigate to="/onboarding" replace />
  }

  if (user.company_id === null && allowedRoles && user.role !== 'admin') {
    return <Navigate to="/pending" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}

export function PublicRoute() {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div className="loading-screen">Loading...</div>
  }

  if (user) {
    // New users should be onboarded first.
    if (user.is_new_user === true || user.role === 'guest') return <Navigate to="/onboarding" replace />
    // If company isn't set, keep non-admins in setup.
    if (!user.company_id && user.role !== 'admin') return <Navigate to="/pending" replace />
    // Returning users resume where they left off.
    if (user.last_page) return <Navigate to={user.last_page} replace />
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/agent/dashboard'} replace />
  }

  return <Outlet />
}
