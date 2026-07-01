import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import useWebsiteStore from '../stores/websiteStore';
import api from '../services/api';

export default function Websites() {
  const { websites, fetchWebsites, createWebsite, updateWebsite, deleteWebsite, getWidgetCode } = useWebsiteStore();
  const [showCreate, setShowCreate] = useState(false);
  const [showWidget, setShowWidget] = useState(null); // website for embed code
  const [widgetCode, setWidgetCode] = useState('');
  const [form, setForm] = useState({ name: '', domain: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchWebsites(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    const result = await createWebsite(form);
    setCreating(false);
    if (result.success) {
      toast.success('Website created! 🎉');
      setShowCreate(false);
      setForm({ name: '', domain: '' });
    } else {
      toast.error(result.message || 'Failed to create');
    }
  };

  const handleGetCode = async (website) => {
    const result = await getWidgetCode(website._id);
    if (result.success) {
      setWidgetCode(result.embedCode);
      setShowWidget(website);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this website? All conversations will be lost.')) return;
    await deleteWebsite(id);
    toast.success('Website deleted');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(widgetCode);
    toast.success('Code copied! 📋');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="topbar">
        <div>
          <div className="topbar-title">Websites</div>
          <div className="topbar-subtitle">Manage your embedded chat widgets</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: 'white' }}><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            Add Website
          </button>
        </div>
      </div>

      <div className="page-content">
        {websites.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93z"/></svg>
            </div>
            <h3>No Websites Yet</h3>
            <p>Add your first website to get the embed code and start receiving customer messages.</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Add Your First Website</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {websites.map((site) => (
              <div key={site._id} className="card" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: site.settings?.primaryColor || '#6C63FF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                  }}>
                    <svg viewBox="0 0 24 24" style={{ width: 24, height: 24, fill: 'white' }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>{site.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>🌐 {site.domain}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: site.isActive ? 'var(--success)' : 'var(--text-muted)',
                      display: 'inline-block'
                    }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {site.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', padding: '3px 8px', background: 'rgba(108,99,255,0.15)', color: 'var(--primary)', borderRadius: 20, fontWeight: 600 }}>
                    🤖 Bot {site.botEnabled ? 'ON' : 'OFF'}
                  </span>
                  <span style={{ fontSize: '0.72rem', padding: '3px 8px', background: 'var(--bg-hover)', color: 'var(--text-muted)', borderRadius: 20 }}>
                    👥 {(site.agents || []).length} agents
                  </span>
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 14, fontFamily: 'monospace', background: 'var(--bg-input)', padding: '8px 12px', borderRadius: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  ID: {site.widgetId}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1.5 }}
                    onClick={() => handleGetCode(site)}
                  >
                    {'</>'} Embed
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ flex: 1, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                    onClick={() => {
                      const backendUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');
                      window.open(`${backendUrl}/widget/test.html?id=${site.widgetId}`, '_blank');
                    }}
                  >
                    ⚡ Test
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(site._id)}
                  >
                    <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: 'currentColor' }}><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Website Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Add New Website</div>
              <button className="modal-close" onClick={() => setShowCreate(false)}>
                <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Website Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="My Awesome Store"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Domain</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="example.com"
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  required
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Website'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Widget Code Modal */}
      {showWidget && (
        <div className="modal-overlay" onClick={() => setShowWidget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div className="modal-title">📋 Widget Embed Code — {showWidget.name}</div>
              <button className="modal-close" onClick={() => setShowWidget(null)}>
                <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
              Copy and paste this code into your website's HTML, just before the closing <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4, fontSize: '0.8rem' }}>&lt;/body&gt;</code> tag.
            </p>

            <pre style={{
              background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 16, fontSize: '0.78rem', color: '#7DD3FC',
              overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.7,
              fontFamily: 'monospace',
            }}>
              {widgetCode}
            </pre>

            <div style={{ marginTop: 16, padding: 12, background: 'rgba(108,99,255,0.1)', borderRadius: 10, border: '1px solid rgba(108,99,255,0.2)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600, marginBottom: 4 }}>🔑 Widget ID</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text)' }}>{showWidget.widgetId}</div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowWidget(null)}>Close</button>
              <button className="btn btn-primary" onClick={copyCode}>
                📋 Copy Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
