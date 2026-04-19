import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { formatDate, statusBadgeClass, statusLabel, sourceLabel } from '../../utils/helpers'
import { PhoneCall, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function TelecallerDashboard() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await api.get('/leads', { params: { all_agents: true } })
        setLeads(res.data)
      } catch { toast.error('Failed to load leads') }
      finally { setLoading(false) }
    }
    fetchLeads()
  }, [])

  const unverified = leads.filter(l => !l.telecaller_verified && l.status === 'new')
  const verified = leads.filter(l => l.telecaller_verified)
  const followUp = leads.filter(l => l.status === 'follow_up' || l.status === 'site_visit')

  const verifyLead = async (lead) => {
    try {
      const res = await api.patch(`/leads/${lead.id}/verify`)
      setLeads(prev => prev.map(l => l.id === lead.id ? res.data : l))
      toast.success('Lead verified!')
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  if (loading) return (
    <div className="page-container">
      {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 100, marginBottom: '1rem' }} />)}
    </div>
  )

  return (
    <div className="page-container">
      <h1 className="page-title">Telecaller Dashboard</h1>
      <p style={{ color: 'var(--muted-text)', marginBottom: '1.5rem' }}>
        Welcome, {user?.full_name}. Verify and follow up on incoming leads.
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Unverified Leads', value: unverified.length, icon: AlertCircle, color: '#F59E0B', bg: '#FEF3C7' },
          { label: 'Verified Leads', value: verified.length, icon: CheckCircle2, color: '#10B981', bg: '#ECFDF5' },
          { label: 'Follow-ups / Site Visits', value: followUp.length, icon: Clock, color: '#6366F1', bg: '#EEF2FF' },
          { label: 'Total Leads', value: leads.length, icon: PhoneCall, color: '#3B82F6', bg: '#EFF6FF' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
            <div style={{ width: 40, height: 40, background: bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} color={color} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--heading)' }}>{value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', fontWeight: 500 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Unverified lead queue */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--heading)', margin: 0 }}>
            Unverified Lead Queue
            {unverified.length > 0 && (
              <span style={{ marginLeft: '0.5rem', background: '#FEF3C7', color: '#D97706', borderRadius: 12, padding: '0.1rem 0.5rem', fontSize: '0.75rem' }}>
                {unverified.length}
              </span>
            )}
          </h2>
          <button className="btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => nav('/telecaller/leads')}>
            View All Leads
          </button>
        </div>

        {unverified.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-text)' }}>
            <CheckCircle2 size={40} color="#10B981" style={{ margin: '0 auto 0.75rem' }} />
            <p style={{ fontWeight: 600 }}>All new leads verified!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {unverified.slice(0, 10).map(lead => (
              <div key={lead.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.85rem 1rem', background: 'var(--page-bg)', borderRadius: 8,
                gap: '1rem', flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--heading)' }}>
                    {lead.client?.name || lead.client_name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted-text)', marginTop: '0.2rem' }}>
                    {lead.client?.phone || lead.client_phone}
                    {lead.source && <> · <span style={{ fontWeight: 600 }}>{sourceLabel(lead.source)}</span></>}
                    {' · '}{formatDate(lead.created_at)}
                  </div>
                  {(lead.preferred_location || lead.requirements?.preferred_location) && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted-text)' }}>
                      {lead.preferred_location || lead.requirements?.preferred_location}
                      {(lead.preferred_district || lead.requirements?.preferred_district) &&
                        `, ${lead.preferred_district || lead.requirements?.preferred_district}`}
                    </div>
                  )}
                </div>
                <button
                  className="btn-primary"
                  style={{ padding: '0.4rem 1rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                  onClick={() => verifyLead(lead)}
                >
                  <CheckCircle2 size={14} style={{ marginRight: '0.3rem' }} />
                  Verify
                </button>
              </div>
            ))}
            {unverified.length > 10 && (
              <button className="btn-secondary" style={{ alignSelf: 'center' }} onClick={() => nav('/telecaller/leads')}>
                View {unverified.length - 10} more →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Follow-up reminders */}
      {followUp.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--heading)', marginBottom: '1rem' }}>
            Follow-ups &amp; Site Visits
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {followUp.map(lead => (
              <div key={lead.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem 1rem', background: 'var(--page-bg)', borderRadius: 8, gap: '1rem',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{lead.client?.name || lead.client_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)' }}>
                    {lead.client?.phone || lead.client_phone}
                    {lead.follow_up_at && <> · Follow up: {formatDate(lead.follow_up_at)}</>}
                  </div>
                </div>
                <span className={statusBadgeClass(lead.status)}>{statusLabel(lead.status)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
