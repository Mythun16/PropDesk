import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { formatDate, formatIndianPrice, formatSetNo, statusBadgeClass, getInitials } from '../../utils/helpers'
import { ArrowLeft } from 'lucide-react'

export default function AgentDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/agents/${id}`)
        setData(res.data)
      } catch { toast.error('Agent not found'); nav(-1) }
      finally { setLoading(false) }
    })()
  }, [id])

  if (loading) return <div className="page-container"><div className="skeleton" style={{ height: 400 }} /></div>
  if (!data) return null

  const { agent, listings, leads } = data

  return (
    <div className="page-container">
      <button className="btn-secondary" style={{ marginBottom: '1rem' }} onClick={() => nav(-1)}>
        <ArrowLeft size={16} /> Back
      </button>

      {/* Agent info card */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem', fontWeight: 700, background: 'var(--filter-active-bg)', color: 'var(--heading)',
        }}>
          {agent.avatar_url ? <img src={agent.avatar_url} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : getInitials(agent.full_name)}
        </div>
        <div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--heading)' }}>{agent.full_name}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted-text)' }}>{agent.email} • {agent.phone || 'No phone'}</div>
          <div style={{ marginTop: '0.25rem' }}>
            <span className={`badge badge-${agent.auth_provider}`}>{agent.auth_provider}</span>
            {!agent.is_active && <span className="badge badge-closed" style={{ marginLeft: '0.5rem' }}>Inactive</span>}
          </div>
        </div>
      </div>

      {/* Listings */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--heading)', marginBottom: '0.75rem' }}>Listings ({listings.length})</h2>
      {listings.length > 0 ? (
        <div className="card" style={{ padding: 0, overflow: 'auto', marginBottom: '1.5rem' }}>
          <table className="data-table">
            <thead><tr><th>Set #</th><th>Location</th><th>District</th><th>Area</th><th>Value</th><th>Type</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {listings.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 600 }}>{formatSetNo(l.set_no)}</td>
                  <td>{l.location}</td><td>{l.district}</td>
                  <td>{l.total_area_sqft?.toLocaleString('en-IN')} sqft</td>
                  <td style={{ fontWeight: 600, color: 'var(--price-highlight)' }}>{formatIndianPrice(l.total_property_value)}</td>
                  <td><span className={`badge badge-${l.property_type?.toLowerCase()}`}>{l.property_type}</span></td>
                  <td><span className={statusBadgeClass(l.status)}>{l.status}</span></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--muted-text)' }}>{formatDate(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div className="empty-state" style={{ padding: '1.5rem' }}><p>No listings</p></div>}

      {/* Leads */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--heading)', marginBottom: '0.75rem' }}>Leads ({leads.length})</h2>
      {leads.length > 0 ? (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Client</th><th>Phone</th><th>Location</th><th>Budget</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {leads.map(ld => (
                <tr key={ld.id}>
                  <td style={{ fontWeight: 600 }}>{ld.client_name}</td>
                  <td>{ld.client_phone}</td><td>{ld.preferred_location}, {ld.preferred_district}</td>
                  <td>{formatIndianPrice(ld.budget_min)} – {formatIndianPrice(ld.budget_max)}</td>
                  <td><span className={statusBadgeClass(ld.status)}>{ld.status}</span></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--muted-text)' }}>{formatDate(ld.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div className="empty-state" style={{ padding: '1.5rem' }}><p>No leads</p></div>}
    </div>
  )
}
