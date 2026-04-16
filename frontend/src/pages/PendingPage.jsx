import { Clock, Building2 } from 'lucide-react'
import { logout } from '../utils/helpers'

export default function PendingPage() {
  return (
    <div className="pending-page">
      <div className="pending-card">
        <Clock size={48} color="#D97706" />
        <h2>Account Pending</h2>
        <p>
          Your account has been created via Google. Please contact your company
          admin to be assigned to a team. You'll be able to access the CRM once
          your admin assigns you.
        </p>
        <button className="btn-secondary" style={{ marginTop: '1rem' }} onClick={logout}>
          Sign Out
        </button>
      </div>
    </div>
  )
}
