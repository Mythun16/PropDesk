import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { Building2, UserCircle, Shield, Hash } from 'lucide-react';

export default function OnboardingPage() {
  const { user, login, loading: authLoading } = useAuth();
  const nav = useNavigate();

  const [step, setStep] = useState(0);
  const [role, setRole] = useState('');         // legacy guest onboarding only
  const [companyName, setCompanyName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  if (authLoading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const isLegacyGuest = user.role === 'guest';
  const needsOnboarding = user.is_new_user === true || isLegacyGuest;

  if (!needsOnboarding) {
    return <Navigate to={user.last_page || (user.role === 'admin' ? '/admin/dashboard' : '/agent/dashboard')} replace />;
  }

  const effectiveRole = isLegacyGuest ? role : user.role;
  const isAdmin = effectiveRole === 'admin';
  const companyRequired = user.company_id === null;

  const handleComplete = async () => {
    if (!effectiveRole) return toast.error('Please select a role');
    if (companyRequired) {
      if (isAdmin && !companyName.trim()) return toast.error('Please enter a company name');
      if (!isAdmin && !joinCode.trim()) return toast.error('Please enter your company join code');
    }

    setLoading(true);
    try {
      const payload = { role: effectiveRole };
      if (companyRequired) {
        if (isAdmin) payload.company_name = companyName.trim();
        else payload.join_code = joinCode.trim().toUpperCase();
      }
      const res = await api.post('/auth/complete-onboarding', payload);
      toast.success('Setup complete!');
      login(res.data.token, res.data.user);
      nav(res.data.last_page || (isAdmin ? '/admin/dashboard' : '/agent/dashboard'));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: '620px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Building2 size={28} color="#059669" />
          <h1>Prop<span>Desk</span> Onboarding</h1>
        </div>

        <p className="login-subtitle">
          {effectiveRole
            ? `Welcome ${isAdmin ? 'Admin' : 'Agent'}! Let's get you set up.`
            : 'Welcome! Let\'s get you set up.'}
        </p>

        {/* Legacy flow: role selection */}
        {isLegacyGuest && !role && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div
                onClick={() => setRole('agent')}
                style={{
                  border: `2px solid ${role === 'agent' ? '#059669' : '#E5E7EB'}`,
                  borderRadius: '0.5rem', padding: '1rem', cursor: 'pointer', textAlign: 'center',
                  backgroundColor: role === 'agent' ? '#ECFDF5' : 'white',
                }}
              >
                <UserCircle size={32} color={role === 'agent' ? '#059669' : '#9CA3AF'} style={{ margin: '0 auto 0.5rem' }} />
                <h3 style={{ fontWeight: 600, color: '#111827' }}>Agent</h3>
                <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>Join your company with a code</p>
              </div>
              <div
                onClick={() => setRole('admin')}
                style={{
                  border: `2px solid ${role === 'admin' ? '#059669' : '#E5E7EB'}`,
                  borderRadius: '0.5rem', padding: '1rem', cursor: 'pointer', textAlign: 'center',
                  backgroundColor: role === 'admin' ? '#ECFDF5' : 'white',
                }}
              >
                <Shield size={32} color={role === 'admin' ? '#059669' : '#9CA3AF'} style={{ margin: '0 auto 0.5rem' }} />
                <h3 style={{ fontWeight: 600, color: '#111827' }}>Admin</h3>
                <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>Create your company workspace</p>
              </div>
            </div>
          </>
        )}

        {(!isLegacyGuest || role) && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>Step {step + 1} of 3</div>
              <button type="button" className="btn-secondary" style={{ padding: '0.35rem 0.5rem' }} onClick={() => nav('/login')} disabled={loading}>Exit</button>
            </div>

            {step === 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>Get started with PropDesk</h3>
                <p style={{ color: '#6B7280', marginBottom: '1rem' }}>
                  {isAdmin
                    ? 'Create your company workspace, share your join code with agents, and manage everything from one place.'
                    : 'Your admin will give you a company join code. Enter it to connect to your team and start managing listings and leads.'}
                </p>
                <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.7rem' }} type="button" onClick={() => setStep(1)} disabled={loading}>Next</button>
              </div>
            )}

            {step === 1 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>Your daily workflow</h3>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div style={{ background: '#F3F4F6', borderRadius: '0.5rem', padding: '0.75rem' }}>
                    <strong>Listings:</strong> search and manage property plots across your team.
                  </div>
                  <div style={{ background: '#F3F4F6', borderRadius: '0.5rem', padding: '0.75rem' }}>
                    <strong>Leads:</strong> capture enquiries, track status, and link deals to listings.
                  </div>
                  <div style={{ background: '#F3F4F6', borderRadius: '0.5rem', padding: '0.75rem' }}>
                    {isAdmin
                      ? <><strong>Team:</strong> see all your agents' performance from the dashboard.</>
                      : <><strong>My Listings:</strong> view and manage only your own uploads.</>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center', padding: '0.7rem' }} type="button" onClick={() => setStep(0)} disabled={loading}>Back</button>
                  <button className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '0.7rem' }} type="button" onClick={() => setStep(2)} disabled={loading}>Next</button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>Finish setup</h3>

                {companyRequired && (
                  isAdmin ? (
                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                      <label className="form-label">Company Name</label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder="e.g. Dream Homes Realty"
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        disabled={loading}
                      />
                      <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.35rem' }}>
                        A unique join code will be generated for your agents to use.
                      </p>
                    </div>
                  ) : (
                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Hash size={14} /> Company Join Code
                      </label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder="e.g. A3F9B2"
                        value={joinCode}
                        onChange={e => setJoinCode(e.target.value.toUpperCase())}
                        maxLength={8}
                        style={{ letterSpacing: '0.15em', fontWeight: 600, textTransform: 'uppercase' }}
                        disabled={loading}
                      />
                      <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.35rem' }}>
                        Get this code from your admin. It links you to your company team.
                      </p>
                    </div>
                  )
                )}

                {!companyRequired && (
                  <p style={{ color: '#6B7280', marginBottom: '1rem' }}>You're ready. Finish setup to unlock your dashboard.</p>
                )}

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center', padding: '0.7rem' }} type="button" onClick={() => setStep(1)} disabled={loading}>Back</button>
                  <button
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: 'center', padding: '0.7rem' }}
                    type="button"
                    onClick={handleComplete}
                    disabled={loading || (companyRequired && isAdmin && !companyName.trim()) || (companyRequired && !isAdmin && !joinCode.trim())}
                  >
                    {loading ? 'Saving...' : 'Finish setup'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
