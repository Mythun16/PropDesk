import { useState, useEffect, useCallback } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { Settings, Save, Copy, RefreshCw, UserCheck, Building2, AlertTriangle } from 'lucide-react'
import { formatDate } from '../../utils/helpers'

export default function AdminSettings() {
  const [agency, setAgency] = useState(null)
  const [form, setForm] = useState({
    name: '', owner_name: '', phone: '', email: '',
    city: '', whatsapp_number: '', lead_dispatch_time: '',
  })
  const [joinCode, setJoinCode] = useState(null)
  const [pendingAgents, setPendingAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [regenLoading, setRegenLoading] = useState(false)
  const [assigningId, setAssigningId] = useState(null)

  const fetchAll = useCallback(async () => {
    try {
      const [agencyRes, codeRes, pendingRes] = await Promise.all([
        api.get('/admin/company'),
        api.get('/admin/join-code'),
        api.get('/admin/pending-agents'),
      ])
      const a = agencyRes.data
      setAgency(a)
      setForm({
        name: a.name || '',
        owner_name: a.owner_name || '',
        phone: a.phone || '',
        email: a.email || '',
        city: a.city || '',
        whatsapp_number: a.whatsapp_number || '',
        lead_dispatch_time: a.lead_dispatch_time || '',
      })
      setJoinCode(codeRes.data.join_code)
      setPendingAgents(pendingRes.data)
    } catch {
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Agency name required')
    setSaving(true)
    try {
      const res = await api.put('/admin/company', form)
      setAgency(prev => ({ ...prev, ...res.data }))
      toast.success('Agency settings saved!')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(joinCode)
    toast.success('Join code copied!')
  }

  const handleRegenCode = async () => {
    if (!confirm('Regenerate join code? The old code will stop working immediately.')) return
    setRegenLoading(true)
    try {
      const res = await api.post('/admin/join-code/regenerate')
      setJoinCode(res.data.join_code)
      toast.success('New join code generated!')
    } catch { toast.error('Failed to regenerate') }
    finally { setRegenLoading(false) }
  }

  const handleAssign = async (agentId, agentName, agentEmail) => {
    if (!confirm(`Send team invite to ${agentName}?`)) return
    setAssigningId(agentId)
    try {
      await api.post('/agents/invite-by-email', { email: agentEmail })
      toast.success(`Invite sent to ${agentName}! They'll need to accept.`)
      setPendingAgents(prev => prev.filter(a => a.id !== agentId))
    } catch { toast.error('Failed to send invite') }
    finally { setAssigningId(null) }
  }

  if (loading) return (
    <div className="page-container">
      {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 200, marginBottom: '1rem' }} />)}
    </div>
  )

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="page-container">
      <h1 className="page-title">Settings</h1>

      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>

        {/* Agency details */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--heading)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={18} /> Agency Settings
          </h3>

          <div className="form-group">
            <label className="form-label">Agency Name *</label>
            <input className="form-input" value={form.name} onChange={e => setField('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Owner Name</label>
            <input className="form-input" value={form.owner_name} onChange={e => setField('owner_name', e.target.value)} placeholder="e.g. Rajan Sharma" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+91 9999999999" />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="form-input" value={form.city} onChange={e => setField('city', e.target.value)} placeholder="e.g. Chennai" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="agency@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">WhatsApp Number</label>
              <input className="form-input" value={form.whatsapp_number} onChange={e => setField('whatsapp_number', e.target.value)} placeholder="+91 9999999999" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Lead Dispatch Time</label>
            <input className="form-input" type="time" value={form.lead_dispatch_time} onChange={e => setField('lead_dispatch_time', e.target.value)} />
            <p style={{ fontSize: '0.72rem', color: 'var(--muted-text)', marginTop: '0.25rem' }}>Daily WhatsApp lead digest will be sent at this time.</p>
          </div>

          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>

          {agency && (
            <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: 'var(--page-bg)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--muted-text)', display: 'grid', gap: '0.35rem' }}>
              <div><strong>Total Agents:</strong> {agency.total_agents}</div>
              <div><strong>Created:</strong> {formatDate(agency.created_at)}</div>
            </div>
          )}
        </div>

        {/* Join Code */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--heading)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={18} /> Agent Join Code
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted-text)', marginBottom: '1rem' }}>
            Share this code with agents and telecallers. They enter it during sign-up to join your agency.
          </p>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'var(--page-bg)', borderRadius: 10, padding: '0.75rem 1rem',
            marginBottom: '1rem',
          }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '0.3em', color: 'var(--heading)', fontFamily: 'monospace', flex: 1 }}>
              {joinCode ?? '——'}
            </span>
            <button className="btn-secondary" style={{ padding: '0.4rem 0.6rem' }} onClick={handleCopyCode} title="Copy code">
              <Copy size={16} />
            </button>
          </div>

          <button className="btn-secondary" onClick={handleRegenCode} disabled={regenLoading} style={{ width: '100%', justifyContent: 'center' }}>
            <RefreshCw size={14} style={{ marginRight: '0.35rem' }} />
            {regenLoading ? 'Regenerating...' : 'Regenerate Code'}
          </button>
          <p style={{ fontSize: '0.7rem', color: '#EF4444', marginTop: '0.5rem' }}>
            Regenerating will invalidate the old code immediately.
          </p>
        </div>
      </div>

      {/* Incomplete profile banner */}
      {agency && (!agency.phone || !agency.email || !agency.owner_name) && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 1000,
          background: '#FEF3C7', border: '1px solid #FCD34D',
          borderRadius: 12, padding: '1rem 1.25rem', maxWidth: 320,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        }}>
          <div style={{ fontWeight: 700, color: '#92400E', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} color="#D97706" /> Profile Incomplete
          </div>
          <div style={{ fontSize: '0.8rem', color: '#B45309', marginBottom: '0.75rem', lineHeight: 1.5 }}>
            Complete your agency profile — missing:
            {!agency.owner_name && <span style={{ display: 'block' }}>• Owner Name</span>}
            {!agency.phone && <span style={{ display: 'block' }}>• Phone</span>}
            {!agency.email && <span style={{ display: 'block' }}>• Email</span>}
          </div>
          <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', width: '100%', justifyContent: 'center' }}
            onClick={() => document.querySelector('.form-input')?.focus()}>
            Complete Now ↑
          </button>
        </div>
      )}

      {/* Pending agents */}
      {pendingAgents.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--heading)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserCheck size={18} /> Agents Without a Company
            <span style={{ background: '#FEF3C7', color: '#D97706', borderRadius: 12, padding: '0.1rem 0.5rem', fontSize: '0.75rem', fontWeight: 700 }}>
              {pendingAgents.length}
            </span>
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted-text)', marginBottom: '1rem' }}>
            These agents haven't joined any agency. Send them an invite to join yours.
          </p>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {pendingAgents.map(a => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem', background: 'var(--page-bg)', borderRadius: 8,
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--heading)' }}>{a.full_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)' }}>
                    {a.email} · {a.role} · {a.auth_provider} · {formatDate(a.created_at)}
                  </div>
                </div>
                <button
                  className="btn-primary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                  onClick={() => handleAssign(a.id, a.full_name, a.email)}
                  disabled={assigningId === a.id}
                >
                  {assigningId === a.id ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
