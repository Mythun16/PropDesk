import { formatIndianPrice, formatSetNo, formatFacing, statusBadgeClass, imageUrl } from '../utils/helpers'
import { MapPin, Maximize2, Compass, Layers, Building2, ImageOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function ListingCard({ listing, basePath = '/agent/listings', showActions, onEdit, onDelete }) {
  const nav = useNavigate()
  const thumb = listing.images?.[0]

  return (
    <div className="card listing-card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Image */}
      <div className="listing-card-img">
        {thumb ? (
          <img src={imageUrl(thumb)} alt={listing.location} />
        ) : (
          <ImageOff size={32} />
        )}
      </div>

      {/* Badges */}
      <div className="listing-card-badges">
        <span className={statusBadgeClass(listing.status)}>{listing.status}</span>
        <span className={`badge badge-${listing.property_type?.toLowerCase()}`}>
          {listing.property_type}
        </span>
      </div>

      {/* Body */}
      <div className="listing-card-body">
        <div className="listing-card-setno">{formatSetNo(listing.set_no)}</div>
        <div className="listing-card-location">{listing.location}</div>
        <div className="listing-card-district" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <MapPin size={12} /> {listing.district}
        </div>

        <dl className="listing-card-details">
          <dt><Maximize2 size={11} /> Area</dt>
          <dd>{listing.total_area_sqft?.toLocaleString('en-IN')} sqft</dd>
          <dt>Dimensions</dt>
          <dd>{listing.dimensions}</dd>
          <dt><Compass size={11} /> Facing</dt>
          <dd>{formatFacing(listing.facing)}</dd>
          <dt><Layers size={11} /> Open Sides</dt>
          <dd>{listing.open_sides}</dd>
          <dt>Boundary Wall</dt>
          <dd>{listing.boundary_wall ? 'Yes' : 'No'}</dd>
          <dt><Building2 size={11} /> Floors</dt>
          <dd>{listing.floors_allowed}</dd>
          <dt>Construction</dt>
          <dd>{listing.construction_done}</dd>
        </dl>

        <div className="listing-card-price">
          <span className="price-sqft">₹{listing.price_per_sqft?.toLocaleString('en-IN')}/sqft</span>
          <span className="price-total">{formatIndianPrice(listing.total_property_value)}</span>
        </div>

        <div className="listing-card-footer">
          <span className="listing-card-agent">{listing.agent_name || '—'}</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {showActions && listing.status === 'available' && (
              <>
                <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => onEdit?.(listing)}>Edit</button>
                <button className="btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => onDelete?.(listing)}>Delete</button>
              </>
            )}
            <button
              className="btn-primary"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
              onClick={() => nav(`${basePath}/${listing.id}`)}
            >
              View
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
