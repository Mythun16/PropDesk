import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { Building2, Hash, CheckCircle2, ArrowRight, AlertTriangle } from 'lucide-react'

export default function AgentSettings() {
  const { user, setUser } = useAuth()
  const nav = useNavigate()

  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [joined, setJoined] = useState(false)
  const [joinedCompany, setJoinedCompany] = useState(null)
  const [companyInfo, setCompanyInfo] = useState(null)

  const hasCompany = !!user?.company_id

  // Refresh user to get latest company_name
  useEffect(() => {
    api.get('/auth/me').then(res => {
      setUser(res.data)
      if (res.data.company_name) setCompanyInfo({ name: res.data.company_name })
    }).catch(() => {})
  }, [])

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!joinCode.trim()) return toast.error('Enter a join code')
    setLoading(true)
    try {
      const res = await api.post('/auth/join-company', { join_code: joinCode.trim() })
      toast.success(`Joined "${res.data.company_name}" successfully!`)
      setJoinedCompany(res.data.company_name)
      setJoined(true)
      // Update the user in context so UI reflects the new company
      const meRes = await api.get('/auth/me')
      setUser(meRes.data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to join company')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Settings</h1>

      {/* Company status card */}
      <div className="card" style={{ maxWidth: 520, marginBottom: '1.5rem' }}>
        <h3 style={{
          fontSize: '1rem', fontWeight: 700, color: 'var(--heading)',
          marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          <Building2 size={18} /> Company
        </h3>

        {hasCompany && !joined ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.85rem 1rem', background: '#ECFDF5',
            borderRadius: 8, border: '1px solid #A7F3D0',
          }}>
            <CheckCircle2 size={20} color="#059669" />
            <div>
              <div style={{ fontWeight: 600, color: '#065F46', fontSize: '0.9rem' }}>
                Linked to: {companyInfo?.name ?? 'a company'}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#047857', marginTop: '0.15rem' }}>
                Your listings and leads are visible to your admin.
                To join a different company, enter the new join code below.
              </div>
            </div>
          </div>
        ) : joined ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.85rem 1rem', background: '#ECFDF5',
            borderRadius: 8, border: '1px solid #A7F3D0',
            marginBottom: '1rem',
          }}>
            <CheckCircle2 size={20} color="#059669" />
            <div>
              <div style={{ fontWeight: 600, color: '#065F46', fontSize: '0.9rem' }}>
                Joined "{joinedCompany}"!
              </div>
              <div style={{ fontSize: '0.78rem', color: '#047857', marginTop: '0.15rem' }}>
                You're now part of this company's team.
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            padding: '0.85rem 1rem', background: '#FEF3C7',
            borderRadius: 8, border: '1px solid #FCD34D',
            marginBottom: '1.25rem',
          }}>
            <div style={{ fontWeight: 600, color: '#92400E', fontSize: '0.875rem' }}>
              Not linked to any company
            </div>
            <div style={{ fontSize: '0.78rem', color: '#B45309', marginTop: '0.25rem' }}>
              Enter your admin's join code below to connect your account.
            </div>
          </div>
        )}

        {/* Always show the join code form so agents can switch / join */}
        {!joined && (
          <form onSubmit={handleJoin} style={{ marginTop: hasCompany ? '1.25rem' : 0 }}>
            {hasCompany && (
              <p style={{ fontSize: '0.8rem', color: 'var(--muted-text)', marginBottom: '0.75rem' }}>
                Want to join a different company? Enter the new join code below.
              </p>
            )}
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
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
                style={{ letterSpacing: '0.15em', fontWeight: 600, textTransform: 'uppercase' }}
                disabled={loading}
              />
              <p style={{ fontSize: '0.72rem', color: 'var(--muted-text)', marginTop: '0.35rem' }}>
                Get this code from your admin — it's shown in their Settings page.
              </p>
            </div>
            <button
              className="btn-primary"
              type="submit"
              disabled={loading || !joinCode.trim()}
              style={{ width: '100%', justifyContent: 'center', padding: '0.65rem' }}
            >
              {loading ? 'Joining...' : (
                <>Join Company <ArrowRight size={15} style={{ marginLeft: '0.25rem' }} /></>
              )}
            </button>
          </form>
        )}

        {joined && (
          <button
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.65rem' }}
            onClick={() => nav('/agent/dashboard')}
          >
            Go to Dashboard <ArrowRight size={15} style={{ marginLeft: '0.25rem' }} />
          </button>
        )}
      </div>
    </div>
  )
}
