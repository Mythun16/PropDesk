import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import toast from 'react-hot-toast'
import api from '../api/axios'
import { Building2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const nav = useNavigate()
  const { login } = useAuth()

  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [selectedRole, setSelectedRole] = useState('agent')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Login fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Sign-up fields
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirm, setSignupConfirm] = useState('')

  const handleSuccess = (data) => {
    login(data.token, data.user)

    const userRole = data.user?.role || data.role
    if (data.is_new_user === true || data.user?.is_new_user === true) {
      return nav('/onboarding', { replace: true })
    }

    if (userRole && userRole !== selectedRole) {
      toast.error(`You are trying to log in as ${selectedRole}, but your account is registered as ${userRole}.`)
    }

    if (!data.user?.company_id && userRole !== 'admin') {
      return nav('/pending', { replace: true })
    }

    nav(data.last_page || (userRole === 'admin' ? '/admin/dashboard' : '/agent/dashboard'), { replace: true })
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Please fill in all fields')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password })
      if (res.data.user.role !== selectedRole) {
        toast.error(`Access Denied: You are not authorized as an ${selectedRole}.`)
        setLoading(false)
        return
      }
      toast.success('Welcome back!')
      handleSuccess(res.data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    if (!signupName || !signupEmail || !signupPassword || !signupConfirm) {
      return toast.error('Please fill in all fields')
    }
    if (signupPassword !== signupConfirm) {
      return toast.error('Passwords do not match')
    }
    if (signupPassword.length < 6) {
      return toast.error('Password must be at least 6 characters')
    }
    setLoading(true)
    try {
      const res = await api.post('/auth/register', {
        full_name: signupName,
        email: signupEmail,
        password: signupPassword,
        role: selectedRole,
      })
      toast.success('Account created! Let\'s set up your workspace.')
      handleSuccess(res.data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async (credentialResponse) => {
    if (googleLoading) return
    setGoogleLoading(true)
    try {
      const res = await api.post('/auth/google', {
        credential: credentialResponse.credential,
        role: selectedRole,
      })
      toast.success('Welcome!')
      handleSuccess(res.data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Google login failed')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Building2 size={28} color="#059669" />
          <h1>Prop<span>Desk</span></h1>
        </div>
        <p className="login-subtitle">Real Estate CRM for Tamil Nadu Agents</p>

        {/* Role Segmented Control */}
        <div style={{ display: 'flex', background: '#F3F4F6', padding: '0.25rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
          <button
            type="button"
            onClick={() => setSelectedRole('agent')}
            style={{
              flex: 1, padding: '0.5rem', borderRadius: '0.375rem', fontWeight: 500, fontSize: '0.875rem',
              background: selectedRole === 'agent' ? '#fff' : 'transparent',
              borderColor: selectedRole === 'agent' ? '#E5E7EB' : 'transparent',
              boxShadow: selectedRole === 'agent' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              color: selectedRole === 'agent' ? '#111827' : '#6B7280',
            }}
          >
            Agent
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('admin')}
            style={{
              flex: 1, padding: '0.5rem', borderRadius: '0.375rem', fontWeight: 500, fontSize: '0.875rem',
              background: selectedRole === 'admin' ? '#fff' : 'transparent',
              borderColor: selectedRole === 'admin' ? '#E5E7EB' : 'transparent',
              boxShadow: selectedRole === 'admin' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              color: selectedRole === 'admin' ? '#111827' : '#6B7280',
            }}
          >
            Admin
          </button>
        </div>

        {/* Login / Sign Up tab */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', marginBottom: '1.25rem' }}>
          <button
            type="button"
            onClick={() => setMode('login')}
            style={{
              flex: 1, padding: '0.5rem', background: 'none', border: 'none',
              fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
              color: mode === 'login' ? '#059669' : '#6B7280',
              borderBottom: mode === 'login' ? '2px solid #059669' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            style={{
              flex: 1, padding: '0.5rem', background: 'none', border: 'none',
              fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
              color: mode === 'signup' ? '#059669' : '#6B7280',
              borderBottom: mode === 'signup' ? '2px solid #059669' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            Sign Up
          </button>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.7rem' }} type="submit" disabled={loading}>
              {loading ? 'Signing in...' : `Sign In as ${selectedRole === 'admin' ? 'Admin' : 'Agent'}`}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" type="text" placeholder="Your full name" value={signupName} onChange={e => setSignupName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="you@example.com" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="Min. 6 characters" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input className="form-input" type="password" placeholder="Re-enter password" value={signupConfirm} onChange={e => setSignupConfirm(e.target.value)} />
            </div>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.7rem' }} type="submit" disabled={loading}>
              {loading ? 'Creating account...' : `Create ${selectedRole === 'admin' ? 'Admin' : 'Agent'} Account`}
            </button>
          </form>
        )}

        <div className="login-divider">OR</div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ pointerEvents: googleLoading ? 'none' : 'auto', width: '100%' }}>
            <GoogleLogin
              onSuccess={handleGoogle}
              onError={() => toast.error('Google Sign-In failed')}
              theme="outline"
              size="large"
              text={mode === 'signup' ? 'signup_with' : 'signin_with'}
              width="100%"
            />
            {googleLoading && (
              <div style={{ marginTop: '0.75rem', textAlign: 'center', color: '#6B7280' }}>
                Signing in with Google...
              </div>
            )}
          </div>
        </div>

        {mode === 'login' && (
          <p style={{ marginTop: '1.25rem', fontSize: '0.75rem', color: '#9CA3AF', textAlign: 'center' }}>
            Demo: admin@demorealty.com / admin123 or agent@demorealty.com / agent123
          </p>
        )}
      </div>
    </div>
  )
}
