import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Hash } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function PendingPage() {
  const { logout, login, user } = useAuth()
  const nav = useNavigate()
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogout = () => {
    logout()
    nav('/login', { replace: true })
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!joinCode.trim()) return toast.error('Enter your join code')
    setLoading(true)
    try {
      await api.post('/auth/join-company', { join_code: joinCode.trim().toUpperCase() })
      // Re-fetch updated user info
      const meRes = await api.get('/auth/me')
      login(localStorage.getItem('token'), meRes.data)
      toast.success('Joined successfully!')
      nav('/agent/dashboard', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid join code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pending-page">
      <div className="pending-card">
        <Clock size={48} color="#D97706" />
        <h2>Join Your Company</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          You're not linked to a company yet. Enter the join code your admin shared with you, or wait to be added by an admin.
        </p>

        <form onSubmit={handleJoin} style={{ width: '100%' }}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Hash size={14} /> Company Join Code
            </label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. A3F9B2"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={8}
              style={{ letterSpacing: '0.15em', fontWeight: 600, textTransform: 'uppercase', textAlign: 'center' }}
              disabled={loading}
            />
          </div>
          <button
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.65rem', marginBottom: '0.75rem' }}
            type="submit"
            disabled={loading || !joinCode.trim()}
          >
            {loading ? 'Joining...' : 'Join Company'}
          </button>
        </form>

        <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleLogout}>
          Sign Out
        </button>
      </div>
    </div>
  )
}
