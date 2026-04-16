import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import ListingCard from '../../components/ListingCard'
import toast from 'react-hot-toast'
import { FolderOpen } from 'lucide-react'

export default function MyListings() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const nav = useNavigate()

  const fetchData = async () => {
    try {
      const res = await api.get('/listings', { params: { agent_only: true } })
      setListings(res.data)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const handleDelete = async (listing) => {
    if (!confirm(`Delete listing #${String(listing.set_no).padStart(3,'0')}?`)) return
    try {
      await api.delete(`/listings/${listing.id}`)
      toast.success('Listing deleted')
      fetchData()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const handleEdit = (listing) => {
    nav('/agent/listings/new', { state: { listing } })
  }

  if (loading) return (
    <div className="page-container">
      <div className="listings-grid">
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 350 }} />)}
      </div>
    </div>
  )

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>My Listings</h1>
        <button className="btn-primary" onClick={() => nav('/agent/listings/new')}>+ Upload Plot</button>
      </div>

      {listings.length === 0 ? (
        <div className="empty-state">
          <FolderOpen size={48} />
          <p>You haven't uploaded any listings yet.</p>
          <button className="btn-primary" onClick={() => nav('/agent/listings/new')}>Upload Your First Plot</button>
        </div>
      ) : (
        <div className="listings-grid">
          {listings.map(l => (
            <ListingCard
              key={l.id}
              listing={l}
              showActions
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
