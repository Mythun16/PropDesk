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

export default function UploadListing() {
  const nav = useNavigate()
  const location = useLocation()
  const editData = location.state?.listing || null
  const isEdit = !!editData

  const [form, setForm] = useState({
    location: editData?.location || '',
    district: editData?.district || '',
    property_type: editData?.property_type || 'Residential',
    total_area_sqft: editData?.total_area_sqft || '',
    price_per_sqft: editData?.price_per_sqft || '',
    total_property_value: editData?.total_property_value || '',
    // store raw dimensions string for backend, but let user edit as two fields
    dimensions: editData?.dimensions || '',
    open_sides: editData?.open_sides || 2,
    facing: editData?.facing || 'E',
    construction_done: editData?.construction_done || 'No',
    boundary_wall: editData?.boundary_wall ?? true,
    floors_allowed: editData?.floors_allowed || 2,
    description: editData?.description || '',
    images: editData?.images || [],
  })
  const [errors, setErrors] = useState({})
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef()

  const setField = (key, val) => {
    const next = { ...form, [key]: val }
    // Auto-calc total value
    if (key === 'total_area_sqft' || key === 'price_per_sqft') {
      const area = key === 'total_area_sqft' ? Number(val) : Number(next.total_area_sqft)
      const pps = key === 'price_per_sqft' ? Number(val) : Number(next.price_per_sqft)
      if (area && pps) next.total_property_value = area * pps
    }
    // Back-calc price_per_sqft if total value edited directly
    if (key === 'total_property_value') {
      const area = Number(next.total_area_sqft)
      if (area) next.price_per_sqft = Math.round(Number(val) / area)
    }
    setForm(next)
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.location) errs.location = 'Required'
    if (!form.district) errs.district = 'Required'
    if (!form.total_area_sqft || Number(form.total_area_sqft) <= 0) errs.total_area_sqft = 'Required'
    if (!form.price_per_sqft || Number(form.price_per_sqft) <= 0) errs.price_per_sqft = 'Required'
    if (!form.dimensions) errs.dimensions = 'Required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (form.images.length + files.length > 10) return toast.error('Maximum 10 images')
    setUploading(true)
    try {
      const fd = new FormData()
      files.forEach(f => fd.append('files', f))
      const res = await api.post('/uploads/images', fd)
      setForm(prev => ({ ...prev, images: [...prev.images, ...res.data.filenames] }))
    } catch { toast.error('Upload failed') }
    finally { setUploading(false) }
  }

  const removeImage = (idx) => {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    const payload = {
      ...form,
      total_area_sqft: Number(form.total_area_sqft),
      price_per_sqft: Number(form.price_per_sqft),
      total_property_value: Number(form.total_property_value),
      open_sides: Number(form.open_sides),
      floors_allowed: Number(form.floors_allowed),
    }
    try {
      if (isEdit) {
        await api.put(`/listings/${editData.id}`, payload)
        toast.success('Listing updated!')
      } else {
        const res = await api.post('/listings', payload)
        toast.success(`Plot #${String(res.data.set_no).padStart(3, '0')} added successfully!`)
      }
      nav('/agent/my-listings')
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="page-container">
      <h1 className="page-title">{isEdit ? 'Edit Listing' : 'Upload New Plot'}</h1>

      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 900 }}>
        <div className="form-two-col">
          {/* Left column */}
          <div>
            <div className="form-group">
              <label className="form-label">Location *</label>
              <input className="form-input" value={form.location} onChange={e => setField('location', e.target.value)} placeholder="e.g. Tambaram" />
              {errors.location && <div className="form-error">{errors.location}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">District *</label>
              <input className="form-input" value={form.district} onChange={e => setField('district', e.target.value)} placeholder="e.g. Chennai" />
              {errors.district && <div className="form-error">{errors.district}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Property Type</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {['Residential', 'Commercial'].map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input type="radio" name="property_type" checked={form.property_type === t} onChange={() => setField('property_type', t)} />
                    {t}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Total Area (sqft) *</label>
              <input className="form-input" type="number" value={form.total_area_sqft} onChange={e => setField('total_area_sqft', e.target.value)} />
              {errors.total_area_sqft && <div className="form-error">{errors.total_area_sqft}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Price per sqft (₹) *</label>
              <input className="form-input" type="number" value={form.price_per_sqft} onChange={e => setField('price_per_sqft', e.target.value)} />
              {errors.price_per_sqft && <div className="form-error">{errors.price_per_sqft}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Total Property Value (₹)</label>
              <input className="form-input" type="number" value={form.total_property_value} onChange={e => setField('total_property_value', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Dimensions (ft) *</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  placeholder="Length (e.g. 40)"
                  value={form.dimensions.split('x')[0] || ''}
                  onChange={e => {
                    const length = e.target.value;
                    const parts = form.dimensions.split('x');
                    const width = parts[1] || '';
                    const value = length && width ? `${length}x${width}` : length || '';
                    setField('dimensions', value);
                  }}
                />
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  placeholder="Width (e.g. 60)"
                  value={form.dimensions.split('x')[1] || ''}
                  onChange={e => {
                    const width = e.target.value;
                    const parts = form.dimensions.split('x');
                    const length = parts[0] || '';
                    const value = length && width ? `${length}x${width}` : width || '';
                    setField('dimensions', value);
                  }}
                />
              </div>
              {errors.dimensions && <div className="form-error">{errors.dimensions}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Open Sides</label>
              <select className="form-select" value={form.open_sides} onChange={e => setField('open_sides', e.target.value)}>
                {[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          {/* Right column */}
          <div>
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
            <div className="form-group">
              <label className="form-label">Boundary Wall</label>
              <label className="toggle-switch">
                <input type="checkbox" checked={form.boundary_wall} onChange={e => setField('boundary_wall', e.target.checked)} />
                <span className="toggle-slider" />
              </label>
              <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem' }}>{form.boundary_wall ? 'Yes' : 'No'}</span>
            </div>
            <div className="form-group">
              <label className="form-label">Floors Allowed</label>
              <input className="form-input" type="number" min="1" value={form.floors_allowed} onChange={e => setField('floors_allowed', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Additional notes about the plot..." />
            </div>
            <div className="form-group">
              <label className="form-label">Photos (max 10)</label>
              <div className="upload-area" onClick={() => fileRef.current?.click()}>
                <ImagePlus size={24} />
                <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                  {uploading ? 'Uploading...' : 'Click to upload images'}
                </p>
                <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
              </div>
              {form.images.length > 0 && (
                <div className="upload-thumbs">
                  {form.images.map((img, idx) => (
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
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="button" className="btn-secondary" onClick={() => nav(-1)}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            <Upload size={16} />
            {submitting ? 'Saving...' : isEdit ? 'Update Listing' : 'Upload Plot'}
          </button>
        </div>
      </form>
    </div>
  )
}
