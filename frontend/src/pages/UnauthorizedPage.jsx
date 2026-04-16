import { Link } from 'react-router-dom';
import { ShieldAlert, Building2 } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '2rem', textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Building2 size={28} color="#059669" />
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
          Prop<span style={{ color: '#059669' }}>Desk</span>
        </h1>
      </div>
      <ShieldAlert size={64} color="#EF4444" style={{ marginBottom: '1rem' }} />
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>403 - Unauthorized</h1>
      <p style={{ color: '#6B7280', marginBottom: '2rem', maxWidth: '400px' }}>
        You do not have permission to view this page. If you believe this is an error, please contact support or your company administrator.
      </p>
      <Link to="/login" className="btn-primary" style={{ textDecoration: 'none' }}>
        Return to Login
      </Link>
    </div>
  );
}
