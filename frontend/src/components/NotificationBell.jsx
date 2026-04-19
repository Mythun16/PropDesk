import { useEffect, useRef } from 'react'
import { Bell, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNotifications } from '../contexts/NotificationContext'
import { formatDate } from '../utils/helpers'

export default function NotificationBell() {
  const {
    notifications, count, loading, open, setOpen,
    handleApproveCollab, handleDenyCollab,
    handleAcceptInvite, handleDeclineInvite,
  } = useNotifications()

  const ref = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [setOpen])

  // Show login popup toast when notifications arrive at session start
  useEffect(() => {
    const handler = (e) => {
      const n = e.detail
      toast(`You have ${n} pending notification${n > 1 ? 's' : ''}. Tap the bell to view.`, {
        icon: '🔔',
        duration: 5000,
        style: { fontWeight: 600 },
      })
    }
    window.addEventListener('notif-login-popup', handler)
    return () => window.removeEventListener('notif-login-popup', handler)
  }, [])

  return (
    <div className="notif-bell-wrap" ref={ref}>
      <button
        className="notif-bell-btn"
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {count > 0 && (
          <span className="notif-badge">{count > 9 ? '9+' : count}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--heading)' }}>
              Notifications
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {count > 0 && (
                <span style={{
                  background: '#EF4444', color: '#fff', borderRadius: 12,
                  padding: '0.1rem 0.45rem', fontSize: '0.7rem', fontWeight: 700,
                }}>
                  {count}
                </span>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', color: 'var(--muted-text)', display: 'flex' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="notif-list">
            {loading && (
              <div className="notif-empty">Loading...</div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="notif-empty">
                All caught up — no pending notifications.
              </div>
            )}
            {notifications.map(n => (
              <div key={n.id} className="notif-item">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.04em', padding: '0.1rem 0.4rem', borderRadius: 6,
                      background: n.type === 'agency_invite' ? '#EDE9FE' : n.type === 'collab_approved' ? '#D1FAE5' : '#DBEAFE',
                      color: n.type === 'agency_invite' ? '#7C3AED' : n.type === 'collab_approved' ? '#065F46' : '#1D4ED8',
                    }}>
                      {n.type === 'agency_invite' ? 'Invite' : n.type === 'collab_approved' ? 'Active' : 'Collab'}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)' }}>
                      {formatDate(n.timestamp)}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--heading)', marginBottom: '0.1rem' }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--body-text)' }}>{n.body}</div>
                  {n.sub && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)' }}>{n.sub}</div>
                  )}
                  {n.message && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', fontStyle: 'italic', marginTop: '0.2rem' }}>
                      "{n.message}"
                    </div>
                  )}
                </div>

                {(n.type === 'collab_request' || n.type === 'agency_invite') && (
                  <div className="notif-item-actions">
                    {n.type === 'collab_request' && (
                      <>
                        <button className="notif-btn-approve" onClick={() => handleApproveCollab(n.rawId)}>Approve</button>
                        <button className="notif-btn-deny" onClick={() => handleDenyCollab(n.rawId)}>Deny</button>
                      </>
                    )}
                    {n.type === 'agency_invite' && (
                      <>
                        <button className="notif-btn-approve" onClick={() => handleAcceptInvite(n.rawId)}>Accept</button>
                        <button className="notif-btn-deny" onClick={() => handleDeclineInvite(n.rawId)}>Decline</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
