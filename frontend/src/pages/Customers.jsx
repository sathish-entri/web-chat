import { useState, useEffect, useCallback } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import api from '../services/api';
import toast from 'react-hot-toast';

// ── Colour palette for segments & avatars ────────────────────────────────────
const COLORS = ['#6C63FF','#06B6D4','#22C55E','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6'];
const avatarColor = (name = '') => COLORS[(name.charCodeAt(0) || 0) % COLORS.length];

// ── Filter field definitions ─────────────────────────────────────────────────
const FILTER_FIELDS = [
  { value: 'country',   label: 'Country',           operators: ['is','is_not'] },
  { value: 'browser',   label: 'Browser',            operators: ['is','is_not'] },
  { value: 'os',        label: 'Operating System',   operators: ['is','is_not'] },
  { value: 'hasEmail',  label: 'Has Email',          operators: ['yes','no'] },
  { value: 'firstSeen', label: 'First Seen',         operators: ['within','before','after'] },
  { value: 'lastSeen',  label: 'Last Seen',          operators: ['within','before','after'] },
];

const OPERATOR_LABELS = {
  is: 'is', is_not: 'is not', gte: '≥', lte: '≤', eq: '=',
  before: 'before', after: 'after', within: 'within last (days)',
  yes: 'yes', no: 'no',
};

const SEGMENT_COLORS = ['#6C63FF','#06B6D4','#22C55E','#F59E0B','#EF4444','#8B5CF6','#EC4899'];

