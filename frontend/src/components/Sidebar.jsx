import { NavLink, useNavigate } from 'react-router-dom'
import { getInitials } from '../utils/helpers'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, Search, FolderOpen, Upload, Users, Settings,
  LogOut, Menu, X, UserPlus, Globe, MessageCircle, Zap, PhoneCall, Bell,
} from 'lucide-react'
import { useState, useEffect } from 'react'

const agentLinks = [
  { to: '/agent/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agent/listings', icon: Search, label: 'All Properties' },
  { to: '/agent/my-listings', icon: FolderOpen, label: 'My Properties' },
  { to: '/agent/listings/new', icon: Upload, label: 'Add Property' },
  { to: '/agent/leads', icon: UserPlus, label: 'Leads' },
  { to: '/agent/match', icon: Zap, label: 'Match Leads' },
  { to: '/agent/portal-posts', icon: Globe, label: 'Portal Posts' },
  { to: '/agent/settings', icon: Settings, label: 'Settings' },
]

const telecallerLinks = [
  { to: '/telecaller/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/telecaller/leads', icon: PhoneCall, label: 'Lead Queue' },
  { to: '/telecaller/settings', icon: Settings, label: 'Settings' },
]

const adminLinks = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/agents', icon: Users, label: 'Team Performance' },
  { to: '/admin/listings', icon: Search, label: 'All Properties' },
  { to: '/admin/portal-posts', icon: Globe, label: 'Portal Posts' },
  { to: '/admin/whatsapp', icon: MessageCircle, label: 'WhatsApp' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
]

function linksByRole(role) {
  if (role === 'admin') return adminLinks
  if (role === 'telecaller') return telecallerLinks
  return agentLinks
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [inviteCount, setInviteCount] = useState(0)
  const links = linksByRole(user?.role)

  useEffect(() => {
    if (user?.role === 'agent' || user?.role === 'telecaller') {
      import('../api/axios').then(mod => {
        mod.default.get('/agents/my-invites').then(res => setInviteCount(res.data.length)).catch(() => {})
      })
    }
  }, [user?.role])

  const handleLogout = () => {
    logout()
    nav('/login')
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <button className="hamburger-btn" onClick={() => setOpen(true)}>
          <Menu size={24} />
        </button>
        <h2>Prop<span>Desk</span></h2>
      </div>

      {open && <div className="mobile-overlay" onClick={() => setOpen(false)} />}

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1>Prop<span>Desk</span></h1>
          <button
            className="hamburger-btn"
            onClick={() => setOpen(false)}
            style={{ display: open ? 'block' : 'none' }}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              {label}
              {(to === '/agent/settings' || to === '/telecaller/settings') && inviteCount > 0 && (
                <span style={{ marginLeft: 'auto', background: '#EF4444', color: '#fff', borderRadius: 10, padding: '0.05rem 0.45rem', fontSize: '0.7rem', fontWeight: 700 }}>
                  {inviteCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className={`sidebar-avatar ${user?.avatar_url ? '' : 'initials'}`}>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.full_name} referrerPolicy="no-referrer" />
            ) : (
              getInitials(user?.full_name)
            )}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.full_name}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
        </div>

        <div style={{ padding: '0 1.25rem 1rem' }}>
          <button
            className="btn-secondary"
            style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}
