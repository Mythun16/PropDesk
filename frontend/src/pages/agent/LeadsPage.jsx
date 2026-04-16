import { useState, useEffect } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { formatIndianPrice, formatDate } from '../../utils/helpers'
import { UserPlus } from 'lucide-react'

const defaultLead = {
  client_name: '', client_phone: '', client_email: '', preferred_location: '',
  preferred_district: '', preferred_property_type: 'Any', budget_min: '', budget_max: '',
  area_min_sqft: '', area_max_sqft: '', facing_preference: '', open_sides_needed: '', notes: '',
}

export default function LeadsPage() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ...defaultLead })
  const [submitting, setSubmitting] = useState(false)

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const res = await api.get('/leads')
      setLeads(res.data)
    } catch { toast.error('Failed to load leads') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchLeads() }, [])

  const handleAdd = async () => {
    if (!form.client_name || !form.client_phone || !form.preferred_location || !form.preferred_district || !form.budget_min || !form.budget_max) {
      return toast.error('Please fill in required fields')
    }
    if (Number(form.budget_min) > Number(form.budget_max)) {
      return toast.error('Budget min cannot be greater than budget max')
    }
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        client_email: form.client_email || null,
        area_min_sqft: form.area_min_sqft ? Number(form.area_min_sqft) : null,
        area_max_sqft: form.area_max_sqft ? Number(form.area_max_sqft) : null,
        facing_preference: form.facing_preference || null,
        open_sides_needed: form.open_sides_needed ? Number(form.open_sides_needed) : null,
        notes: form.notes || null,
        budget_min: Number(form.budget_min),
        budget_max: Number(form.budget_max),
      }
      await api.post('/leads', payload)
      toast.success('Lead added!')
      setShowModal(false)
      setForm({ ...defaultLead })
      await fetchLeads()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setSubmitting(false) }
  }

  const updateStatus = async (lead, newStatus) => {
    try {
      await api.put(`/leads/${lead.id}`, { status: newStatus })
      toast.success('Status updated')
      fetchLeads()
    } catch { toast.error('Failed') }
  }

  if (loading) return <div className="page-container"><div className="skeleton" style={{ height: 300 }} /></div>

  return (
    <div className="page-container">
      <div className="page-header-row">
        <h1 className="page-title" style={{ margin: 0 }}>Leads</h1>
        <button className="btn-primary page-header-button" onClick={() => setShowModal(true)}>
          <UserPlus size={16} /> Add Lead
        </button>
      </div>

      {leads.length === 0 ? (
        <div className="empty-state">
          <UserPlus size={48} />
          <p>No leads recorded yet.</p>
          <button className="btn-primary" onClick={() => setShowModal(true)}>Add Your First Lead</button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th><th>Phone</th><th>Location</th><th>District</th>
                <th>Budget</th><th>Type</th><th>Status</th><th>Date</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(ld => (
                <tr key={ld.id}>
                  <td style={{ fontWeight: 600 }}>{ld.client_name}</td>
                  <td>{ld.client_phone}</td>
                  <td>{ld.preferred_location}</td>
                  <td>{ld.preferred_district}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatIndianPrice(ld.budget_min)} – {formatIndianPrice(ld.budget_max)}</td>
                  <td>{ld.preferred_property_type}</td>
                  <td>
                    <select
                      className="form-select"
                      style={{ width: 'auto', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                      value={ld.status}
                      onChange={e => updateStatus(ld, e.target.value)}
                    >
                      <option value="new">New</option>
                      <option value="in_progress">In Progress</option>
                      <option value="converted">Converted</option>
                      <option value="lost">Lost</option>
                    </select>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--muted-text)' }}>{formatDate(ld.created_at)}</td>
                  <td>—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Lead Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
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
                <label className="form-label">Property Type</label>
                <select className="form-select" value={form.preferred_property_type} onChange={e => setForm(p => ({ ...p, preferred_property_type: e.target.value }))}>
                  <option value="Any">Any</option><option value="Residential">Residential</option><option value="Commercial">Commercial</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Location *</label>
                <input className="form-input" value={form.preferred_location} onChange={e => setForm(p => ({ ...p, preferred_location: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">District *</label>
                <input className="form-input" value={form.preferred_district} onChange={e => setForm(p => ({ ...p, preferred_district: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Budget Min (₹) *</label>
                <input className="form-input" type="number" value={form.budget_min} onChange={e => setForm(p => ({ ...p, budget_min: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Budget Max (₹) *</label>
                <input className="form-input" type="number" value={form.budget_max} onChange={e => setForm(p => ({ ...p, budget_max: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Budget Range Slider</label>
              <div className="budget-range-card">
                <div className="budget-range-values">
                  <span>{formatIndianPrice(form.budget_min || 0)}</span>
                  <span>{formatIndianPrice(form.budget_max || 0)}</span>
                </div>
                <div className="budget-range-sliders">
                  <input
                    className="range-input"
                    type="range"
                    min="100000"
                    max="50000000"
                    step="100000"
                    value={form.budget_min || 100000}
                    onChange={e => {
                      const nextMin = Number(e.target.value)
                      const currentMax = Number(form.budget_max || 50000000)
                      setForm(p => ({
                        ...p,
                        budget_min: String(Math.min(nextMin, currentMax)),
                      }))
                    }}
                  />
                  <input
                    className="range-input"
                    type="range"
                    min="100000"
                    max="50000000"
                    step="100000"
                    value={form.budget_max || 50000000}
                    onChange={e => {
                      const nextMax = Number(e.target.value)
                      const currentMin = Number(form.budget_min || 100000)
                      setForm(p => ({
                        ...p,
                        budget_max: String(Math.max(nextMax, currentMin)),
                      }))
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
