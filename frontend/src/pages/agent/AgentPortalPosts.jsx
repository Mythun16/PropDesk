import { useState, useEffect } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { Globe, Plus, ExternalLink, RefreshCw } from 'lucide-react'
import { formatDate } from '../../utils/helpers'

const PORTALS = ['99acres', 'magicbricks', 'nobroker', 'olx']
const STATUS_OPTIONS = ['pending', 'posted', 'failed', 'expired']

const portalBadgeColor = {
  '99acres': { bg: '#FEF3C7', color: '#D97706' },
  magicbricks: { bg: '#EDE9FE', color: '#7C3AED' },
  nobroker: { bg: '#ECFDF5', color: '#059669' },
  olx: { bg: '#EFF6FF', color: '#1D4ED8' },
}

export default function AgentPortalPosts() {
  const [posts, setPosts] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ property_id: '', portal: '99acres' })
  const [submitting, setSubmitting] = useState(false)
  const [filterPortal, setFilterPortal] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const params = { agent_only: true }
      if (filterPortal) params.portal = filterPortal
      if (filterStatus) params.status = filterStatus
      const res = await api.get('/portal-posts', { params })
      setPosts(res.data)
    } catch { toast.error('Failed to load portal posts') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await api.get('/listings', { params: { agent_only: true } })
        setProperties(res.data)
      } catch {}
    }
    fetchProperties()
    fetchPosts()
  }, [])

  useEffect(() => { fetchPosts() }, [filterPortal, filterStatus])

  const handleCreate = async () => {
    if (!form.property_id) return toast.error('Select a property')
    setSubmitting(true)
    try {
      const res = await api.post('/portal-posts', form)
      setPosts(prev => [res.data, ...prev])
      setShowModal(false)
      setForm({ property_id: '', portal: '99acres' })
      toast.success('Portal post created!')
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setSubmitting(false) }
  }

  const updateStatus = async (postId, newStatus) => {
    try {
      const res = await api.patch(`/portal-posts/${postId}`, { status: newStatus })
      setPosts(prev => prev.map(p => p.id === postId ? res.data : p))
      toast.success('Status updated')
    } catch { toast.error('Failed') }
  }

  if (loading) return <div className="page-container"><div className="skeleton" style={{ height: 400 }} /></div>

  return (
    <div className="page-container">
      <div className="page-header-row">
        <h1 className="page-title" style={{ margin: 0 }}>My Portal Ads</h1>
        <button className="btn-primary page-header-button" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Post
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <select className="form-select" style={{ width: 'auto' }} value={filterPortal} onChange={e => setFilterPortal(e.target.value)}>
          <option value="">All Portals</option>
          {PORTALS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="form-select" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn-secondary" onClick={fetchPosts} style={{ padding: '0.5rem' }} title="Refresh">
          <RefreshCw size={15} />
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="empty-state">
          <Globe size={48} />
          <p>No portal ads yet.</p>
          <button className="btn-primary" onClick={() => setShowModal(true)}>Create First Ad</button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Portal</th>
                <th>Status</th>
                <th>Listing ID</th>
                <th>Posted At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map(post => {
                const prop = properties.find(p => p.id === post.property_id)
                const colors = portalBadgeColor[post.portal] || {}
                return (
                  <tr key={post.id}>
                    <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      {prop ? (prop.title || prop.locality || post.property_id.slice(-6)) : post.property_id.slice(-6)}
                    </td>
                    <td>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: 10, fontSize: '0.78rem', fontWeight: 700, background: colors.bg, color: colors.color }}>
                        {post.portal}
                      </span>
                    </td>
                    <td>
                      <select
                        className="form-select"
                        style={{ width: 'auto', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        value={post.status}
                        onChange={e => updateStatus(post.id, e.target.value)}
                      >
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--muted-text)' }}>{post.portal_listing_id || '—'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--muted-text)' }}>{formatDate(post.posted_at)}</td>
                    <td>
                      {post.portal_listing_url ? (
                        <a href={post.portal_listing_url} target="_blank" rel="noreferrer" className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <ExternalLink size={12} /> View
                        </a>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">New Portal Ad</h3>
            <div className="form-group">
              <label className="form-label">Property *</label>
              <select className="form-select" value={form.property_id} onChange={e => setForm(p => ({ ...p, property_id: e.target.value }))}>
                <option value="">Select a property...</option>
                {properties.filter(p => p.status === 'available').map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title || p.locality || `#${String(p.set_no).padStart(3, '0')}`} — {p.city || p.district}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Portal *</label>
              <select className="form-select" value={form.portal} onChange={e => setForm(p => ({ ...p, portal: e.target.value }))}>
                {PORTALS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreate} disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
