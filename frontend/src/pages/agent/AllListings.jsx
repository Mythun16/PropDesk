import { useState, useEffect } from 'react'
import api from '../../api/axios'
import ListingCard from '../../components/ListingCard'
import toast from 'react-hot-toast'
import { Search, X } from 'lucide-react'

const facingOptions = [
  { value: '', label: 'Any' }, { value: 'E', label: 'East' }, { value: 'W', label: 'West' },
  { value: 'N', label: 'North' }, { value: 'S', label: 'South' },
  { value: 'NE', label: 'North-East' }, { value: 'NW', label: 'North-West' },
  { value: 'SE', label: 'South-East' }, { value: 'SW', label: 'South-West' },
]

export default function AllListings({ adminView = false }) {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    district: '', location: '', property_type: '', min_area: '', max_area: '',
    min_price_sqft: '', max_price_sqft: '', min_value: '', max_value: '',
    open_sides: '', facing: '', boundary_wall: '', construction_done: '',
    min_floors: '', status: '',
  })

  const fetchListings = async (params = {}) => {
    setLoading(true)
    try {
      const cleanParams = {}
      Object.entries(params).forEach(([k, v]) => { if (v !== '' && v != null) cleanParams[k] = v })
      const res = await api.get('/listings', { params: cleanParams })
      setListings(res.data)
    } catch { toast.error('Failed to load listings') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchListings() }, [])

  const handleSearch = () => fetchListings(filters)
  const handleClear = () => {
    const cleared = Object.fromEntries(Object.keys(filters).map(k => [k, '']))
    setFilters(cleared)
    fetchListings()
  }
  const setFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val }))

  return (
    <div className="page-container">
      <h1 className="page-title">{adminView ? 'All Company Listings' : 'Search Listings'}</h1>

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="filter-grid">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem' }}>District</label>
            <input className="form-input" placeholder="Chennai..." value={filters.district} onChange={e => setFilter('district', e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem' }}>Location</label>
            <input className="form-input" placeholder="Tambaram..." value={filters.location} onChange={e => setFilter('location', e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem' }}>Property Type</label>
            <select className="form-select" value={filters.property_type} onChange={e => setFilter('property_type', e.target.value)}>
              <option value="">All</option>
              <option value="house">House</option>
              <option value="plot">Plot</option>
              <option value="Residential">Residential (legacy)</option>
              <option value="Commercial">Commercial (legacy)</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem' }}>Min Area (sqft)</label>
            <input className="form-input" type="number" value={filters.min_area} onChange={e => setFilter('min_area', e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem' }}>Max Area (sqft)</label>
            <input className="form-input" type="number" value={filters.max_area} onChange={e => setFilter('max_area', e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem' }}>Min ₹/sqft</label>
            <input className="form-input" type="number" value={filters.min_price_sqft} onChange={e => setFilter('min_price_sqft', e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem' }}>Max ₹/sqft</label>
            <input className="form-input" type="number" value={filters.max_price_sqft} onChange={e => setFilter('max_price_sqft', e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem' }}>Facing</label>
            <select className="form-select" value={filters.facing} onChange={e => setFilter('facing', e.target.value)}>
              {facingOptions.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem' }}>Open Sides</label>
            <select className="form-select" value={filters.open_sides} onChange={e => setFilter('open_sides', e.target.value)}>
              <option value="">Any</option>
              {[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem' }}>Boundary Wall</label>
            <select className="form-select" value={filters.boundary_wall} onChange={e => setFilter('boundary_wall', e.target.value)}>
              <option value="">Any</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem' }}>Construction</label>
            <select className="form-select" value={filters.construction_done} onChange={e => setFilter('construction_done', e.target.value)}>
              <option value="">Any</option>
              <option value="No">No</option>
              <option value="Compound wall only">Compound wall only</option>
              <option value="Partial foundation">Partial foundation</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem' }}>Status</label>
            <select className="form-select" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
              <option value="">All</option>
              <option value="available">Available</option>
              <option value="in_discussion">In Discussion</option>
              <option value="negotiating">Negotiating</option>
              <option value="deal_closed">Deal Closed</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>
        </div>
        <div className="filter-actions">
          <button className="btn-primary" onClick={handleSearch} style={{ background: 'var(--search-btn)' }}>
            <Search size={16} /> Search
          </button>
          <button className="btn-secondary" onClick={handleClear}><X size={16} /> Clear All</button>
          <span className="result-count">{listings.length} properties found</span>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="listings-grid">
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 350 }} />)}
        </div>
      ) : (Array.isArray(listings) && listings.length === 0) ? (
        <div className="empty-state">
          <Search size={48} />
          <p>No listings found matching your filters.</p>
          <button className="btn-primary" onClick={handleClear}>Clear Filters</button>
        </div>
      ) : (
        <div className="listings-grid">
          {Array.isArray(listings) && listings.map(l => (
            <ListingCard
              key={l.id}
              listing={l}
              basePath={adminView ? '/admin/listings' : '/agent/listings'}
            />
          ))}
        </div>
      )}
    </div>
  )
}