// ─────────────────────────────────────────────────────────────────────────────
export default function Customers() {
  const [customers,    setCustomers]    = useState([]);
  const [stats,        setStats]        = useState(null);
  const [segments,     setSegments]     = useState([]);
  const [activeSegment,setActiveSegment]= useState(null); // null = All Customers
  const [selected,     setSelected]     = useState(null); // customer profile
  const [search,       setSearch]       = useState('');
  const [page,         setPage]         = useState(1);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [showBuilder,  setShowBuilder]  = useState(false);
  const [activeTab,    setActiveTab]    = useState('list'); // 'list' | 'analytics'

  // ── Segment builder state ──────────────────────────────────────────────────
  const [newSeg, setNewSeg] = useState({ name: '', description: '', color: SEGMENT_COLORS[0], filters: [] });
  const [previewCount, setPreviewCount] = useState(null);
  const [websites, setWebsites] = useState([]);

  // ── Fetch helpers ──────────────────────────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      if (activeSegment) {
        res = await api.get(`/customers/segments/${activeSegment._id}/customers`);
        setCustomers(res.data.customers);
        setTotal(res.data.total);
      } else {
        res = await api.get(`/customers?page=${page}&limit=20&search=${encodeURIComponent(search)}`);
        setCustomers(res.data.customers);
        setTotal(res.data.total);
      }
    } catch { toast.error('Failed to load customers'); }
    setLoading(false);
  }, [activeSegment, page, search]);

  const fetchStats = useCallback(async () => {
    try {
      const r = await api.get('/customers/stats');
      setStats(r.data);
    } catch {}
  }, []);

  const fetchSegments = useCallback(async () => {
    try {
      const r = await api.get('/customers/segments/all');
      setSegments(r.data.segments);
    } catch {}
  }, []);

  const fetchWebsites = useCallback(async () => {
    try {
      const r = await api.get('/websites');
      setWebsites(r.data.websites || []);
    } catch {}
  }, []);

  useEffect(() => { fetchStats(); fetchSegments(); fetchWebsites(); }, []);
  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  // ── Profile panel ──────────────────────────────────────────────────────────
  const openProfile = async (cust) => {
    try {
      const r = await api.get(`/customers/${cust._id}`);
      setSelected(r.data.customer);
    } catch { toast.error('Failed to load profile'); }
  };

  // ── Segment builder preview ────────────────────────────────────────────────
  const previewSegmentCount = async (filters) => {
    try {
      const r = await api.post('/customers/segment-preview', { filters });
      setPreviewCount(r.data.count);
    } catch {}
  };

  const addFilter = () => {
    const f = { field: 'country', operator: 'is', value: '' };
    const filters = [...newSeg.filters, f];
    setNewSeg(s => ({ ...s, filters }));
    previewSegmentCount(filters);
  };

  const updateFilter = (idx, key, val) => {
    const filters = newSeg.filters.map((f, i) => i === idx ? { ...f, [key]: val } : f);
    // Auto-reset operator when field changes
    if (key === 'field') {
      const fieldDef = FILTER_FIELDS.find(ff => ff.value === val);
      filters[idx].operator = fieldDef?.operators[0] || 'is';
      filters[idx].value = '';
    }
    setNewSeg(s => ({ ...s, filters }));
    previewSegmentCount(filters);
  };

  const removeFilter = (idx) => {
    const filters = newSeg.filters.filter((_, i) => i !== idx);
    setNewSeg(s => ({ ...s, filters }));
    previewSegmentCount(filters);
  };

  const saveSegment = async () => {
    if (!newSeg.name.trim()) return toast.error('Segment name is required');
    if (!websites[0]) return toast.error('Please create a website first');
    try {
      await api.post('/customers/segments', { ...newSeg, websiteId: websites[0]._id });
      toast.success('Segment created! 🎯');
      setShowBuilder(false);
      setNewSeg({ name: '', description: '', color: SEGMENT_COLORS[0], filters: [] });
      setPreviewCount(null);
      fetchSegments();
    } catch { toast.error('Failed to save segment'); }
  };

  const deleteSegment = async (seg) => {
    try {
      await api.delete(`/customers/segments/${seg._id}`);
      toast.success('Segment deleted');
      if (activeSegment?._id === seg._id) setActiveSegment(null);
      fetchSegments();
    } catch { toast.error('Failed to delete segment'); }
  };

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [
      ['Name','Email','Country','City','Browser','OS','Conversations','First Seen','Last Seen'],
      ...customers.map(c => [
        c.name || '-', c.email || '-',
        c.location?.country || '-', c.location?.city || '-',
        c.browser || '-', c.os || '-',
        c.conversationCount || 0,
        c.createdAt ? format(new Date(c.createdAt), 'yyyy-MM-dd') : '-',
        c.lastSeen  ? format(new Date(c.lastSeen),  'yyyy-MM-dd') : '-',
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `customers-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const StatCard = ({ label, value, icon, color }) => (
    <div className="cust-stat-card">
      <div className="cust-stat-icon" style={{ background: color + '22' }}>
        <span style={{ fontSize: '1.4rem' }}>{icon}</span>
      </div>
      <div>
        <div className="cust-stat-value">{value ?? '—'}</div>
        <div className="cust-stat-label">{label}</div>
      </div>
    </div>
  );

  const MiniBar = ({ data = [], total }) => (
    <div className="mini-bar-list">
      {data.slice(0, 5).map((d, i) => (
        <div key={i} className="mini-bar-row">
          <span className="mini-bar-name">{d.name || 'Unknown'}</span>
          <div className="mini-bar-track">
            <div className="mini-bar-fill"
              style={{ width: `${total ? Math.round((d.value / total) * 100) : 0}%`, background: COLORS[i % COLORS.length] }}
            />
          </div>
          <span className="mini-bar-count">{d.value}</span>
        </div>
      ))}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="customers-layout">

      {/* ── LEFT: Segments sidebar ── */}
      <aside className="segments-sidebar">
        <div className="segments-header">
          <span className="segments-title">Segments</span>
          <button className="btn btn-primary btn-sm" onClick={() => setShowBuilder(true)}>+ New</button>
        </div>

        {/* All Customers */}
        <div
          className={`segment-item ${!activeSegment ? 'active' : ''}`}
          onClick={() => { setActiveSegment(null); setPage(1); }}
        >
          <span className="segment-dot" style={{ background: '#6C63FF' }} />
          <span className="segment-name">All Customers</span>
          <span className="segment-count">{total}</span>
        </div>

        {segments.map(seg => (
          <div
            key={seg._id}
            className={`segment-item ${activeSegment?._id === seg._id ? 'active' : ''}`}
            onClick={() => { setActiveSegment(seg); setPage(1); }}
          >
            <span className="segment-dot" style={{ background: seg.color }} />
            <span className="segment-name">{seg.name}</span>
            <button className="segment-del-btn" onClick={(e) => { e.stopPropagation(); deleteSegment(seg); }}>×</button>
          </div>
        ))}

        {segments.length === 0 && (
          <div className="segments-empty">
            <div style={{ fontSize: '2rem' }}>🏷️</div>
            <div>No segments yet.<br />Create one to group customers by rules.</div>
          </div>
        )}
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="customers-main">

        {/* Topbar */}
        <div className="topbar">
          <div>
            <div className="topbar-title">
              {activeSegment ? `🏷️ ${activeSegment.name}` : '👥 Customers'}
            </div>
            <div className="topbar-subtitle">
              {total} customer{total !== 1 ? 's' : ''}{activeSegment ? ' in this segment' : ' total'}
            </div>
          </div>
          <div className="topbar-actions">
            <button
              className={`btn btn-ghost btn-sm ${activeTab === 'list' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('list')}
            >📋 Directory</button>
            <button
              className={`btn btn-ghost btn-sm ${activeTab === 'analytics' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >📊 Analytics</button>
            <button className="btn btn-ghost btn-sm" onClick={exportCSV} title="Export CSV">
              ⬇️ CSV
            </button>
          </div>
        </div>

        {/* ── ANALYTICS TAB ── */}
        {activeTab === 'analytics' && stats && (
          <div className="page-content">
            {/* Stat cards */}
            <div className="cust-stats-grid">
              <StatCard label="Total Customers"  value={stats.total}        icon="👥" color="#6C63FF" />
              <StatCard label="New This Week"    value={stats.newThisWeek}  icon="🆕" color="#22C55E" />
              <StatCard label="New This Month"   value={stats.newThisMonth} icon="📅" color="#06B6D4" />
              <StatCard label="Returning"        value={stats.returning}    icon="🔄" color="#F59E0B" />
            </div>

            {/* Charts */}
            <div className="cust-charts-grid">
              {/* Countries */}
              <div className="card">
                <div className="card-header"><div className="card-title">🌍 Top Countries</div></div>
                <MiniBar data={stats.countryData} total={stats.total} />
              </div>

              {/* Browsers */}
              <div className="card">
                <div className="card-header"><div className="card-title">🌐 Browsers</div></div>
                <MiniBar data={stats.browserData} total={stats.total} />
              </div>

              {/* OS */}
              <div className="card">
                <div className="card-header"><div className="card-title">💻 Operating Systems</div></div>
                <MiniBar data={stats.osData} total={stats.total} />
              </div>

              {/* Daily new */}
              <div className="card" style={{ gridColumn: 'span 2' }}>
                <div className="card-header"><div className="card-title">📈 New Customers (Last 30 Days)</div></div>
                <div className="daily-chart">
                  {stats.dailyNew.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign:'center', padding: '40px' }}>No data yet</div>}
                  {stats.dailyNew.map((d, i) => {
                    const max = Math.max(...stats.dailyNew.map(x => x.count), 1);
                    return (
                      <div key={i} className="daily-col" title={`${d.date}: ${d.count}`}>
                        <div className="daily-bar" style={{ height: `${(d.count / max) * 100}%` }} />
                        {i % 5 === 0 && <div className="daily-label">{d.date?.slice(5)}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── DIRECTORY TAB ── */}
        {activeTab === 'list' && (
          <div className="page-content">
            {/* Search */}
            <div style={{ marginBottom: 16, maxWidth: 340 }}>
              <div className="search-box">
                <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                <input
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
            </div>

            {/* Table */}
            <div className="cust-table-wrap">
              <table className="cust-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Location</th>
                    <th>Device</th>
                    <th>Chats</th>
                    <th>First Seen</th>
                    <th>Last Seen</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={7} style={{ textAlign:'center', padding: 40, color:'var(--text-muted)' }}>Loading…</td></tr>
                  )}
                  {!loading && customers.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign:'center', padding: 40, color:'var(--text-muted)' }}>
                      No customers found
                    </td></tr>
                  )}
                  {customers.map(c => {
                    const isReturning = (c.conversationCount || 0) > 1;
                    const firstSeen   = c.createdAt ? new Date(c.createdAt) : null;
                    const isNew       = firstSeen && (Date.now() - firstSeen) < 7 * 86400000;
                    const status      = isNew ? 'New' : isReturning ? 'Returning' : 'Active';
                    const statusColor = isNew ? '#22C55E' : isReturning ? '#F59E0B' : '#06B6D4';

                    return (
                      <tr key={c._id} className="cust-row" onClick={() => openProfile(c)}>
                        <td>
                          <div className="cust-cell-name">
                            <div className="cust-avatar" style={{ background: avatarColor(c.name || 'A') }}>
                              {(c.name || 'A')[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="cust-name">{c.name || 'Anonymous'}</div>
                              <div className="cust-email">{c.email || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="cust-location">
                            {c.location?.country || '—'}
                            {c.location?.city && <span className="cust-city"> · {c.location.city}</span>}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            <div>{c.browser || '—'}</div>
                            <div>{c.os || '—'}</div>
                          </div>
                        </td>
                        <td>
                          <span className="cust-conv-badge">{c.conversationCount || 0}</span>
                        </td>
                        <td className="cust-time">
                          {firstSeen ? formatDistanceToNow(firstSeen, { addSuffix: true }) : '—'}
                        </td>
                        <td className="cust-time">
                          {c.lastSeen ? formatDistanceToNow(new Date(c.lastSeen), { addSuffix: true }) : '—'}
                        </td>
                        <td>
                          <span className="cust-status-badge" style={{ background: statusColor + '22', color: statusColor }}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > 20 && !activeSegment && (
              <div className="cust-pagination">
                <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Page {page} of {Math.ceil(total / 20)}
                </span>
                <button className="btn btn-ghost btn-sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CUSTOMER PROFILE SLIDE PANEL ── */}
      {selected && (
        <aside className="profile-panel slide-in">
          <div className="profile-header">
            <div className="profile-avatar" style={{ background: avatarColor(selected.name || 'A') }}>
              {(selected.name || 'A')[0].toUpperCase()}
            </div>
            <div>
              <div className="profile-name">{selected.name || 'Anonymous'}</div>
              <div className="profile-email">{selected.email || 'No email'}</div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setSelected(null)}>✕</button>
          </div>

          <div className="profile-section">
            <div className="profile-section-title">📍 Location & Device</div>
            <div className="profile-info-row"><span>Country</span><strong>{selected.location?.country || '—'}</strong></div>
            <div className="profile-info-row"><span>City</span><strong>{selected.location?.city || '—'}</strong></div>
            <div className="profile-info-row"><span>Browser</span><strong>{selected.browser || '—'}</strong></div>
            <div className="profile-info-row"><span>OS</span><strong>{selected.os || '—'}</strong></div>
          </div>

          <div className="profile-section">
            <div className="profile-section-title">📊 Activity</div>
            <div className="profile-info-row"><span>Total Chats</span><strong>{selected.conversations?.length || 0}</strong></div>
            <div className="profile-info-row"><span>First Seen</span><strong>{selected.createdAt ? format(new Date(selected.createdAt), 'MMM d, yyyy') : '—'}</strong></div>
            <div className="profile-info-row"><span>Last Seen</span><strong>{selected.lastSeen ? formatDistanceToNow(new Date(selected.lastSeen), { addSuffix: true }) : '—'}</strong></div>
          </div>

          <div className="profile-section">
            <div className="profile-section-title">💬 Conversations</div>
            {(selected.conversations || []).length === 0 && <div style={{ color:'var(--text-muted)', fontSize:'0.82rem' }}>No conversations yet</div>}
            {(selected.conversations || []).map(conv => (
              <div key={conv._id} className="profile-conv-item">
                <span className={`badge badge-${conv.status}`}>{conv.status}</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {conv.lastMessage || '(no messages)'}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginLeft: 'auto' }}>
                  {conv.createdAt ? formatDistanceToNow(new Date(conv.createdAt), { addSuffix: true }) : ''}
                </span>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* ── SEGMENT BUILDER MODAL ── */}
      {showBuilder && (
        <div className="modal-overlay" onClick={() => setShowBuilder(false)}>
          <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🏷️ Create Segment</div>
              <button className="modal-close" onClick={() => setShowBuilder(false)}>
                <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>

            {/* Name + Description */}
            <div className="form-group">
              <label className="form-label">Segment Name *</label>
              <input className="form-input" placeholder="e.g. High Engagement" value={newSeg.name}
                onChange={e => setNewSeg(s => ({ ...s, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" placeholder="Optional short description" value={newSeg.description}
                onChange={e => setNewSeg(s => ({ ...s, description: e.target.value }))} />
            </div>

            {/* Color picker */}
            <div className="form-group">
              <label className="form-label">Color</label>
              <div className="color-options">
                {SEGMENT_COLORS.map(c => (
                  <div key={c} className={`color-swatch ${newSeg.color === c ? 'selected' : ''}`}
                    style={{ background: c }} onClick={() => setNewSeg(s => ({ ...s, color: c }))} />
                ))}
              </div>
            </div>

            <div className="divider" />

            {/* Filters */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Filter Rules (ALL must match)</label>
                <button className="btn btn-ghost btn-sm" onClick={addFilter}>+ Add Rule</button>
              </div>

              {newSeg.filters.length === 0 && (
                <div className="builder-empty">
                  No rules yet — all customers will match.<br/>Click "Add Rule" to narrow down.
                </div>
              )}

              {newSeg.filters.map((f, idx) => {
                const fieldDef = FILTER_FIELDS.find(ff => ff.value === f.field);
                const isBoolean = ['yes', 'no'].includes(f.operator);
                return (
                  <div key={idx} className="filter-rule-row">
                    <select className="form-select" style={{ flex: 1.2 }} value={f.field}
                      onChange={e => updateFilter(idx, 'field', e.target.value)}>
                      {FILTER_FIELDS.map(ff => <option key={ff.value} value={ff.value}>{ff.label}</option>)}
                    </select>
                    <select className="form-select" style={{ flex: 1 }} value={f.operator}
                      onChange={e => updateFilter(idx, 'operator', e.target.value)}>
                      {(fieldDef?.operators || ['is']).map(op =>
                        <option key={op} value={op}>{OPERATOR_LABELS[op] || op}</option>
                      )}
                    </select>
                    {!isBoolean && (
                      <input className="form-input" style={{ flex: 1 }} placeholder="Value…" value={f.value}
                        onChange={e => updateFilter(idx, 'value', e.target.value)} />
                    )}
                    <button className="btn btn-danger btn-sm" onClick={() => removeFilter(idx)}>✕</button>
                  </div>
                );
              })}
            </div>

            {/* Preview */}
            {previewCount !== null && (
              <div className="segment-preview-badge">
                🎯 <strong>{previewCount}</strong> customers match these rules
              </div>
            )}

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowBuilder(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveSegment}>Save Segment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
