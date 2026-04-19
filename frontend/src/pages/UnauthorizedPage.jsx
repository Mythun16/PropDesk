import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Building2, LayoutDashboard, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function dashboardPath(role) {
  if (role === 'admin') return '/admin/dashboard'
  if (role === 'telecaller') return '/telecaller/dashboard'
  return '/agent/dashboard'
}

export default function UnauthorizedPage() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const handleDashboard = () => {
    if (user) {
      nav(dashboardPath(user.role), { replace: true });
    } else {
      nav('/login', { replace: true });
    }
  };

  const handleLogin = () => {
    logout();
    nav('/login', { replace: true });
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', padding: '2rem', textAlign: 'center',
      background: 'var(--page-bg)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <Building2 size={28} color="#059669" />
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
          Prop<span style={{ color: '#059669' }}>Desk</span>
        </h1>
      </div>
      <ShieldAlert size={60} color="#EF4444" style={{ marginBottom: '1rem' }} />
      <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>
        403 — Unauthorized
      </h2>
      <p style={{ color: '#6B7280', marginBottom: '2rem', maxWidth: '380px', lineHeight: 1.6 }}>
        You don't have permission to view this page.
        {user && ` You're signed in as ${user.role}.`}
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {user ? (
          <>
            <button className="btn-primary" onClick={handleDashboard} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <LayoutDashboard size={16} /> Go to Dashboard
            </button>
            <button className="btn-secondary" onClick={handleLogin} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <LogIn size={16} /> Switch Account
            </button>
          </>
        ) : (
          <button className="btn-primary" onClick={handleLogin} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <LogIn size={16} /> Return to Login
          </button>
        )}
      </div>
    </div>
  );
}
