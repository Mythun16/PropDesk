import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { Building2, Hash, CheckCircle2, ArrowRight, AlertTriangle, Globe, MessageCircle, Bell } from 'lucide-react'

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ta', label: 'Tamil' },
  { value: 'hi', label: 'Hindi' },
]

export default function AgentSettings() {
  const { user, setUser } = useAuth()
  const nav = useNavigate()

  const [joinCode, setJoinCode] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [joined, setJoined] = useState(false)
  const [joinedCompany, setJoinedCompany] = useState(null)
  const [companyInfo, setCompanyInfo] = useState(null)

  const [language, setLanguage] = useState(user?.language || 'en')
  const [whatsappOptedIn, setWhatsappOptedIn] = useState(user?.whatsapp_opted_in ?? false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [invites, setInvites] = useState([])
  const [inviteLoading, setInviteLoading] = useState(false)
  const [phone, setPhone] = useState(user?.phone || '')
  const [phoneSaving, setPhoneSaving] = useState(false)

  const hasCompany = !!user?.company_id

  useEffect(() => {
    api.get('/auth/me').then(res => {
      setUser(res.data)
      if (res.data.company_name) setCompanyInfo({ name: res.data.company_name })
      setLanguage(res.data.language || 'en')
      setWhatsappOptedIn(res.data.whatsapp_opted_in ?? false)
      setPhone(res.data.phone || '')
    }).catch(() => {})
    api.get('/agents/my-invites').then(res => setInvites(res.data)).catch(() => {})
  }, [])

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!joinCode.trim()) return toast.error('Enter a join code')
    setJoinLoading(true)
    try {
      const res = await api.post('/auth/join-company', { join_code: joinCode.trim() })
      toast.success(`Joined "${res.data.company_name}" successfully!`)
      setJoinedCompany(res.data.company_name)
      setJoined(true)
      const meRes = await api.get('/auth/me')
      setUser(meRes.data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to join company')
    } finally {
      setJoinLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    setProfileSaving(true)
    try {
      await api.patch('/agents/me/profile', { language, whatsapp_opted_in: whatsappOptedIn })
      const meRes = await api.get('/auth/me')
      setUser(meRes.data)
      toast.success('Profile preferences saved!')
    } catch { toast.error('Failed to save preferences') }
    finally { setProfileSaving(false) }
  }

  const handleWhatsappToggle = async (val) => {
    setWhatsappOptedIn(val)
    try {
      await api.patch('/whatsapp/opt-in', { whatsapp_opted_in: val })
      const meRes = await api.get('/auth/me')
      setUser(meRes.data)
      toast.success(val ? 'WhatsApp notifications enabled' : 'WhatsApp notifications disabled')
    } catch { toast.error('Failed to update WhatsApp preference') }
  }

  const handleSavePhone = async () => {
    setPhoneSaving(true)
    try {
      await api.patch('/agents/me/profile', { phone })
      const meRes = await api.get('/auth/me')
      setUser(meRes.data)
      toast.success('Phone number saved!')
    } catch { toast.error('Failed') }
    finally { setPhoneSaving(false) }
  }

  const handleAcceptInvite = async (inviteId, agencyName) => {
    setInviteLoading(true)
    try {
      await api.post(`/agents/invites/${inviteId}/accept`)
      toast.success(`Joined ${agencyName}!`)
      setInvites(prev => prev.filter(i => i.id !== inviteId))
      const meRes = await api.get('/auth/me')
      setUser(meRes.data)
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setInviteLoading(false) }
  }

  const handleDeclineInvite = async (inviteId) => {
    try {
      await api.post(`/agents/invites/${inviteId}/decline`)
      setInvites(prev => prev.filter(i => i.id !== inviteId))
      toast.success('Invite declined')
    } catch { toast.error('Failed') }
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Settings</h1>

      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>

        {/* Preferences */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--heading)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe size={18} /> Preferences
          </h3>

          <div className="form-group">
            <label className="form-label">Language</label>
            <select className="form-select" value={language} onChange={e => setLanguage(e.target.value)}>
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input className="form-input" type="tel" placeholder="+91 9999999999" value={phone} onChange={e => setPhone(e.target.value)} style={{ flex: 1 }} />
              <button className="btn-secondary" style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap' }} onClick={handleSavePhone} disabled={phoneSaving}>
                {phoneSaving ? '...' : 'Save'}
              </button>
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
                <MessageCircle size={15} /> WhatsApp Notifications
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.2rem' }}>
                Receive lead digests and reminders via WhatsApp.
              </p>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={whatsappOptedIn} onChange={e => handleWhatsappToggle(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>

          <button className="btn-primary" onClick={handleSaveProfile} disabled={profileSaving} style={{ marginTop: '0.25rem' }}>
            {profileSaving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>

        {/* Company join */}
        <div className="card" style={{ maxWidth: 520 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--heading)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={18} /> Agency
          </h3>

          {hasCompany && !joined ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', background: '#ECFDF5', borderRadius: 8, border: '1px solid #A7F3D0' }}>
              <CheckCircle2 size={20} color="#059669" />
              <div>
                <div style={{ fontWeight: 600, color: '#065F46', fontSize: '0.9rem' }}>
                  Linked to: {companyInfo?.name ?? 'an agency'}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#047857', marginTop: '0.15rem' }}>
                  Your listings and leads are visible to your admin.
                </div>
              </div>
            </div>
          ) : joined ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', background: '#ECFDF5', borderRadius: 8, border: '1px solid #A7F3D0', marginBottom: '1rem' }}>
              <CheckCircle2 size={20} color="#059669" />
              <div>
                <div style={{ fontWeight: 600, color: '#065F46', fontSize: '0.9rem' }}>Joined "{joinedCompany}"!</div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '0.85rem 1rem', background: '#FEF3C7', borderRadius: 8, border: '1px solid #FCD34D', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 600, color: '#92400E', fontSize: '0.875rem' }}>Not linked to any agency</div>
              <div style={{ fontSize: '0.78rem', color: '#B45309', marginTop: '0.25rem' }}>Enter your admin's join code to connect.</div>
            </div>
          )}

          {!joined && (
            <form onSubmit={handleJoin} style={{ marginTop: hasCompany ? '1.25rem' : 0 }}>
              {hasCompany && (
                <p style={{ fontSize: '0.8rem', color: 'var(--muted-text)', marginBottom: '0.75rem' }}>
                  Want to join a different agency? Enter the new join code.
                </p>
              )}
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Hash size={14} /> Agency Join Code
                </label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. A3F9B2"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  style={{ letterSpacing: '0.15em', fontWeight: 600, textTransform: 'uppercase' }}
                  disabled={joinLoading}
                />
              </div>
              <button className="btn-primary" type="submit" disabled={joinLoading || !joinCode.trim()} style={{ width: '100%', justifyContent: 'center', padding: '0.65rem' }}>
                {joinLoading ? 'Joining...' : (<>Join Agency <ArrowRight size={15} style={{ marginLeft: '0.25rem' }} /></>)}
              </button>
            </form>
          )}

          {joined && (
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.65rem' }} onClick={() => nav('/agent/dashboard')}>
              Go to Dashboard <ArrowRight size={15} style={{ marginLeft: '0.25rem' }} />
            </button>
          )}
        </div>
      </div>

      {invites.length > 0 && (
        <div className="card" style={{ maxWidth: 520, marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--heading)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={18} /> Agency Invitations
            <span style={{ background: '#EF4444', color: '#fff', borderRadius: 12, padding: '0.1rem 0.5rem', fontSize: '0.75rem', fontWeight: 700 }}>{invites.length}</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {invites.map(inv => (
              <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--page-bg)', borderRadius: 8, gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--heading)' }}>{inv.agency_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)' }}>Invited you to join their team</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => handleAcceptInvite(inv.id, inv.agency_name)} disabled={inviteLoading}>
                    Accept
                  </button>
                  <button className="btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => handleDeclineInvite(inv.id)}>
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
