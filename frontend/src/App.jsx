import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import ErrorBoundary from './components/ErrorBoundary'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'
import LastPageTracker from './components/LastPageTracker'

import LoginPage from './pages/LoginPage'
import PendingPage from './pages/PendingPage'
import OnboardingPage from './pages/OnboardingPage'
import UnauthorizedPage from './pages/UnauthorizedPage'

// Agent pages
import AgentDashboard from './pages/agent/AgentDashboard'
import AllListings from './pages/agent/AllListings'
import MyListings from './pages/agent/MyListings'
import UploadListing from './pages/agent/UploadListing'
import ListingDetail from './pages/agent/ListingDetail'
import LeadsPage from './pages/agent/LeadsPage'
import AgentSettings from './pages/agent/AgentSettings'
import MatchingTool from './pages/agent/MatchingTool'

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AgentPerformance from './pages/admin/AgentPerformance'
import AgentDetail from './pages/admin/AgentDetail'
import AdminSettings from './pages/admin/AdminSettings'
import PortalPosts from './pages/admin/PortalPosts'
import AgentPortalPosts from './pages/agent/AgentPortalPosts'
import WhatsappDispatches from './pages/admin/WhatsappDispatches'

// Telecaller pages
import TelecallerDashboard from './pages/telecaller/TelecallerDashboard'

export default function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <NotificationProvider>
      <LastPageTracker />
      <Routes>
        {/* Public */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route path="/pending" element={<PendingPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Dashboard wrapper */}
        <Route element={<AppLayout />}>

          {/* Agent routes */}
          <Route element={<ProtectedRoute allowedRoles={['agent']} />}>
            <Route path="/agent/dashboard" element={<AgentDashboard />} />
            <Route path="/agent/listings" element={<AllListings />} />
            <Route path="/agent/listings/new" element={<UploadListing />} />
            <Route path="/agent/listings/:id" element={<ListingDetail />} />
            <Route path="/agent/my-listings" element={<MyListings />} />
            <Route path="/agent/leads" element={<LeadsPage />} />
            <Route path="/agent/match" element={<MatchingTool />} />
            <Route path="/agent/portal-posts" element={<AgentPortalPosts />} />
            <Route path="/agent/settings" element={<AgentSettings />} />
          </Route>

          {/* Admin routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/agents" element={<AgentPerformance />} />
            <Route path="/admin/agents/:id" element={<AgentDetail />} />
            <Route path="/admin/listings" element={<AllListings adminView />} />
            <Route path="/admin/listings/new" element={<UploadListing />} />
            <Route path="/admin/listings/:id" element={<ListingDetail />} />
            <Route path="/admin/portal-posts" element={<PortalPosts />} />
            <Route path="/admin/whatsapp" element={<WhatsappDispatches />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>

          {/* Telecaller routes */}
          <Route element={<ProtectedRoute allowedRoles={['telecaller']} />}>
            <Route path="/telecaller/dashboard" element={<TelecallerDashboard />} />
            {/* Telecaller reuses LeadsPage with all_agents view */}
            <Route path="/telecaller/leads" element={<LeadsPage telecallerView />} />
            <Route path="/telecaller/settings" element={<AgentSettings />} />
          </Route>

        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </NotificationProvider>
    </AuthProvider>
    </ErrorBoundary>
  )
}
