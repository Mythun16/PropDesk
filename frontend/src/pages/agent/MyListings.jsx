import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import ListingCard from '../../components/ListingCard'
import toast from 'react-hot-toast'
import { FolderOpen, Users } from 'lucide-react'

export default function MyListings() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const nav = useNavigate()
  const ownedListings = listings.filter(l => !l.is_collaboration)
  const collabListings = listings.filter(l => l.is_collaboration)

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
        <button className="btn-primary" onClick={() => nav('/agent/listings/new')}>+ Add Property</button>
      </div>

      {listings.length === 0 ? (
        <div className="empty-state">
          <FolderOpen size={48} />
          <p>You haven't uploaded any listings yet.</p>
          <button className="btn-primary" onClick={() => nav('/agent/listings/new')}>Add Your First Property</button>
        </div>
      ) : (
        <>
          {ownedListings.length > 0 && (
            <>
              {collabListings.length > 0 && (
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--heading)', marginBottom: '0.75rem' }}>
                  My Properties
                </h2>
              )}
              <div className="listings-grid" style={{ marginBottom: collabListings.length > 0 ? '2rem' : 0 }}>
                {ownedListings.map(l => (
                  <ListingCard
                    key={l.id}
                    listing={l}
                    showActions
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </>
          )}

          {collabListings.length > 0 && (
            <>
              <h2 style={{
                fontSize: '1rem', fontWeight: 700, color: 'var(--heading)', marginBottom: '0.75rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <Users size={17} color="#7C3AED" />
                <span style={{ color: '#7C3AED' }}>Collaborations</span>
                <span style={{ background: '#EDE9FE', color: '#7C3AED', borderRadius: 12, padding: '0.1rem 0.5rem', fontSize: '0.72rem', fontWeight: 700 }}>
                  {collabListings.length}
                </span>
              </h2>
              <div className="listings-grid">
                {collabListings.map(l => (
                  <ListingCard
                    key={l.id}
                    listing={l}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
