import { useState, useEffect } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { formatIndianPrice, formatDate, statusBadgeClass, displayPrice } from '../../utils/helpers'
import { Zap, Share2, ChevronDown, ChevronUp } from 'lucide-react'

export default function MatchingTool() {
  const [leads, setLeads] = useState([])
  const [selectedLead, setSelectedLead] = useState('')
  const [session, setSession] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [expandedSession, setExpandedSession] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lRes, sRes] = await Promise.all([
          api.get('/leads'),
          api.get('/matching'),
        ])
        setLeads(lRes.data)
        setSessions(sRes.data)
      } catch { toast.error('Failed to load data') }
      finally { setHistoryLoading(false) }
    }
    fetchData()
  }, [])

  const handleMatch = async () => {
    if (!selectedLead) return toast.error('Select a lead to match')
    setLoading(true)
    setSession(null)
    try {
      const res = await api.post('/matching', { lead_id: selectedLead })
      setSession(res.data)
      setSessions(prev => [res.data, ...prev])
      toast.success(`Found ${res.data.results.length} matching properties!`)
    } catch (err) { toast.error(err.response?.data?.detail || 'Matching failed') }
    finally { setLoading(false) }
  }

  const handleShare = async (sessionId) => {
    try {
      await api.patch(`/matching/${sessionId}/share`)
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, shared_via_whatsapp: true } : s))
      if (session?.id === sessionId) setSession(prev => ({ ...prev, shared_via_whatsapp: true }))
      toast.success('Marked as shared via WhatsApp!')
    } catch { toast.error('Failed') }
  }

  const selectedLeadData = leads.find(l => l.id === selectedLead)

  return (
    <div className="page-container">
      <h1 className="page-title">Property Matching</h1>
      <p style={{ color: 'var(--muted-text)', marginBottom: '1.5rem' }}>
        Select a lead and find the best matching available properties.
      </p>

      {/* Match form */}
      <div className="card" style={{ marginBottom: '1.5rem', maxWidth: 700 }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 220, margin: 0 }}>
            <label className="form-label">Select Lead</label>
            <select className="form-select" value={selectedLead} onChange={e => setSelectedLead(e.target.value)}>
              <option value="">Choose a lead...</option>
              {leads.filter(l => !['converted', 'lost'].includes(l.status)).map(l => (
                <option key={l.id} value={l.id}>
                  {l.client?.name || l.client_name} — {l.preferred_district || l.requirements?.preferred_district || 'Any'}
                  {(l.budget_max || l.requirements?.budget_max)
                    ? ` (up to ${formatIndianPrice(l.budget_max || l.requirements?.budget_max)})`
                    : ''}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-primary" onClick={handleMatch} disabled={loading || !selectedLead} style={{ height: 42 }}>
            <Zap size={16} />
            {loading ? 'Matching...' : 'Find Matches'}
          </button>
        </div>

        {selectedLeadData && (
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--page-bg)', borderRadius: 8, fontSize: '0.83rem', color: 'var(--muted-text)' }}>
            <strong style={{ color: 'var(--heading)' }}>{selectedLeadData.client?.name || selectedLeadData.client_name}</strong>
            {' · '}{selectedLeadData.preferred_property_type || selectedLeadData.requirements?.preferred_property_type || 'Any type'}
            {' · '}{selectedLeadData.preferred_district || selectedLeadData.requirements?.preferred_district || 'Any location'}
            {(selectedLeadData.budget_min || selectedLeadData.requirements?.budget_min) &&
              <> · Budget: {formatIndianPrice(selectedLeadData.budget_min || selectedLeadData.requirements?.budget_min)} – {formatIndianPrice(selectedLeadData.budget_max || selectedLeadData.requirements?.budget_max)}</>
            }
          </div>
        )}
      </div>

      {/* Match results */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
        </div>
      )}

      {session && !loading && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--heading)', margin: 0 }}>
              {session.results.length} Match{session.results.length !== 1 ? 'es' : ''} Found
            </h2>
            <button
              className={session.shared_via_whatsapp ? 'btn-secondary' : 'btn-primary'}
              style={{ fontSize: '0.82rem', padding: '0.4rem 0.9rem' }}
              onClick={() => handleShare(session.id)}
              disabled={session.shared_via_whatsapp}
            >
              <Share2 size={14} />
              {session.shared_via_whatsapp ? 'Shared via WhatsApp' : 'Share via WhatsApp'}
            </button>
          </div>

          {session.results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-text)' }}>
              No matching properties found. Try broadening the requirements.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {session.results.map((r, i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '3rem 1fr auto',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                  background: 'var(--page-bg)',
                  borderRadius: 10,
                  border: i === 0 ? '1.5px solid var(--primary)' : '1px solid transparent',
                }}>
                  {/* Score badge */}
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: r.score >= 70 ? '#ECFDF5' : r.score >= 40 ? '#FEF3C7' : '#FEF2F2',
                    color: r.score >= 70 ? '#059669' : r.score >= 40 ? '#D97706' : '#DC2626',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.85rem', flexShrink: 0,
                  }}>
                    {r.score}
                  </div>

                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--heading)' }}>
                      {r.locality || '—'}
                      {r.type && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--muted-text)', fontWeight: 400 }}>({r.type})</span>}
                    </div>
                    {r.match_notes && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.2rem' }}>
                        {r.match_notes}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--price-highlight)', whiteSpace: 'nowrap' }}>
                    {formatIndianPrice(r.price)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Session history */}
      {!historyLoading && sessions.length > 0 && (
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--heading)', marginBottom: '0.75rem' }}>
            Previous Sessions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sessions.slice(0, 10).map(s => {
              const lead = leads.find(l => l.id === s.lead_id)
              const isExpanded = expandedSession === s.id
              return (
                <div key={s.id} className="card" style={{ padding: '0.85rem 1rem' }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                    onClick={() => setExpandedSession(isExpanded ? null : s.id)}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--heading)' }}>
                        {lead ? (lead.client?.name || lead.client_name) : 'Lead'}
                        <span style={{ marginLeft: '0.5rem', fontWeight: 400, color: 'var(--muted-text)', fontSize: '0.8rem' }}>
                          {s.results.length} match{s.results.length !== 1 ? 'es' : ''}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)' }}>
                        {formatDate(s.created_at)}
                        {s.shared_via_whatsapp && <span style={{ marginLeft: '0.5rem', color: '#10B981', fontWeight: 600 }}>· Shared</span>}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>

                  {isExpanded && s.results.length > 0 && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {s.results.slice(0, 5).map((r, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.35rem 0.5rem', background: 'var(--page-bg)', borderRadius: 6 }}>
                          <span>{r.locality} · Score: <strong>{r.score}</strong></span>
                          <span style={{ color: 'var(--price-highlight)', fontWeight: 600 }}>{formatIndianPrice(r.price)}</span>
                        </div>
                      ))}
                      {!s.shared_via_whatsapp && (
                        <button className="btn-secondary" style={{ alignSelf: 'flex-start', fontSize: '0.78rem', marginTop: '0.35rem' }} onClick={() => handleShare(s.id)}>
                          <Share2 size={13} /> Mark Shared
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
