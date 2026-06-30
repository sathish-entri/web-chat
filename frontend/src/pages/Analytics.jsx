import { useEffect, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../services/api';
import useWebsiteStore from '../stores/websiteStore';

const COLORS = ['#6C63FF', '#06B6D4', '#22C55E', '#F59E0B', '#EF4444'];

export default function Analytics() {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);
  const { websites, activeWebsite } = useWebsiteStore();

  useEffect(() => {
    setLoading(true);
    api.get(`/analytics/overview?period=${period}`).then(({ data: d }) => {
      setData(d.overview);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [period]);

  const statusData = data?.byStatus?.map(s => ({
    name: s._id,
    value: s.count,
  })) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="topbar">
        <div>
          <div className="topbar-title">Analytics</div>
          <div className="topbar-subtitle">Performance overview</div>
        </div>
        <div className="topbar-actions">
          {['1d', '7d', '30d'].map((p) => (
            <button key={p} className={`filter-tab ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
              style={{ fontSize: '0.78rem' }}>
              {p === '1d' ? 'Today' : p === '7d' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>
      </div>

      <div className="page-content">
        {/* Stats Row */}
        <div className="stat-grid">
          {[
            { label: 'Total Conversations', value: data?.totalConversations || 0, color: 'linear-gradient(135deg, #6C63FF, #4F46E5)', icon: <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg> },
            { label: 'Open', value: data?.openConversations || 0, color: 'linear-gradient(135deg, #F59E0B, #D97706)', icon: <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg> },
            { label: 'Resolved', value: data?.resolvedConversations || 0, color: 'linear-gradient(135deg, #22C55E, #16A34A)', icon: <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> },
            { label: 'Avg Response (min)', value: data?.avgResponseTime || '-', color: 'linear-gradient(135deg, #06B6D4, #0891B2)', icon: <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.5 5v5.25l4.5 2.67-.75 1.23L11 13V7h1.5z"/></svg> },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div className="stat-icon" style={{ background: s.color }}>{s.icon}</div>
              <div>
                <div className="stat-value">{loading ? '...' : s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          {/* Message Activity Chart */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">📈 Message Activity</span>
            </div>
            {data?.messagesByDay?.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data.messagesByDay} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6C63FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="_id" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="count" name="Messages" stroke="#6C63FF" strokeWidth={2} fill="url(#msgGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No data yet</div>
            )}
          </div>

          {/* Status Pie */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">🥧 By Status</span>
            </div>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                    fontSize={11}
                  >
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No data yet</div>
            )}
          </div>
        </div>

        {/* Websites Table */}
        {data?.websites?.length > 0 && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <span className="card-title">🌐 Websites Overview</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Website', 'Conversations', 'Messages'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.websites.map((w, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontSize: '0.875rem', color: 'var(--text)' }}>{w._id?.name || '-'}</td>
                    <td style={{ padding: '10px 12px', fontSize: '0.875rem', color: 'var(--text)' }}>{w._id?.totalConversations || 0}</td>
                    <td style={{ padding: '10px 12px', fontSize: '0.875rem', color: 'var(--text)' }}>{w._id?.totalMessages || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
