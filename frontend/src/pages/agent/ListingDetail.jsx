import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import {
  formatIndianPrice, formatSetNo, formatFacing, formatDate,
  statusBadgeClass, statusLabel, imageUrl, displayLocation, displayPrice,
} from '../../utils/helpers'
import { ArrowLeft, MapPin, ImageOff, Tag, ArrowRightLeft, Phone, Mail, Users } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const PROPERTY_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'in_discussion', label: 'In Discussion' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'deal_closed', label: 'Deal Closed' },
  { value: 'withdrawn', label: 'Withdrawn' },
]

export default function ListingDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { user } = useAuth()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCommit, setShowCommit] = useState(false)
  const [showStatus, setShowStatus] = useState(false)
  const [showCollabModal, setShowCollabModal] = useState(false)
  const [collabMessage, setCollabMessage] = useState('')
  const [collabSending, setCollabSending] = useState(false)
  const [collabRequested, setCollabRequested] = useState(false)
  const [commitForm, setCommitForm] = useState({ committed_client_name: '', committed_client_phone: '' })

  useEffect(() => {
    (async () => {
      try {
        const [propRes, outgoingRes] = await Promise.all([
          api.get(`/listings/${id}`),
          api.get('/assignment-requests', { params: { direction: 'outgoing' } }).catch(() => ({ data: [] })),
        ])
        setProperty(propRes.data)
        const alreadyRequested = outgoingRes.data.some(
          r => r.property_id === id && r.status === 'pending'
        )
        setCollabRequested(alreadyRequested)
      } catch { toast.error('Property not found'); nav(-1) }
      finally { setLoading(false) }
    })()
  }, [id])

  const handleCommit = async () => {
    if (!commitForm.committed_client_name || !commitForm.committed_client_phone) {
      return toast.error('Fill in client details')
    }
    try {
      const res = await api.patch(`/listings/${id}/commit`, commitForm)
      setProperty(res.data)
      setShowCommit(false)
      toast.success('Property committed — lead created automatically!')
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const handleRequestCollab = async () => {
    setCollabSending(true)
    try {
      await api.post('/assignment-requests', { property_id: id, message: collabMessage || undefined })
      setCollabRequested(true)
      setShowCollabModal(false)
      setCollabMessage('')
      toast.success('Collaboration request sent!')
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setCollabSending(false) }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      const res = await api.patch(`/listings/${id}/status`, { status: newStatus })
      setProperty(res.data)
      setShowStatus(false)
      toast.success(`Status updated to "${statusLabel(newStatus)}"`)
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const handleClose = async () => {
    if (!confirm('Mark this property as Deal Closed?')) return
    try {
      const res = await api.patch(`/listings/${id}/close`)
      setProperty(res.data)
      toast.success('Deal closed!')
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  if (loading) return <div className="page-container"><div className="skeleton" style={{ height: 400 }} /></div>
  if (!property) return null

  const photos = property.photos?.length ? property.photos : property.images || []
  const price = displayPrice(property)
  const locStr = displayLocation(property)
  const isOwner = user?.id === property.agent_id || user?.id === property.added_by
  const isAdmin = user?.role === 'admin'
  const isAssigned = property.assigned_agents?.some(a => a.agent_id === user?.id)
  const canManage = isOwner || isAssigned || isAdmin
  const canEdit = isOwner || isAdmin
  const editBasePath = isAdmin ? '/admin/listings' : '/agent/listings'

  const txLabel = { sell: 'For Sale', rent: 'For Rent', lease: 'For Lease' }[property.transaction_type] || ''

  return (
    <div className="page-container">
      <button className="btn-secondary" style={{ marginBottom: '1rem' }} onClick={() => nav(-1)}>
        <ArrowLeft size={16} /> Back
      </button>

      {/* Photo gallery */}
      {photos.length > 0 ? (
        <div className="image-gallery">
          <img className="image-gallery-main" src={imageUrl(photos[0])} alt="" />
          {photos.length > 1 && (
            <div className="image-gallery-side">
              {photos.slice(1, 4).map((img, i) => (
                <img key={i} src={imageUrl(img)} alt="" />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ height: 200, background: '#E5E7EB', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <ImageOff size={48} color="#9CA3AF" />
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--muted-text)' }}>{formatSetNo(property.set_no)}</span>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--heading)', margin: 0 }}>
          {property.title || locStr}
        </h1>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--muted-text)', fontSize: '0.9rem' }}>
          <MapPin size={14} /> {locStr}
        </span>
        <span className={statusBadgeClass(property.status)}>{statusLabel(property.status)}</span>
        <span className={`badge badge-${property.property_type}`}>{property.property_type}</span>
        {txLabel && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 600, color: '#7C3AED', background: '#EDE9FE', padding: '0.15rem 0.6rem', borderRadius: 12 }}>
            <Tag size={12} /> {txLabel}
          </span>
        )}
        {property.is_negotiable && (
          <span style={{ fontSize: '0.75rem', color: '#059669', background: '#ECFDF5', padding: '0.15rem 0.5rem', borderRadius: 10, fontWeight: 600 }}>
            Negotiable
          </span>
        )}
      </div>

      {/* Price */}
      <div className="card" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', textTransform: 'uppercase', fontWeight: 600 }}>
            {property.transaction_type === 'rent' ? 'Monthly Rent' : property.transaction_type === 'lease' ? 'Lease Amount' : 'Price'}
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--price-highlight)' }}>{formatIndianPrice(price)}</div>
        </div>
        {property.price_per_sqft && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', textTransform: 'uppercase', fontWeight: 600 }}>Price per sqft</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>₹{property.price_per_sqft?.toLocaleString('en-IN')}</div>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="detail-grid">
          {property.total_area_sqft && <div><div className="detail-label">Total Area</div><div className="detail-value">{property.total_area_sqft?.toLocaleString('en-IN')} sqft</div></div>}
          {property.dimensions && <div><div className="detail-label">Dimensions</div><div className="detail-value">{property.dimensions}</div></div>}
          {property.facing && <div><div className="detail-label">Facing</div><div className="detail-value">{formatFacing(property.facing)}</div></div>}
          {property.open_sides != null && <div><div className="detail-label">Open Sides</div><div className="detail-value">{property.open_sides}</div></div>}
          {property.boundary_wall != null && <div><div className="detail-label">Boundary Wall</div><div className="detail-value">{property.boundary_wall ? 'Yes' : 'No'}</div></div>}
          {property.floors_allowed && <div><div className="detail-label">Floors Allowed</div><div className="detail-value">{property.floors_allowed}</div></div>}
          {property.construction_done && <div><div className="detail-label">Construction</div><div className="detail-value">{property.construction_done}</div></div>}
          <div><div className="detail-label">Agent</div><div className="detail-value">{property.agent_name}</div></div>
          <div><div className="detail-label">Listed On</div><div className="detail-value">{formatDate(property.created_at)}</div></div>
          {property.description && (
            <div style={{ gridColumn: '1/-1' }}>
              <div className="detail-label">Description</div>
              <div className="detail-value">{property.description}</div>
            </div>
          )}
        </div>

        {/* Nearby amenities */}
        {property.nearby_amenities && Object.keys(property.nearby_amenities).length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <div className="detail-label" style={{ marginBottom: '0.5rem' }}>Nearby Amenities</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {Object.keys(property.nearby_amenities).map(a => (
                <span key={a} style={{ padding: '0.2rem 0.65rem', background: '#EFF6FF', color: '#1D4ED8', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600 }}>{a}</span>
              ))}
            </div>
          </div>
        )}

        {/* In-discussion client info */}
        {['in_discussion', 'committed', 'negotiating'].includes(property.status) && property.committed_client_name && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--badge-committed-bg)', borderRadius: 8 }}>
            <div style={{ fontWeight: 600, color: 'var(--badge-committed-text)', marginBottom: '0.25rem' }}>Client in Discussion</div>
            <div style={{ fontSize: '0.85rem' }}>
              {property.committed_client_name} · {property.committed_client_phone} · {formatDate(property.committed_date)}
            </div>
          </div>
        )}

        {/* Assigned agents (collaborators) */}
        {property.assigned_agents?.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <div className="detail-label" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Users size={13} /> Collaborating Agents
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {property.assigned_agents.map((a, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.6rem 0.85rem', background: '#EDE9FE', borderRadius: 8,
                  border: '1px solid #C4B5FD',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#4C1D95' }}>
                      {a.agent_name || `Agent …${a.agent_id?.slice(-6)}`}
                    </div>
                    {a.agent_phone && (
                      <div style={{ fontSize: '0.75rem', color: '#6D28D9', marginTop: '0.1rem' }}>
                        {a.agent_phone}
                      </div>
                    )}
                  </div>
                  <span className={statusBadgeClass(a.status)} style={{ fontSize: '0.7rem' }}>
                    {statusLabel(a.status)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {canManage && property.status === 'available' && (
          <button className="btn-primary" onClick={() => setShowCommit(true)}>
            Commit
          </button>
        )}
        {canManage && ['in_discussion', 'negotiating'].includes(property.status) && (
          <button className="btn-primary" onClick={handleClose}>
            Mark Deal Closed
          </button>
        )}
        {canManage && (
          <button className="btn-secondary" onClick={() => setShowStatus(true)}>
            <ArrowRightLeft size={15} /> Change Status
          </button>
        )}
        {canEdit && (
          <button className="btn-secondary" onClick={() => nav(`${editBasePath}/new`, { state: { listing: property } })}>
            Edit Property
          </button>
        )}
        {/* Contact Agent — shown to non-owners when agent contact info is available */}
        {!isOwner && !isAdmin && (property.agent_phone || property.agent_email) && (
          <>
            {property.agent_phone && (
              <a
                href={`https://wa.me/${property.agent_phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Phone size={15} /> Via WhatsApp
              </a>
            )}
            {property.agent_email && (
              <a
                href={`mailto:${property.agent_email}?subject=Regarding Property ${property.title || property.locality}`}
                className="btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Mail size={15} /> Via Email
              </a>
            )}
          </>
        )}
        {/* Request Collaboration — shown when not owner, not admin, not already assigned */}
        {!isOwner && !isAdmin && !isAssigned && (
          collabRequested ? (
            <button
              disabled
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.6rem 1.25rem', borderRadius: 6, fontWeight: 600, fontSize: '0.875rem',
                background: '#EDE9FE', color: '#7C3AED', border: '1px solid #C4B5FD',
                cursor: 'default', opacity: 0.85,
              }}
            >
              <Users size={15} /> Requested
            </button>
          ) : (
            <button
              onClick={() => setShowCollabModal(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.6rem 1.25rem', borderRadius: 6, fontWeight: 600, fontSize: '0.875rem',
                background: '#7C3AED', color: '#fff', border: 'none', cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseOver={e => e.currentTarget.style.background = '#5B21B6'}
              onMouseOut={e => e.currentTarget.style.background = '#7C3AED'}
            >
              <Users size={15} /> Request Collaboration
            </button>
          )
        )}
      </div>

      {/* Commit Modal */}
      {showCommit && (
        <div className="modal-overlay" onClick={() => setShowCommit(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Commit Property — {formatSetNo(property.set_no)}</h3>
            <div className="form-group">
              <label className="form-label">Client Name</label>
              <input className="form-input" value={commitForm.committed_client_name} onChange={e => setCommitForm(p => ({ ...p, committed_client_name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Client Phone</label>
              <input className="form-input" value={commitForm.committed_client_phone} onChange={e => setCommitForm(p => ({ ...p, committed_client_phone: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowCommit(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCommit}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Request Collaboration Modal */}
      {showCollabModal && (
        <div className="modal-overlay" onClick={() => setShowCollabModal(false)}>
          <div className="modal-content" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Request Collaboration</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted-text)', marginBottom: '1rem' }}>
              Send a request to the primary agent to collaborate on this property.
            </p>
            <div className="form-group">
              <label className="form-label">Message (optional)</label>
              <textarea
                className="form-input"
                rows={3}
                style={{ resize: 'vertical' }}
                placeholder="I have a client interested in this plot..."
                value={collabMessage}
                onChange={e => setCollabMessage(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowCollabModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleRequestCollab} disabled={collabSending}>
                {collabSending ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status change modal */}
      {showStatus && (
        <div className="modal-overlay" onClick={() => setShowStatus(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Change Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {PROPERTY_STATUSES.filter(s => s.value !== property.status).map(s => (
                <button
                  key={s.value}
                  className="btn-secondary"
                  style={{ justifyContent: 'flex-start' }}
                  onClick={() => handleStatusChange(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
