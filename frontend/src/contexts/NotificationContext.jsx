import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import api from '../api/axios'
import { useAuth } from './AuthContext'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const popupShown = useRef(false)

  const buildNotifications = useCallback((collabReqs = [], invites = []) => {
    const list = []
    for (const req of collabReqs) {
      list.push({
        id: `collab-${req.id}`,
        rawId: req.id,
        type: 'collab_request',
        title: `${req.requester_name} wants to collaborate`,
        body: req.property_info?.title || `Set ${req.property_info?.set_no || '—'}`,
        sub: req.property_info?.locality ? `${req.property_info.locality}${req.property_info.city ? `, ${req.property_info.city}` : ''}` : '',
        message: req.message || null,
        timestamp: req.created_at,
        data: req,
      })
    }
    for (const inv of invites) {
      list.push({
        id: `invite-${inv.id}`,
        rawId: inv.id,
        type: 'agency_invite',
        title: `${inv.agency_name} invited you`,
        body: 'Join their agency team',
        sub: '',
        message: null,
        timestamp: inv.created_at,
        data: inv,
      })
    }
    list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    return list
  }, [])

  const buildAdminNotifications = useCallback((collabReqs = []) => {
    return collabReqs.map(req => ({
      id: `admin-collab-${req.id}`,
      rawId: req.id,
      type: 'collab_approved',
      title: `${req.requester_name} is collaborating`,
      body: req.property_info?.title || `Set ${req.property_info?.set_no || '—'}`,
      sub: `With ${req.owner_name} · ${req.property_info?.locality || ''}${req.property_info?.city ? `, ${req.property_info.city}` : ''}`,
      message: null,
      timestamp: req.updated_at || req.created_at,
      data: req,
    })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }, [])

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      if (user.role === 'admin') {
        const res = await api.get('/assignment-requests/company')
        const approved = res.data.filter(r => r.status === 'approved')
        const built = buildAdminNotifications(approved)
        setNotifications(built)
        if (!popupShown.current && built.length > 0) {
          popupShown.current = true
          window.dispatchEvent(new CustomEvent('notif-login-popup', { detail: built.length }))
        }
      } else {
        const [collabRes, inviteRes] = await Promise.all([
          api.get('/assignment-requests', { params: { direction: 'incoming' } }),
          api.get('/agents/my-invites'),
        ])
        const pending = collabRes.data.filter(r => r.status === 'pending')
        const built = buildNotifications(pending, inviteRes.data)
        setNotifications(built)

        if (!popupShown.current && built.length > 0) {
          popupShown.current = true
          window.dispatchEvent(new CustomEvent('notif-login-popup', { detail: built.length }))
        }
      }
    } catch {}
    finally { setLoading(false) }
  }, [user, buildNotifications, buildAdminNotifications])

  useEffect(() => {
    if (user) {
      fetchNotifications()
    } else {
      setNotifications([])
    }
  }, [user?.id, fetchNotifications])

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const handleApproveCollab = async (rawId) => {
    await api.patch(`/assignment-requests/${rawId}/approve`)
    removeNotification(`collab-${rawId}`)
  }

  const handleDenyCollab = async (rawId) => {
    await api.patch(`/assignment-requests/${rawId}/deny`)
    removeNotification(`collab-${rawId}`)
  }

  const handleAcceptInvite = async (rawId) => {
    await api.post(`/agents/invites/${rawId}/accept`)
    removeNotification(`invite-${rawId}`)
    // Re-fetch user to update company
    const meRes = await api.get('/auth/me')
    window.dispatchEvent(new CustomEvent('auth-refresh', { detail: meRes.data }))
  }

  const handleDeclineInvite = async (rawId) => {
    await api.post(`/agents/invites/${rawId}/decline`)
    removeNotification(`invite-${rawId}`)
  }

  const count = notifications.length

  return (
    <NotificationContext.Provider value={{
      notifications, count, loading, open, setOpen,
      fetchNotifications,
      handleApproveCollab, handleDenyCollab,
      handleAcceptInvite, handleDeclineInvite,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
