import { useState, useEffect } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import { Users, Package, TrendingUp, UserPlus } from 'lucide-react'

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/admin/dashboard')
        setData(res.data)
      } catch { toast.error('Failed to load dashboard') }
      finally { setLoading(false) }
    })()
  }, [])

  if (loading) return (
    <div className="page-container">
      <div className="stats-grid">{[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 90 }} />)}</div>
    </div>
  )

  if (!data) return null

  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const closedData = data.closed_by_month.map(m => ({
    name: `${monthNames[m.month]} ${m.year}`,
    count: m.count,
  }))

  return (
    <div className="page-container">
      <h1 className="page-title">Admin Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', fontWeight: 600, textTransform: 'uppercase' }}>Total Agents</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--heading)' }}>{data.total_agents}</div>
            </div>
            <Users size={28} color="var(--stat-border)" />
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', fontWeight: 600, textTransform: 'uppercase' }}>Total Listings</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--heading)' }}>{data.listings_by_status.total}</div>
            </div>
            <Package size={28} color="var(--stat-border)" />
          </div>
        </div>
        <div className="stat-card" style={{ borderTopColor: 'var(--stat-available)' }}>
          <div><div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', fontWeight: 600, textTransform: 'uppercase' }}>Available</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--stat-available)' }}>{data.listings_by_status.available}</div></div>
        </div>
        <div className="stat-card" style={{ borderTopColor: 'var(--stat-committed)' }}>
          <div><div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', fontWeight: 600, textTransform: 'uppercase' }}>Committed</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--stat-committed)' }}>{data.listings_by_status.committed}</div></div>
        </div>
        <div className="stat-card" style={{ borderTopColor: 'var(--stat-closed)' }}>
          <div><div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', fontWeight: 600, textTransform: 'uppercase' }}>Closed</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--stat-closed)' }}>{data.listings_by_status.closed}</div></div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', fontWeight: 600, textTransform: 'uppercase' }}>Total Leads</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--heading)' }}>{data.total_leads}</div>
            </div>
            <UserPlus size={28} color="var(--stat-border)" />
          </div>
        </div>
      </div>

      <div className="charts-grid">
        {/* Listings per agent */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--heading)', marginBottom: '1rem' }}>Listings per Agent</h3>
          {data.listings_per_agent.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.listings_per_agent} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="agent_name" width={100} style={{ fontSize: '0.75rem' }} />
                <Tooltip />
                <Bar dataKey="total" fill="var(--primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><p>No data yet</p></div>}
        </div>

        {/* Closed by month */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--heading)', marginBottom: '1rem' }}>Closed Deals per Month</h3>
          {closedData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={closedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" />
                <XAxis dataKey="name" style={{ fontSize: '0.75rem' }} />
                <YAxis style={{ fontSize: '0.75rem' }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="var(--stat-closed)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><p>No closed deals yet</p></div>}
        </div>
      </div>
    </div>
  )
}
