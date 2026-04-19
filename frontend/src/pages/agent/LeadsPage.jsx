import { useState, useEffect } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { formatIndianPrice, formatDate, formatDateTime, statusBadgeClass, statusLabel, sourceLabel } from '../../utils/helpers'
import { UserPlus, CheckCircle2, Calendar } from 'lucide-react'

const LEAD_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'site_visit', label: 'Site Visit' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
]

const SOURCES = [
  { value: '', label: 'Select source...' },
  { value: '99acres', label: '99acres' },
  { value: 'magicbricks', label: 'MagicBricks' },
  { value: 'nobroker', label: 'NoBroker' },
  { value: 'olx', label: 'OLX' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'agent_upload', label: 'Agent Upload' },
  { value: 'whatsapp', label: 'WhatsApp' },
]

const defaultForm = {
  client_name: '', client_phone: '', client_email: '',
  source: '',
  preferred_location: '', preferred_district: '',
  preferred_property_type: 'Any',
  budget_min: '', budget_max: '',
  area_min_sqft: '', area_max_sqft: '',
  facing_preference: '', open_sides_needed: '',
  notes: '', follow_up_at: '',
}

export default function LeadsPage({ telecallerView = false }) {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ...defaultForm })
  const [submitting, setSubmitting] = useState(false)
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterSource, setFilterSource] = useState('')

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterStatus !== 'All') params.status = filterStatus
      if (filterSource) params.source = filterSource
      if (telecallerView) params.all_agents = true
      const res = await api.get('/leads', { params })
      setLeads(res.data)
    } catch { toast.error('Failed to load leads') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchLeads() }, [filterStatus, filterSource])

  const handleAdd = async () => {
    if (!form.client_name || !form.client_phone) return toast.error('Client name and phone are required')
    if (form.budget_min && form.budget_max && Number(form.budget_min) > Number(form.budget_max)) {
      return toast.error('Budget min cannot exceed budget max')
    }
    setSubmitting(true)
    try {
      const payload = {
        client_name: form.client_name,
        client_phone: form.client_phone,
        client_email: form.client_email || null,
        source: form.source || null,
        preferred_location: form.preferred_location || null,
        preferred_district: form.preferred_district || null,
        preferred_property_type: form.preferred_property_type,
        budget_min: form.budget_min ? Number(form.budget_min) : null,
        budget_max: form.budget_max ? Number(form.budget_max) : null,
        area_min_sqft: form.area_min_sqft ? Number(form.area_min_sqft) : null,
        area_max_sqft: form.area_max_sqft ? Number(form.area_max_sqft) : null,
        facing_preference: form.facing_preference || null,
        open_sides_needed: form.open_sides_needed ? Number(form.open_sides_needed) : null,
        notes: form.notes || null,
        follow_up_at: form.follow_up_at || null,
      }
      await api.post('/leads', payload)
      toast.success('Lead added!')
      setShowModal(false)
      setForm({ ...defaultForm })
      fetchLeads()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setSubmitting(false) }
  }

  const updateStatus = async (lead, newStatus) => {
    try {
      await api.put(`/leads/${lead.id}`, { status: newStatus })
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: newStatus } : l))
    } catch { toast.error('Failed to update status') }
  }

  const verifyLead = async (lead) => {
    try {
      const res = await api.patch(`/leads/${lead.id}/verify`)
      setLeads(prev => prev.map(l => l.id === lead.id ? res.data : l))
      toast.success('Lead verified!')
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  if (loading) return <div className="page-container"><div className="skeleton" style={{ height: 300 }} /></div>

  return (
    <div className="page-container">
      <div className="page-header-row">
        <h1 className="page-title" style={{ margin: 0 }}>
          {telecallerView ? 'Lead Queue' : 'Leads'}
        </h1>
        {!telecallerView && (
          <button className="btn-primary page-header-button" onClick={() => setShowModal(true)}>
            <UserPlus size={16} /> Add Lead
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <select className="form-select" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="All">All Statuses</option>
          {LEAD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className="form-select" style={{ width: 'auto' }} value={filterSource} onChange={e => setFilterSource(e.target.value)}>
          <option value="">All Sources</option>
          {SOURCES.filter(s => s.value).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {leads.length === 0 ? (
        <div className="empty-state">
          <UserPlus size={48} />
          <p>{telecallerView ? 'No leads in queue.' : 'No leads recorded yet.'}</p>
          {!telecallerView && (
            <button className="btn-primary" onClick={() => setShowModal(true)}>Add Your First Lead</button>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Phone</th>
                <th>Source</th>
                <th>Location</th>
                <th>Budget</th>
                <th>Type</th>
                <th>Follow Up</th>
                <th>Status</th>
                <th>Verified</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(ld => (
                <tr key={ld.id}>
                  <td style={{ fontWeight: 600 }}>
                    {ld.client?.name || ld.client_name}
                  </td>
                  <td>{ld.client?.phone || ld.client_phone}</td>
                  <td>
                    {ld.source ? (
                      <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', background: '#EFF6FF', color: '#1D4ED8', borderRadius: 10, fontWeight: 600 }}>
                        {sourceLabel(ld.source)}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    {ld.preferred_location || ld.requirements?.preferred_location || '—'}
                    {(ld.preferred_district || ld.requirements?.preferred_district) &&
                      <span style={{ color: 'var(--muted-text)' }}>
                        {' · '}{ld.preferred_district || ld.requirements?.preferred_district}
                      </span>
                    }
                  </td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                    {ld.budget_min || ld.requirements?.budget_min
                      ? `${formatIndianPrice(ld.budget_min || ld.requirements?.budget_min)} – ${formatIndianPrice(ld.budget_max || ld.requirements?.budget_max)}`
                      : '—'
                    }
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{ld.preferred_property_type || ld.requirements?.preferred_property_type || '—'}</td>
                  <td style={{ fontSize: '0.8rem', color: ld.follow_up_at ? 'var(--heading)' : 'var(--muted-text)' }}>
                    {ld.follow_up_at ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={12} />
                        {formatDate(ld.follow_up_at)}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    <select
                      className="form-select"
                      style={{ width: 'auto', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                      value={ld.status}
                      onChange={e => updateStatus(ld, e.target.value)}
                    >
                      {LEAD_STATUSES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {ld.telecaller_verified ? (
                      <CheckCircle2 size={16} color="#10B981" title="Verified by telecaller" />
                    ) : telecallerView ? (
                      <button
                        className="btn-primary"
                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                        onClick={() => verifyLead(ld)}
                      >
                        Verify
                      </button>
                    ) : (
                      <span style={{ color: 'var(--muted-text)', fontSize: '0.75rem' }}>No</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--muted-text)' }}>{formatDate(ld.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Lead Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Add New Lead</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
              <div className="form-group">
                <label className="form-label">Client Name *</label>
                <input className="form-input" value={form.client_name} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone *</label>
                <input className="form-input" value={form.client_phone} onChange={e => setForm(p => ({ ...p, client_phone: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" value={form.client_email} onChange={e => setForm(p => ({ ...p, client_email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Source</label>
                <select className="form-select" value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
                  {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Preferred Location</label>
                <input className="form-input" value={form.preferred_location} onChange={e => setForm(p => ({ ...p, preferred_location: e.target.value }))} placeholder="e.g. Tambaram" />
              </div>
              <div className="form-group">
                <label className="form-label">District</label>
                <input className="form-input" value={form.preferred_district} onChange={e => setForm(p => ({ ...p, preferred_district: e.target.value }))} placeholder="e.g. Chennai" />
              </div>
              <div className="form-group">
                <label className="form-label">Property Type</label>
                <select className="form-select" value={form.preferred_property_type} onChange={e => setForm(p => ({ ...p, preferred_property_type: e.target.value }))}>
                  <option value="Any">Any</option>
                  <option value="house">House</option>
                  <option value="plot">Plot</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Follow-up Date</label>
                <input className="form-input" type="date" value={form.follow_up_at} onChange={e => setForm(p => ({ ...p, follow_up_at: e.target.value }))} />
              </div>
            </div>

            {/* Budget range */}
            <div className="form-group">
              <label className="form-label">Budget Range (₹)</label>
              <div className="budget-range-card">
                <div className="budget-range-values">
                  <span>{formatIndianPrice(form.budget_min || 0)}</span>
                  <span>{formatIndianPrice(form.budget_max || 0)}</span>
                </div>
                <div className="budget-range-sliders">
                  <input
                    className="range-input" type="range"
                    min="100000" max="50000000" step="100000"
                    value={form.budget_min || 100000}
                    onChange={e => {
                      const v = Number(e.target.value)
                      setForm(p => ({ ...p, budget_min: String(Math.min(v, Number(p.budget_max || 50000000))) }))
                    }}
                  />
                  <input
                    className="range-input" type="range"
                    min="100000" max="50000000" step="100000"
                    value={form.budget_max || 50000000}
                    onChange={e => {
                      const v = Number(e.target.value)
                      setForm(p => ({ ...p, budget_max: String(Math.max(v, Number(p.budget_min || 100000))) }))
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleAdd} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
