import { useState, useEffect, useCallback } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { Settings, Save, Copy, RefreshCw, UserCheck, Building2 } from 'lucide-react'
import { formatDate } from '../../utils/helpers'

export default function AdminSettings() {
  const [company, setCompany] = useState(null)
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState(null)
  const [pendingAgents, setPendingAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [regenLoading, setRegenLoading] = useState(false)
  const [assigningId, setAssigningId] = useState(null)

  const fetchAll = useCallback(async () => {
    try {
      const [companyRes, codeRes, pendingRes] = await Promise.all([
        api.get('/admin/company'),
        api.get('/admin/join-code'),
        api.get('/admin/pending-agents'),
      ])
      setCompany(companyRes.data)
      setName(companyRes.data.name)
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
    if (!name.trim()) return toast.error('Company name required')
    try {
      await api.put('/admin/company', { name })
      toast.success('Company name updated!')
    } catch { toast.error('Failed to save') }
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

  const handleAssign = async (agentId, agentName) => {
    if (!confirm(`Assign ${agentName} to your company?`)) return
    setAssigningId(agentId)
    try {
      await api.patch(`/agents/${agentId}/assign-company`)
      toast.success(`${agentName} added to your team!`)
      setPendingAgents(prev => prev.filter(a => a.id !== agentId))
      setCompany(prev => prev ? { ...prev, total_agents: prev.total_agents + 1 } : prev)
    } catch { toast.error('Failed to assign agent') }
    finally { setAssigningId(null) }
  }

  if (loading) return (
    <div className="page-container">
      {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 180, marginBottom: '1rem' }} />)}
    </div>
  )

  return (
    <div className="page-container">
      <h1 className="page-title">Settings</h1>

      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>

        {/* Company name */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--heading)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={18} /> Company Settings
          </h3>
          <div className="form-group">
            <label className="form-label">Company Name</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={handleSave}>
            <Save size={16} /> Save Changes
          </button>
          {company && (
            <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: 'var(--page-bg)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--muted-text)', display: 'grid', gap: '0.35rem' }}>
              <div><strong>Total Agents:</strong> {company.total_agents}</div>
              <div><strong>Created:</strong> {new Date(company.created_at).toLocaleDateString('en-GB')}</div>
            </div>
          )}
        </div>

        {/* Join Code */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--heading)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={18} /> Agent Join Code
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted-text)', marginBottom: '1rem' }}>
            Share this code with your agents. They enter it during sign-up to join your company.
          </p>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'var(--page-bg)', borderRadius: 10, padding: '0.75rem 1rem',
            marginBottom: '1rem',
          }}>
            <span style={{
              fontSize: '2rem', fontWeight: 800, letterSpacing: '0.3em',
              color: 'var(--heading)', fontFamily: 'monospace', flex: 1,
            }}>
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

      {/* Pending agents */}
      {pendingAgents.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--heading)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserCheck size={18} /> Pending Agents
            <span style={{ background: '#FEF3C7', color: '#D97706', borderRadius: 12, padding: '0.1rem 0.5rem', fontSize: '0.75rem', fontWeight: 700 }}>
              {pendingAgents.length}
            </span>
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted-text)', marginBottom: '1rem' }}>
            These agents signed up but haven't joined a company yet. You can manually assign them to yours.
          </p>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {pendingAgents.map(a => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem', background: 'var(--page-bg)', borderRadius: 8,
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--heading)' }}>{a.full_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)' }}>{a.email} · {a.auth_provider} · {formatDate(a.created_at)}</div>
                </div>
                <button
                  className="btn-primary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                  onClick={() => handleAssign(a.id, a.full_name)}
                  disabled={assigningId === a.id}
                >
                  {assigningId === a.id ? 'Assigning...' : 'Assign to My Team'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
