import { useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { Upload, X, ImagePlus } from 'lucide-react'
import { imageUrl } from '../../utils/helpers'

const facingOptions = [
  { value: 'E', label: 'East' }, { value: 'W', label: 'West' },
  { value: 'N', label: 'North' }, { value: 'S', label: 'South' },
  { value: 'NE', label: 'North-East' }, { value: 'NW', label: 'North-West' },
  { value: 'SE', label: 'South-East' }, { value: 'SW', label: 'South-West' },
]

const constructionOptions = ['No', 'Compound wall only', 'Partial foundation', 'Yes']

const amenityOptions = [
  'School', 'Hospital', 'Metro', 'Bus Stop', 'Mall', 'Park',
  'Supermarket', 'Bank', 'Gym', 'Restaurant',
]

// Map legacy property types to new enum values
function normalisePropertyType(val) {
  if (!val) return 'plot'
  const v = val.toLowerCase()
  if (v === 'residential') return 'plot'
  if (v === 'commercial') return 'plot'
  return v // house | plot already in new format
}

export default function UploadListing() {
  const nav = useNavigate()
  const location = useLocation()
  const editData = location.state?.listing || null
  const isEdit = !!editData

  const [form, setForm] = useState({
    // New fields
    title: editData?.title || '',
    transaction_type: editData?.transaction_type || 'sell',
    property_type: normalisePropertyType(editData?.property_type),
    price: editData?.price ?? editData?.total_property_value ?? '',
    is_negotiable: editData?.is_negotiable ?? false,
    // Location — structured
    city: editData?.location?.city || editData?.district || '',
    locality: editData?.location?.locality || editData?.location_str || '',
    pincode: editData?.location?.pincode || '',
    // Legacy detail fields (kept for backward compat + plot-specific use)
    total_area_sqft: editData?.total_area_sqft || '',
    price_per_sqft: editData?.price_per_sqft || '',
    dimensions: editData?.dimensions || '',
    open_sides: editData?.open_sides || 2,
    facing: editData?.facing || 'E',
    construction_done: editData?.construction_done || 'No',
    boundary_wall: editData?.boundary_wall ?? true,
    floors_allowed: editData?.floors_allowed || 2,
    description: editData?.description || '',
    photos: editData?.photos || editData?.images || [],
    nearby_amenities: editData?.nearby_amenities || {},
  })
  const [errors, setErrors] = useState({})
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef()

  const setField = (key, val) => {
    const next = { ...form, [key]: val }
    // Auto-calc price per sqft when area or price changes
    if (key === 'total_area_sqft' || key === 'price') {
      const area = key === 'total_area_sqft' ? Number(val) : Number(next.total_area_sqft)
      const price = key === 'price' ? Number(val) : Number(next.price)
      if (area && price) next.price_per_sqft = Math.round(price / area)
    }
    setForm(next)
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }))
  }

  const toggleAmenity = (amenity) => {
    setForm(prev => {
      const current = { ...prev.nearby_amenities }
      if (current[amenity]) delete current[amenity]
      else current[amenity] = true
      return { ...prev, nearby_amenities: current }
    })
  }

  const validate = () => {
    const errs = {}
    if (!form.city) errs.city = 'Required'
    if (!form.locality) errs.locality = 'Required'
    if (!form.transaction_type) errs.transaction_type = 'Required'
    if (!form.price || Number(form.price) <= 0) errs.price = 'Required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (form.photos.length + files.length > 10) return toast.error('Maximum 10 images')
    setUploading(true)
    try {
      const fd = new FormData()
      files.forEach(f => fd.append('files', f))
      const res = await api.post('/uploads/images', fd)
      setForm(prev => ({ ...prev, photos: [...prev.photos, ...res.data.filenames] }))
    } catch { toast.error('Upload failed') }
    finally { setUploading(false) }
  }

  const removeImage = (idx) => {
    setForm(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)

    const payload = {
      property_type: form.property_type,
      transaction_type: form.transaction_type,
      title: form.title || `${form.property_type === 'house' ? 'House' : 'Plot'} in ${form.locality}`,
      price: Number(form.price),
      is_negotiable: form.is_negotiable,
      location_detail: {
        city: form.city,
        locality: form.locality,
        pincode: form.pincode || null,
      },
      // Keep legacy fields for backward compat
      location: form.locality,
      district: form.city,
      description: form.description || null,
      facing: form.facing,
      photos: form.photos,
      images: form.photos,
      // Legacy detail fields
      total_area_sqft: form.total_area_sqft ? Number(form.total_area_sqft) : null,
      price_per_sqft: form.price_per_sqft ? Number(form.price_per_sqft) : null,
      total_property_value: Number(form.price),
      dimensions: form.dimensions || null,
      open_sides: Number(form.open_sides),
      construction_done: form.construction_done,
      boundary_wall: form.boundary_wall,
      floors_allowed: Number(form.floors_allowed),
      nearby_amenities: Object.keys(form.nearby_amenities).length ? form.nearby_amenities : null,
    }

    const isAdminContext = location.pathname.startsWith('/admin')
    try {
      if (isEdit) {
        await api.put(`/listings/${editData.id}`, payload)
        toast.success('Property updated!')
      } else {
        const res = await api.post('/listings', payload)
        toast.success(`Property ${String(res.data.set_no).padStart(3, '0')} added!`)
      }
      nav(isAdminContext ? '/admin/listings' : '/agent/my-listings', { replace: true })
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="page-container">
      <h1 className="page-title">{isEdit ? 'Edit Property' : 'Add New Property'}</h1>

      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 960 }}>
        <div className="form-two-col">
          {/* ── Left column ── */}
          <div>
            {/* Transaction type */}
            <div className="form-group">
              <label className="form-label">Transaction Type *</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {[
                  { value: 'sell', label: 'Sell' },
                  { value: 'rent', label: 'Rent' },
                  { value: 'lease', label: 'Lease' },
                ].map(opt => (
                  <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input type="radio" name="transaction_type" checked={form.transaction_type === opt.value} onChange={() => setField('transaction_type', opt.value)} />
                    {opt.label}
                  </label>
                ))}
              </div>
              {errors.transaction_type && <div className="form-error">{errors.transaction_type}</div>}
            </div>

            {/* Property type */}
            <div className="form-group">
              <label className="form-label">Property Type</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {[
                  { value: 'house', label: 'House' },
                  { value: 'plot', label: 'Plot' },
                ].map(opt => (
                  <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input type="radio" name="property_type" checked={form.property_type === opt.value} onChange={() => setField('property_type', opt.value)} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" value={form.title} onChange={e => setField('title', e.target.value)} placeholder="e.g. East-facing plot near main road" />
            </div>

            {/* Location */}
            <div className="form-group">
              <label className="form-label">City / District *</label>
              <input className="form-input" value={form.city} onChange={e => setField('city', e.target.value)} placeholder="e.g. Chennai" />
              {errors.city && <div className="form-error">{errors.city}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Locality *</label>
              <input className="form-input" value={form.locality} onChange={e => setField('locality', e.target.value)} placeholder="e.g. Tambaram" />
              {errors.locality && <div className="form-error">{errors.locality}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Pincode</label>
              <input className="form-input" value={form.pincode} onChange={e => setField('pincode', e.target.value)} placeholder="e.g. 600045" maxLength={6} />
            </div>

            {/* Price */}
            <div className="form-group">
              <label className="form-label">
                {form.transaction_type === 'rent' ? 'Monthly Rent (₹)' : form.transaction_type === 'lease' ? 'Lease Amount (₹)' : 'Price (₹)'} *
              </label>
              <input className="form-input" type="number" value={form.price} onChange={e => setField('price', e.target.value)} />
              {errors.price && <div className="form-error">{errors.price}</div>}
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Negotiable</label>
              <label className="toggle-switch">
                <input type="checkbox" checked={form.is_negotiable} onChange={e => setField('is_negotiable', e.target.checked)} />
                <span className="toggle-slider" />
              </label>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted-text)' }}>{form.is_negotiable ? 'Yes' : 'No'}</span>
            </div>

            {/* Area */}
            <div className="form-group">
              <label className="form-label">Total Area (sqft)</label>
              <input className="form-input" type="number" value={form.total_area_sqft} onChange={e => setField('total_area_sqft', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Price per sqft (₹)</label>
              <input className="form-input" type="number" value={form.price_per_sqft} readOnly style={{ background: 'var(--page-bg)' }} />
            </div>
          </div>

          {/* ── Right column ── */}
          <div>
            {/* Dimensions */}
            <div className="form-group">
              <label className="form-label">Dimensions (ft)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  className="form-input" type="number" min="1" placeholder="Length"
                  value={form.dimensions.split('x')[0] || ''}
                  onChange={e => {
                    const l = e.target.value
                    const w = form.dimensions.split('x')[1] || ''
                    setField('dimensions', l && w ? `${l}x${w}` : l)
                  }}
                />
                <input
                  className="form-input" type="number" min="1" placeholder="Width"
                  value={form.dimensions.split('x')[1] || ''}
                  onChange={e => {
                    const w = e.target.value
                    const l = form.dimensions.split('x')[0] || ''
                    setField('dimensions', l && w ? `${l}x${w}` : w)
                  }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Open Sides</label>
              <select className="form-select" value={form.open_sides} onChange={e => setField('open_sides', e.target.value)}>
                {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Facing</label>
              <select className="form-select" value={form.facing} onChange={e => setField('facing', e.target.value)}>
                {facingOptions.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Construction Done</label>
              <select className="form-select" value={form.construction_done} onChange={e => setField('construction_done', e.target.value)}>
                {constructionOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Boundary Wall</label>
              <label className="toggle-switch">
                <input type="checkbox" checked={form.boundary_wall} onChange={e => setField('boundary_wall', e.target.checked)} />
                <span className="toggle-slider" />
              </label>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted-text)' }}>{form.boundary_wall ? 'Yes' : 'No'}</span>
            </div>
            <div className="form-group">
              <label className="form-label">Floors Allowed</label>
              <input className="form-input" type="number" min="1" value={form.floors_allowed} onChange={e => setField('floors_allowed', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Additional notes..." />
            </div>
          </div>
        </div>

        {/* ── Nearby Amenities ── */}
        <div className="form-group" style={{ marginTop: '0.5rem' }}>
          <label className="form-label">Nearby Amenities</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {amenityOptions.map(a => (
              <label key={a} style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.3rem 0.75rem', borderRadius: 20, cursor: 'pointer',
                fontSize: '0.8rem', fontWeight: 500, userSelect: 'none',
                border: `1px solid ${form.nearby_amenities[a] ? 'var(--primary)' : '#D1D5DB'}`,
                background: form.nearby_amenities[a] ? 'var(--primary)' : 'transparent',
                color: form.nearby_amenities[a] ? '#fff' : 'var(--muted-text)',
                transition: 'all 0.15s',
              }}>
                <input type="checkbox" checked={!!form.nearby_amenities[a]} onChange={() => toggleAmenity(a)} style={{ display: 'none' }} />
                {a}
              </label>
            ))}
          </div>
        </div>

        {/* ── Photos ── */}
        <div className="form-group" style={{ marginTop: '0.5rem' }}>
          <label className="form-label">Photos (max 10)</label>
          <div className="upload-area" onClick={() => fileRef.current?.click()}>
            <ImagePlus size={24} />
            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
              {uploading ? 'Uploading...' : 'Click to upload images'}
            </p>
            <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          </div>
          {form.photos.length > 0 && (
            <div className="upload-thumbs">
              {form.photos.map((img, idx) => (
                <div key={idx} className="upload-thumb">
                  <img src={imageUrl(img)} alt="" />
                  <button type="button" className="upload-thumb-remove" onClick={() => removeImage(idx)}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="button" className="btn-secondary" onClick={() => nav(-1)}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            <Upload size={16} />
            {submitting ? 'Saving...' : isEdit ? 'Update Property' : 'Add Property'}
          </button>
        </div>
      </form>
    </div>
  )
}
