import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import PendingPage from './pages/PendingPage'
import OnboardingPage from './pages/OnboardingPage'
import UnauthorizedPage from './pages/UnauthorizedPage'
import LastPageTracker from './components/LastPageTracker'
import AgentDashboard from './pages/agent/AgentDashboard'
import AllListings from './pages/agent/AllListings'
import MyListings from './pages/agent/MyListings'
import UploadListing from './pages/agent/UploadListing'
import ListingDetail from './pages/agent/ListingDetail'
import LeadsPage from './pages/agent/LeadsPage'
import AgentSettings from './pages/agent/AgentSettings'
import AdminDashboard from './pages/admin/AdminDashboard'
import AgentPerformance from './pages/admin/AgentPerformance'
import AgentDetail from './pages/admin/AgentDetail'
import AdminSettings from './pages/admin/AdminSettings'

export default function App() {
  return (
    <AuthProvider>
      <LastPageTracker />
      <Routes>
        {/* Public */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route path="/pending" element={<PendingPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Dashboard Wrapper */}
        <Route element={<AppLayout />}>
          {/* Agent routes */}
          <Route element={<ProtectedRoute allowedRoles={['agent']} />}>
            <Route path="/agent/dashboard" element={<AgentDashboard />} />
            <Route path="/agent/listings" element={<AllListings />} />
            <Route path="/agent/listings/new" element={<UploadListing />} />
            <Route path="/agent/listings/:id" element={<ListingDetail />} />
            <Route path="/agent/my-listings" element={<MyListings />} />
            <Route path="/agent/leads" element={<LeadsPage />} />
            <Route path="/agent/settings" element={<AgentSettings />} />
          </Route>

          {/* Admin routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/agents" element={<AgentPerformance />} />
            <Route path="/admin/agents/:id" element={<AgentDetail />} />
            <Route path="/admin/listings" element={<AllListings adminView />} />
            <Route path="/admin/listings/:id" element={<ListingDetail />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}
