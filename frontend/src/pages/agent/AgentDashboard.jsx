import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { formatIndianPrice, formatSetNo, formatDate, statusBadgeClass, getCurrentUser } from '../../utils/helpers'
import { BarChart3, CheckCircle2, Clock, Package, Building2, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AgentDashboard() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const user = getCurrentUser()
  const nav = useNavigate()

  const fetchData = async () => {
    try {
      const res = await api.get('/listings', { params: { agent_only: true } })
      setListings(res.data)
    } catch { toast.error('Failed to load dashboard') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const available = listings.filter(l => l.status === 'available')
  const committed = listings.filter(l => l.status === 'committed')
  const closed = listings.filter(l => l.status === 'closed')

  const handleClose = async (id) => {
    if (!confirm('Mark this listing as closed?')) return
    try {
      await api.patch(`/listings/${id}/close`)
      toast.success('Listing closed!')
      fetchData()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  if (loading) return (
    <div className="page-container">
      <div className="stats-grid">
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 90 }} />)}
      </div>
    </div>
  )

  return (
    <div className="page-container">
      <h1 className="page-title">Welcome back, {user?.full_name?.split(' ')[0]} 👋</h1>

      {/* Company join prompt — shown only when agent has no company */}
      {!user?.company_id && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#FEF3C7', border: '1px solid #FCD34D',
          borderRadius: 10, padding: '0.875rem 1.1rem', marginBottom: '1.25rem', gap: '1rem',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Building2 size={20} color="#D97706" />
            <div>
              <div style={{ fontWeight: 700, color: '#92400E', fontSize: '0.875rem' }}>
                You're not linked to any company yet
              </div>
              <div style={{ fontSize: '0.775rem', color: '#B45309' }}>
                Ask your admin for a join code to connect your account.
              </div>
            </div>
          </div>
          <button
            className="btn-primary"
            style={{ background: '#D97706', borderColor: '#D97706', padding: '0.45rem 0.9rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            onClick={() => nav('/agent/settings')}
          >
            Enter Join Code <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', fontWeight: 600, textTransform: 'uppercase' }}>Total Listings</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--heading)' }}>{listings.length}</div>
            </div>
            <Package size={28} color="var(--stat-border)" />
          </div>
        </div>
        <div className="stat-card" style={{ borderTopColor: 'var(--stat-available)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', fontWeight: 600, textTransform: 'uppercase' }}>Available</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--stat-available)' }}>{available.length}</div>
            </div>
            <BarChart3 size={28} color="var(--stat-available)" />
          </div>
        </div>
        <div className="stat-card" style={{ borderTopColor: 'var(--stat-committed)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', fontWeight: 600, textTransform: 'uppercase' }}>Committed</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--stat-committed)' }}>{committed.length}</div>
            </div>
            <Clock size={28} color="var(--stat-committed)" />
          </div>
        </div>
        <div className="stat-card" style={{ borderTopColor: 'var(--stat-closed)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', fontWeight: 600, textTransform: 'uppercase' }}>Closed</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--stat-closed)' }}>{closed.length}</div>
            </div>
            <CheckCircle2 size={28} color="var(--stat-closed)" />
          </div>
        </div>
      </div>

      {/* Committed deals */}
      {committed.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--heading)', marginBottom: '0.75rem' }}>Committed Deals</h2>
          <div className="listings-grid">
            {committed.map(l => (
              <div key={l.id} className="card" style={{ borderLeft: '3px solid var(--stat-committed)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--heading)' }}>{formatSetNo(l.set_no)}</span>
                  <span className={statusBadgeClass('committed')}>Committed</span>
                </div>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{l.location}, {l.district}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted-text)' }}>{l.dimensions} • {formatIndianPrice(l.total_property_value)}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted-text)', marginTop: '0.35rem' }}>
                  Client: {l.committed_client_name} • {formatDate(l.committed_date)}
                </div>
                <button className="btn-primary" style={{ marginTop: '0.75rem', width: '100%', justifyContent: 'center' }} onClick={() => handleClose(l.id)}>
                  Mark as Closed
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent listings */}
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--heading)', marginBottom: '0.75rem' }}>Recently Added</h2>
        {listings.length === 0 ? (
          <div className="empty-state"><p>No listings yet. Upload your first plot!</p></div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Set #</th><th>Location</th><th>District</th><th>Area</th><th>Value</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {listings.slice(0, 5).map(l => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600 }}>{formatSetNo(l.set_no)}</td>
                    <td>{l.location}</td>
                    <td>{l.district}</td>
                    <td>{l.total_area_sqft?.toLocaleString('en-IN')} sqft</td>
                    <td style={{ color: 'var(--price-highlight)', fontWeight: 600 }}>{formatIndianPrice(l.total_property_value)}</td>
                    <td><span className={statusBadgeClass(l.status)}>{l.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
