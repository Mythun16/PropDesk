import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { getInitials } from '../utils/helpers'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, Search, FolderOpen, Upload, Users, Settings, LogOut, Menu, X, UserPlus
} from 'lucide-react'
import { useState } from 'react'

const agentLinks = [
  { to: '/agent/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agent/listings', icon: Search, label: 'All Listings' },
  { to: '/agent/my-listings', icon: FolderOpen, label: 'My Listings' },
  { to: '/agent/listings/new', icon: Upload, label: 'Upload Plot' },
  { to: '/agent/leads', icon: UserPlus, label: 'Leads' },
  { to: '/agent/settings', icon: Settings, label: 'Settings' },
]

const adminLinks = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/agents', icon: Users, label: 'Agent Performance' },
  { to: '/admin/listings', icon: Search, label: 'All Listings' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const links = user?.role === 'admin' ? adminLinks : agentLinks

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

      {/* Mobile overlay */}
      {open && <div className="mobile-overlay" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
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
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className={`sidebar-avatar ${user?.avatar_url ? '' : 'initials'}`}>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.full_name} />
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
