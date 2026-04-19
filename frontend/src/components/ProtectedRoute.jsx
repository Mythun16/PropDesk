import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function defaultDashboard(role) {
  if (role === 'admin') return '/admin/dashboard'
  if (role === 'telecaller') return '/telecaller/dashboard'
  return '/agent/dashboard'
}

function isValidLastPageForRole(role, path) {
  if (!path || path === '/login' || path === '/unauthorized' || path === '/onboarding' || path === '/pending') return false
  if (role === 'admin') return path.startsWith('/admin/')
  if (role === 'telecaller') return path.startsWith('/telecaller/')
  if (role === 'agent') return path.startsWith('/agent/')
  return false
}

export function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="loading-screen">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

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
    if (user.is_new_user === true || user.role === 'guest') return <Navigate to="/onboarding" replace />
    if (!user.company_id && user.role !== 'admin') return <Navigate to="/pending" replace />
    
    // Only redirect to last_page if it is a valid route for this user's role
    if (user.last_page && isValidLastPageForRole(user.role, user.last_page)) {
      return <Navigate to={user.last_page} replace />
    }
    return <Navigate to={defaultDashboard(user.role)} replace />
  }

  return <Outlet />
}
