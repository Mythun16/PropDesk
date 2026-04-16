import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { formatIndianPrice, formatSetNo, formatFacing, formatDate, statusBadgeClass, imageUrl } from '../../utils/helpers'
import { ArrowLeft, MapPin, ImageOff } from 'lucide-react'

export default function ListingDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCommit, setShowCommit] = useState(false)
  const [commitForm, setCommitForm] = useState({ committed_client_name: '', committed_client_phone: '' })

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/listings/${id}`)
        setListing(res.data)
      } catch { toast.error('Listing not found'); nav(-1) }
      finally { setLoading(false) }
    })()
  }, [id])

  const handleCommit = async () => {
    if (!commitForm.committed_client_name || !commitForm.committed_client_phone) {
      return toast.error('Fill in client details')
    }
    try {
      const res = await api.patch(`/listings/${id}/commit`, commitForm)
      setListing(res.data)
      setShowCommit(false)
      toast.success('Listing committed!')
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  if (loading) return <div className="page-container"><div className="skeleton" style={{ height: 400 }} /></div>
  if (!listing) return null

  return (
    <div className="page-container">
      <button className="btn-secondary" style={{ marginBottom: '1rem' }} onClick={() => nav(-1)}>
        <ArrowLeft size={16} /> Back
      </button>

      {/* Image gallery */}
      {listing.images?.length > 0 ? (
        <div className="image-gallery">
          <img className="image-gallery-main" src={imageUrl(listing.images[0])} alt="" />
          {listing.images.length > 1 && (
            <div className="image-gallery-side">
              {listing.images.slice(1, 4).map((img, i) => (
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
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--muted-text)' }}>{formatSetNo(listing.set_no)}</span>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--heading)', margin: 0 }}>{listing.location}</h1>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--muted-text)', fontSize: '0.9rem' }}>
          <MapPin size={14} /> {listing.district}
        </span>
        <span className={statusBadgeClass(listing.status)}>{listing.status}</span>
        <span className={`badge badge-${listing.property_type?.toLowerCase()}`}>{listing.property_type}</span>
      </div>

      {/* Price */}
      <div className="card" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', textTransform: 'uppercase', fontWeight: 600 }}>Total Value</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--price-highlight)' }}>{formatIndianPrice(listing.total_property_value)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', textTransform: 'uppercase', fontWeight: 600 }}>Price per sqft</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>₹{listing.price_per_sqft?.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Details */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="detail-grid">
          <div><div className="detail-label">Total Area</div><div className="detail-value">{listing.total_area_sqft?.toLocaleString('en-IN')} sqft</div></div>
          <div><div className="detail-label">Dimensions</div><div className="detail-value">{listing.dimensions}</div></div>
          <div><div className="detail-label">Facing</div><div className="detail-value">{formatFacing(listing.facing)}</div></div>
          <div><div className="detail-label">Open Sides</div><div className="detail-value">{listing.open_sides}</div></div>
          <div><div className="detail-label">Boundary Wall</div><div className="detail-value">{listing.boundary_wall ? 'Yes' : 'No'}</div></div>
          <div><div className="detail-label">Floors Allowed</div><div className="detail-value">{listing.floors_allowed}</div></div>
          <div><div className="detail-label">Construction Done</div><div className="detail-value">{listing.construction_done}</div></div>
          <div><div className="detail-label">Agent</div><div className="detail-value">{listing.agent_name}</div></div>
          <div><div className="detail-label">Listed On</div><div className="detail-value">{formatDate(listing.created_at)}</div></div>
          {listing.description && <div style={{ gridColumn: '1/-1' }}><div className="detail-label">Description</div><div className="detail-value">{listing.description}</div></div>}
        </div>

        {listing.status === 'committed' && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--badge-committed-bg)', borderRadius: 8 }}>
            <div style={{ fontWeight: 600, color: 'var(--badge-committed-text)', marginBottom: '0.25rem' }}>Committed to Client</div>
            <div style={{ fontSize: '0.85rem' }}>{listing.committed_client_name} • {listing.committed_client_phone} • {formatDate(listing.committed_date)}</div>
          </div>
        )}
      </div>

      {/* Actions */}
      {listing.status === 'available' && (
        <button className="btn-primary" onClick={() => setShowCommit(true)}>
          Commit to Client
        </button>
      )}

      {/* Commit Modal */}
      {showCommit && (
        <div className="modal-overlay" onClick={() => setShowCommit(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Commit Listing {formatSetNo(listing.set_no)}</h3>
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
              <button className="btn-primary" onClick={handleCommit}>Confirm Commit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
