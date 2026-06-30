import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useConversationStore from '../stores/conversationStore';
import useWebsiteStore from '../stores/websiteStore';
import useAuthStore from '../stores/authStore';
import api from '../services/api';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const { conversations, fetchConversations } = useConversationStore();
  const { websites } = useWebsiteStore();
  const { user } = useAuthStore();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
    api.get('/analytics/overview').then(({ data }) => {
      setAnalytics(data.overview);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const stats = [
    {
      label: 'Total Conversations',
      value: analytics?.totalConversations || 0,
      icon: <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>,
      color: 'linear-gradient(135deg, #6C63FF, #4F46E5)',
      change: `+${analytics?.recentConversations || 0} this week`,
    },
    {
      label: 'Open Conversations',
      value: analytics?.openConversations || 0,
      icon: <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>,
      color: 'linear-gradient(135deg, #F59E0B, #D97706)',
      change: 'Needs attention',
    },
    {
      label: 'Resolved Today',
      value: analytics?.resolvedConversations || 0,
      icon: <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>,
      color: 'linear-gradient(135deg, #22C55E, #16A34A)',
      change: 'Great work!',
    },
    {
      label: 'Avg Response Time',
      value: analytics?.avgResponseTime ? `${analytics.avgResponseTime}m` : '-',
      icon: <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.5 5v5.25l4.5 2.67-.75 1.23L11 13V7h1.5z"/></svg>,
      color: 'linear-gradient(135deg, #06B6D4, #0891B2)',
      change: 'Avg first response',
    },
  ];

  const chartData = analytics?.messagesByDay || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Topbar */}
      <div className="topbar">
        <div>
          <div className="topbar-title">Dashboard</div>
          <div className="topbar-subtitle">Welcome back, {user?.name?.split(' ')[0]} 👋</div>
        </div>
        <div className="topbar-actions">
          <Link to="/websites" className="btn btn-primary btn-sm">
            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: 'white' }}><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            Add Website
          </Link>
          <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
        </div>
      </div>

      <div className="page-content">
        {/* Stats Grid */}
        <div className="stat-grid">
          {stats.map((stat, i) => (
            <div className="stat-card" key={i}>
              <div className="stat-icon" style={{ background: stat.color }}>{stat.icon}</div>
              <div>
                <div className="stat-value">{loading ? <span className="skeleton" style={{ width: 60, height: 28, display: 'block' }} /> : stat.value}</div>
                <div className="stat-label">{stat.label}</div>
                <div className="stat-change">{stat.change}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Chart */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">📈 Message Activity</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last 7 days</span>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <defs>
                    <linearGradient id="colorMsgs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6C63FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="_id" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="count" stroke="#6C63FF" strokeWidth={2} fill="url(#colorMsgs)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No data yet — start chatting!
              </div>
            )}
          </div>

          {/* Recent Conversations */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="card-header">
              <span className="card-title">💬 Recent Conversations</span>
              <Link to="/conversations" style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>View all →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {conversations.slice(0, 5).map((conv) => (
                <Link key={conv._id} to={`/conversations/${conv._id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', borderRadius: 10, background: 'var(--bg-hover)', textDecoration: 'none', transition: 'var(--transition)' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #6C63FF, #06B6D4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: 700, color: 'white'
                  }}>
                    {conv.visitor?.name?.[0]?.toUpperCase() || 'V'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conv.visitor?.name || 'Visitor'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conv.lastMessage || 'Started a conversation'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span className={`badge badge-${conv.status}`}>{conv.status}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {formatDistanceToNow(new Date(conv.lastMessageAt || conv.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </Link>
              ))}
              {conversations.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No conversations yet. Share your widget!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Websites Quick View */}
        {websites.length > 0 && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <span className="card-title">🌐 Your Websites</span>
              <Link to="/websites" style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>Manage →</Link>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {websites.map((site) => (
                <div key={site._id} style={{
                  padding: '12px 16px', background: 'var(--bg-hover)', borderRadius: 10,
                  display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--border)',
                  minWidth: 200,
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: site.settings?.primaryColor || '#6C63FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'white' }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{site.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{site.domain}</div>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: site.isActive ? 'var(--success)' : 'var(--text-muted)', display: 'inline-block' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
