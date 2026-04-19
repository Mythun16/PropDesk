import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { formatIndianPrice, formatSetNo, formatDate, statusBadgeClass } from '../../utils/helpers'
import { BarChart3, CheckCircle2, Clock, Package, Building2, ArrowRight, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'

export default function AgentDashboard() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const nav = useNavigate()

  const fetchData = async () => {
    try {
      const listRes = await api.get('/listings', { params: { agent_only: true } })
      setListings(listRes.data)
    } catch { toast.error('Failed to load dashboard') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const ownedListings = listings.filter(l => !l.is_collaboration)
  const collabListings = listings.filter(l => l.is_collaboration)
  const available = ownedListings.filter(l => l.status === 'available')
  const committed = ownedListings.filter(l => ['in_discussion', 'negotiating', 'committed'].includes(l.status))
  const closed = ownedListings.filter(l => ['deal_closed', 'closed'].includes(l.status))

  const handleClose = async (id) => {
    if (!confirm('Mark this listing as deal closed?')) return
    try {
      await api.patch(`/listings/${id}/status`, { status: 'deal_closed' })
      toast.success('Listing marked as deal closed!')
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
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--heading)' }}>{ownedListings.length}</div>
              {collabListings.length > 0 && (
                <div style={{ fontSize: '0.7rem', color: '#7C3AED', marginTop: '0.15rem', fontWeight: 600 }}>
                  +{collabListings.length} collaboration{collabListings.length > 1 ? 's' : ''}
                </div>
              )}
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
              <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', fontWeight: 600, textTransform: 'uppercase' }}>In Discussion</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--stat-committed)' }}>{committed.length}</div>
            </div>
            <Clock size={28} color="var(--stat-committed)" />
          </div>
        </div>
        <div className="stat-card" style={{ borderTopColor: 'var(--stat-closed)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', fontWeight: 600, textTransform: 'uppercase' }}>Deal Closed</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--stat-closed)' }}>{closed.length}</div>
            </div>
            <CheckCircle2 size={28} color="var(--stat-closed)" />
          </div>
        </div>
      </div>

      {/* In Discussion deals */}
      {committed.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--heading)', marginBottom: '0.75rem' }}>In Discussion / Negotiating</h2>
          <div className="listings-grid">
            {committed.map(l => (
              <div key={l.id} className="card" style={{ borderLeft: '3px solid var(--stat-committed)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--heading)' }}>{formatSetNo(l.set_no)}</span>
                  <span className={statusBadgeClass(l.status)}>{l.status}</span>
                </div>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{l.locality || l.location_str || '—'}, {l.city || l.district || '—'}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted-text)' }}>{l.dimensions} • {formatIndianPrice(l.price || l.total_property_value)}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted-text)', marginTop: '0.35rem' }}>
                  {l.committed_client_name && <>Client: {l.committed_client_name} • {formatDate(l.committed_date)}</>}
                </div>
                <button className="btn-primary" style={{ marginTop: '0.75rem', width: '100%', justifyContent: 'center' }} onClick={() => handleClose(l.id)}>
                  Mark as Deal Closed
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Collaborations */}
      {collabListings.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--heading)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} color="#7C3AED" />
            <span>My Collaborations</span>
            <span style={{ background: '#EDE9FE', color: '#7C3AED', borderRadius: 12, padding: '0.1rem 0.5rem', fontSize: '0.72rem', fontWeight: 700 }}>
              {collabListings.length}
            </span>
          </h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #C4B5FD' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Set #</th><th>Location</th><th>Value</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {collabListings.map(l => (
                  <tr key={l.id} onClick={() => nav(`/agent/listings/${l.id}`)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600 }}>{formatSetNo(l.set_no)}</td>
                    <td>{l.locality || l.location_str || '—'}, {l.city || l.district || '—'}</td>
                    <td style={{ color: 'var(--price-highlight)', fontWeight: 600 }}>{formatIndianPrice(l.price || l.total_property_value)}</td>
                    <td><span className={statusBadgeClass(l.status)}>{l.status}</span></td>
                    <td>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                        background: '#EDE9FE', color: '#7C3AED', padding: '0.15rem 0.45rem', borderRadius: 8,
                      }}>Collab</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  <th>Set #</th><th>Location</th><th>District / City</th><th>Area</th><th>Value</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {listings.slice(0, 5).map(l => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600 }}>{formatSetNo(l.set_no)}</td>
                    <td>{l.locality || l.location_str || '—'}</td>
                    <td>{l.city || l.district || '—'}</td>
                    <td>{(l.total_area_sqft || l.area_sqft)?.toLocaleString('en-IN')} sqft</td>
                    <td style={{ color: 'var(--price-highlight)', fontWeight: 600 }}>{formatIndianPrice(l.price || l.total_property_value)}</td>
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
