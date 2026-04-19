import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { formatDate, getInitials } from '../../utils/helpers'
import { UserPlus, ShieldOff, ShieldCheck, UserSearch, UserCheck } from 'lucide-react'

export default function AgentPerformance() {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalTab, setModalTab] = useState('create') // 'create' | 'invite'

  // Create new agent form
  const [addForm, setAddForm] = useState({ full_name: '', email: '', phone: '', password: '' })

  // Invite by email form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  const nav = useNavigate()

  const fetchAgents = async () => {
    try {
      const res = await api.get('/agents')
      setAgents(res.data)
    } catch { toast.error('Failed to load agents') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAgents() }, [])

  const filtered = agents.filter(a =>
    a.full_name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  )

  const openModal = (tab = 'create') => {
    setModalTab(tab)
    setShowModal(true)
    setAddForm({ full_name: '', email: '', phone: '', password: '' })
    setInviteEmail('')
  }

  const handleCreate = async () => {
    if (!addForm.full_name || !addForm.email || !addForm.password) return toast.error('Fill required fields')
    try {
      const res = await api.post('/agents', addForm)
      toast.success('Agent created and added to your company!')
      setShowModal(false)
      fetchAgents()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return toast.error('Enter an email address')
    setInviteLoading(true)
    try {
      const res = await api.post('/agents/invite-by-email', { email: inviteEmail.trim() })
      toast.success(`Invite sent to ${res.data.agent_name}!`)
      setShowModal(false)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to invite agent')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this agent?')) return
    try {
      await api.patch(`/agents/${id}/deactivate`)
      toast.success('Agent deactivated')
      fetchAgents()
    } catch { toast.error('Failed') }
  }

  const handleReactivate = async (id) => {
    try {
      await api.patch(`/agents/${id}/reactivate`)
      toast.success('Agent reactivated')
      fetchAgents()
    } catch { toast.error('Failed') }
  }

  if (loading) return <div className="page-container"><div className="skeleton" style={{ height: 300 }} /></div>

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Agent Performance</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input className="form-input" style={{ width: 200 }} placeholder="Search agents..." value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn-secondary" onClick={() => openModal('invite')} style={{ whiteSpace: 'nowrap' }}>
            <UserSearch size={15} /> Find Agent
          </button>
          <button className="btn-primary" onClick={() => openModal('create')} style={{ whiteSpace: 'nowrap' }}>
            <UserPlus size={16} /> Add New
          </button>
        </div>
      </div>

      {agents.length === 0 ? (
        <div className="empty-state">
          <UserCheck size={48} />
          <p>No agents in your company yet.</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted-text)', marginTop: '0.25rem' }}>
            Share your join code (Settings → Agent Join Code) with agents, or use "Invite Existing" to add agents already registered.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '0.75rem' }}>
            <button className="btn-secondary" onClick={() => openModal('invite')}><UserSearch size={15} /> Find Agent</button>
            <button className="btn-primary" onClick={() => openModal('create')}><UserPlus size={16} /> Create New Agent</button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Agent</th><th>Phone</th><th>Listings</th><th>Available</th>
                <th>Committed</th><th>Closed</th><th>Leads</th><th>Joined</th>
                <th>Auth</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} style={{ opacity: a.is_active ? 1 : 0.5 }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: 700,
                        background: a.avatar_url ? 'transparent' : 'var(--filter-active-bg)', color: 'var(--heading)',
                      }}>
                        {a.avatar_url ? <img src={a.avatar_url} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : getInitials(a.full_name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{a.full_name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted-text)' }}>{a.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{a.phone || '—'}</td>
                  <td style={{ fontWeight: 700 }}>{a.listings_total}</td>
                  <td style={{ color: 'var(--stat-available)' }}>{a.listings_available}</td>
                  <td style={{ color: 'var(--stat-committed)' }}>{a.listings_committed}</td>
                  <td style={{ color: 'var(--stat-closed)' }}>{a.listings_closed}</td>
                  <td>{a.leads_count}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--muted-text)' }}>{formatDate(a.created_at)}</td>
                  <td><span className={`badge badge-${a.auth_provider}`}>{a.auth_provider}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => nav(`/admin/agents/${a.id}`)}>View</button>
                      {a.is_active ? (
                        <button className="btn-danger" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => handleDeactivate(a.id)} title="Deactivate">
                          <ShieldOff size={12} />
                        </button>
                      ) : (
                        <button className="btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', background: '#059669' }} onClick={() => handleReactivate(a.id)} title="Reactivate">
                          <ShieldCheck size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setModalTab('create')}
                style={{
                  flex: 1, padding: '0.6rem', background: 'none', border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.875rem',
                  color: modalTab === 'create' ? '#059669' : 'var(--muted-text)',
                  borderBottom: modalTab === 'create' ? '2px solid #059669' : '2px solid transparent',
                  marginBottom: '-1px',
                }}
              >
                <UserPlus size={14} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
                Create New Agent
              </button>
              <button
                type="button"
                onClick={() => setModalTab('invite')}
                style={{
                  flex: 1, padding: '0.6rem', background: 'none', border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.875rem',
                  color: modalTab === 'invite' ? '#059669' : 'var(--muted-text)',
                  borderBottom: modalTab === 'invite' ? '2px solid #059669' : '2px solid transparent',
                  marginBottom: '-1px',
                }}
              >
                <UserSearch size={14} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
                Find Agent
              </button>
            </div>

            {modalTab === 'create' ? (
              <>
                <h3 className="modal-title">Create New Agent</h3>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" value={addForm.full_name} onChange={e => setAddForm(p => ({ ...p, full_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input className="form-input" type="email" value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={addForm.phone} onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Temporary Password *</label>
                  <input className="form-input" type="password" value={addForm.password} onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))} />
                </div>
                <div className="modal-actions">
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button className="btn-primary" onClick={handleCreate}>Create Agent</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="modal-title">Find & Invite Agent</h3>
                <p style={{ fontSize: '0.83rem', color: 'var(--muted-text)', marginBottom: '1rem' }}>
                  If an agent already has a PropDesk account (even under a different company), enter their email to send them an invite — they must accept before being added to your team.
                </p>
                <div className="form-group">
                  <label className="form-label">Agent's Email *</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="agent@example.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleInvite()}
                  />
                </div>
                <div className="modal-actions">
                  <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button className="btn-primary" onClick={handleInvite} disabled={inviteLoading}>
                    {inviteLoading ? 'Sending...' : 'Send Invite'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
