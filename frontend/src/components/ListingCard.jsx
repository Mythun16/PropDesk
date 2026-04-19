import { formatIndianPrice, formatSetNo, formatFacing, statusBadgeClass, imageUrl } from '../utils/helpers'
import { MapPin, Maximize2, Compass, Layers, Building2, ImageOff, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function ListingCard({ listing, basePath = '/agent/listings', showActions, onEdit, onDelete }) {
  const nav = useNavigate()
  const thumb = listing.photos?.[0] || listing.images?.[0]

  return (
    <div className="card listing-card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Image */}
      <div className="listing-card-img">
        {thumb ? (
          <img src={imageUrl(thumb)} alt={listing.locality || listing.location_str || listing.title || ''} />
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
        <div className="listing-card-setno">{listing.title || formatSetNo(listing.set_no)}</div>
        <div className="listing-card-location">{listing.locality || listing.location || 'Location not specified'}</div>
        <div className="listing-card-district" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <MapPin size={12} /> {listing.city || listing.district || 'District N/A'}
        </div>

        <dl className="listing-card-details">
          <dt><Maximize2 size={11} /> Area</dt>
          <dd>
            {(listing.total_area_sqft || listing.area_sqft) 
              ? `${(listing.total_area_sqft || listing.area_sqft).toLocaleString('en-IN')} sqft` 
              : 'N/A'}
          </dd>
          {listing.dimensions && <><dt>Dimensions</dt><dd>{listing.dimensions}</dd></>}
          <dt><Compass size={11} /> Facing</dt>
          <dd>{formatFacing(listing.facing) || 'N/A'}</dd>
          {listing.open_sides != null && <><dt><Layers size={11} /> Open Sides</dt><dd>{listing.open_sides}</dd></>}
          {listing.boundary_wall != null && <><dt>Boundary Wall</dt><dd>{listing.boundary_wall ? 'Yes' : 'No'}</dd></>}
          {listing.floors_allowed != null && <><dt><Building2 size={11} /> Floors</dt><dd>{listing.floors_allowed}</dd></>}
          {listing.construction_done && <><dt>Construction</dt><dd>{listing.construction_done}</dd></>}
        </dl>

        <div className="listing-card-price">
          {listing.price_per_sqft && (
            <span className="price-sqft">
              ₹{Number(listing.price_per_sqft || 0).toLocaleString('en-IN')}/sqft
            </span>
          )}
          <span className="price-total">{formatIndianPrice(listing.price || listing.total_property_value)}</span>
        </div>

        <div className="listing-card-footer">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', minWidth: 0 }}>
            {listing.is_collaboration ? (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.04em', color: '#7C3AED',
                background: '#EDE9FE', padding: '0.15rem 0.5rem', borderRadius: 10,
                width: 'fit-content',
              }}>
                <Users size={10} /> Collaboration
              </span>
            ) : (
              <span className="listing-card-agent">{listing.agent_name || '—'}</span>
            )}
            {listing.agent_phone && !listing.is_collaboration && (
              <span style={{ fontSize: '0.68rem', color: 'var(--muted-text)' }}>{listing.agent_phone}</span>
            )}
          </div>
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
