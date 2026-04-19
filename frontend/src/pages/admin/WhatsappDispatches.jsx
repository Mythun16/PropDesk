import { useState, useEffect } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { MessageCircle, Send, CheckCircle2, XCircle } from 'lucide-react'
import { formatDateTime, statusBadgeClass } from '../../utils/helpers'

const DISPATCH_TYPES = [
  { value: 'lead_digest', label: 'Lead Digest' },
  { value: 'follow_up_reminder', label: 'Follow-up Reminder' },
  { value: 'deal_update', label: 'Deal Update' },
]

export default function WhatsappDispatches() {
  const [dispatches, setDispatches] = useState([])
  const [agents, setAgents] = useState([])
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ agent_id: '', type: 'lead_digest', lead_ids: [] })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [dRes, aRes, lRes] = await Promise.all([
          api.get('/whatsapp/dispatches'),
          api.get('/agents'),
          api.get('/leads', { params: { all_agents: true } }),
        ])
        setDispatches(dRes.data)
        setAgents(aRes.data.filter(a => a.whatsapp_opted_in))
        setLeads(lRes.data)
      } catch { toast.error('Failed to load data') }
      finally { setLoading(false) }
    }
    fetchAll()
  }, [])

  const handleDispatch = async () => {
    if (!form.agent_id) return toast.error('Select an agent')
    setSubmitting(true)
    try {
      const res = await api.post('/whatsapp/dispatch', form)
      setDispatches(prev => [res.data, ...prev])
      setShowModal(false)
      setForm({ agent_id: '', type: 'lead_digest', lead_ids: [] })
      toast.success('Dispatch sent!')
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setSubmitting(false) }
  }

  const toggleLead = (leadId) => {
    setForm(prev => ({
      ...prev,
      lead_ids: prev.lead_ids.includes(leadId)
        ? prev.lead_ids.filter(id => id !== leadId)
        : [...prev.lead_ids, leadId],
    }))
  }

  const statusIcon = (status) => {
    if (status === 'delivered') return <CheckCircle2 size={14} color="#10B981" />
    if (status === 'failed') return <XCircle size={14} color="#EF4444" />
    if (status === 'sent') return <CheckCircle2 size={14} color="#6366F1" />
    return <MessageCircle size={14} color="#9CA3AF" />
  }

  if (loading) return <div className="page-container"><div className="skeleton" style={{ height: 400 }} /></div>

  return (
    <div className="page-container">
      <div className="page-header-row">
        <h1 className="page-title" style={{ margin: 0 }}>WhatsApp Dispatches</h1>
        <button className="btn-primary page-header-button" onClick={() => setShowModal(true)}>
          <Send size={16} /> New Dispatch
        </button>
      </div>

      {agents.length === 0 && (
        <div style={{ padding: '0.75rem 1rem', background: '#FEF3C7', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem', color: '#92400E' }}>
          No agents have opted in to WhatsApp notifications yet. Agents can enable this in their Settings page.
        </div>
      )}

      {dispatches.length === 0 ? (
        <div className="empty-state">
          <MessageCircle size={48} />
          <p>No dispatches sent yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {dispatches.map(d => {
            const agent = agents.find(a => a.id === d.agent_id) || { full_name: d.agent_id.slice(-6) }
            return (
              <div key={d.id} className="card" style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {statusIcon(d.status)}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--heading)' }}>
                        {DISPATCH_TYPES.find(t => t.value === d.type)?.label || d.type}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted-text)', marginTop: '0.15rem' }}>
                        To: <strong>{agent.full_name}</strong>
                        {d.lead_ids.length > 0 && ` · ${d.lead_ids.length} lead${d.lead_ids.length > 1 ? 's' : ''}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--muted-text)' }}>
                    <div>
                      <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{d.status}</span>
                    </div>
                    <div>{formatDateTime(d.sent_at || d.created_at)}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Dispatch modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">New WhatsApp Dispatch</h3>

            <div className="form-group">
              <label className="form-label">Agent *</label>
              <select className="form-select" value={form.agent_id} onChange={e => setForm(p => ({ ...p, agent_id: e.target.value }))}>
                <option value="">Select agent...</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.full_name} ({a.email})</option>)}
              </select>
              {agents.length === 0 && (
                <p style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: '0.35rem' }}>
                  No agents with WhatsApp opted in. Ask agents to enable it in Settings.
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Type *</label>
              <select className="form-select" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                {DISPATCH_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {form.type === 'lead_digest' && leads.length > 0 && (
              <div className="form-group">
                <label className="form-label">Include Leads</label>
                <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: 8, padding: '0.5rem' }}>
                  {leads.filter(l => l.status === 'new' || l.status === 'follow_up').slice(0, 20).map(l => (
                    <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.25rem', cursor: 'pointer', fontSize: '0.83rem' }}>
                      <input type="checkbox" checked={form.lead_ids.includes(l.id)} onChange={() => toggleLead(l.id)} />
                      <span><strong>{l.client?.name || l.client_name}</strong> · {l.client?.phone || l.client_phone}</span>
                    </label>
                  ))}
                </div>
                {form.lead_ids.length > 0 && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.35rem' }}>{form.lead_ids.length} lead(s) selected</p>
                )}
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleDispatch} disabled={submitting || !form.agent_id}>
                <Send size={14} /> {submitting ? 'Sending...' : 'Send Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
