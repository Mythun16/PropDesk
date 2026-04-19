import { Component } from 'react'
import { Building2, AlertTriangle, RotateCcw, LogIn } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  handleDashboard = () => {
    this.setState({ hasError: false, error: null })
    const role = localStorage.getItem('role')
    const path = role === 'admin' ? '/admin/dashboard'
                : role === 'telecaller' ? '/telecaller/dashboard'
                : '/agent/dashboard'
    window.location.href = path
  }

  handleLogin = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const role = localStorage.getItem('role')

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh', padding: '2rem', textAlign: 'center',
        background: '#F0FDF4',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <Building2 size={28} color="#059669" />
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
            Prop<span style={{ color: '#059669' }}>Desk</span>
          </h1>
        </div>

        <AlertTriangle size={60} color="#D97706" style={{ marginBottom: '1rem' }} />
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>
          Something went wrong
        </h2>
        <p style={{ color: '#6B7280', marginBottom: '0.5rem', maxWidth: '400px', lineHeight: 1.6 }}>
          An unexpected error occurred. Your data is safe — try reloading or returning to the dashboard.
        </p>
        {import.meta.env.DEV && this.state.error && (
          <pre style={{
            background: '#FEE2E2', color: '#B91C1C', borderRadius: 8,
            padding: '0.75rem', fontSize: '0.72rem', maxWidth: '500px',
            textAlign: 'left', overflowX: 'auto', marginBottom: '1rem',
          }}>
            {this.state.error.message}
          </pre>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1rem' }}>
          <button
            onClick={this.handleReload}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              background: '#059669', color: '#fff', border: 'none',
              padding: '0.65rem 1.25rem', borderRadius: 6, fontWeight: 600,
              fontSize: '0.875rem', cursor: 'pointer',
            }}
          >
            <RotateCcw size={16} /> Reload Page
          </button>
          {role && (
            <button
              onClick={this.handleDashboard}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                background: '#fff', color: '#064E3B', border: '1px solid #BBF7D0',
                padding: '0.65rem 1.25rem', borderRadius: 6, fontWeight: 600,
                fontSize: '0.875rem', cursor: 'pointer',
              }}
            >
              Go to Dashboard
            </button>
          )}
          <button
            onClick={this.handleLogin}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              background: '#fff', color: '#6B7280', border: '1px solid #E5E7EB',
              padding: '0.65rem 1.25rem', borderRadius: 6, fontWeight: 500,
              fontSize: '0.875rem', cursor: 'pointer',
            }}
          >
            <LogIn size={16} /> Back to Login
          </button>
        </div>
      </div>
    )
  }
}
