import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import useWebsiteStore from '../stores/websiteStore';

export default function BotPage() {
  const { websites } = useWebsiteStore();
  const [selectedSite, setSelectedSite] = useState('');
  const [rules, setRules] = useState([]);
  const [canned, setCanned] = useState([]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showCannedModal, setShowCannedModal] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [ruleForm, setRuleForm] = useState({ name: '', triggers: '', response: '', matchType: 'contains', priority: 0 });
  const [cannedForm, setCannedForm] = useState({ shortcut: '', content: '' });

  useEffect(() => {
    if (websites.length && !selectedSite) setSelectedSite(websites[0]._id);
  }, [websites]);

  useEffect(() => {
    if (!selectedSite) return;
    api.get(`/bot/rules?websiteId=${selectedSite}`).then(({ data }) => setRules(data.rules || []));
    api.get(`/bot/canned?websiteId=${selectedSite}`).then(({ data }) => setCanned(data.responses || []));
  }, [selectedSite]);

  const handleSaveRule = async (e) => {
    e.preventDefault();
    const triggers = ruleForm.triggers.split(',').map(t => t.trim()).filter(Boolean);
    const payload = { ...ruleForm, triggers, websiteId: selectedSite };

    try {
      if (editRule) {
        const { data } = await api.put(`/bot/rules/${editRule._id}`, payload);
        setRules(prev => prev.map(r => r._id === editRule._id ? data.rule : r));
        toast.success('Rule updated');
      } else {
        const { data } = await api.post('/bot/rules', payload);
        setRules(prev => [data.rule, ...prev]);
        toast.success('Rule created!');
      }
      setShowRuleModal(false);
      setEditRule(null);
      setRuleForm({ name: '', triggers: '', response: '', matchType: 'contains', priority: 0 });
    } catch {
      toast.error('Failed to save rule');
    }
  };

  const handleDeleteRule = async (id) => {
    await api.delete(`/bot/rules/${id}`);
    setRules(prev => prev.filter(r => r._id !== id));
    toast.success('Rule deleted');
  };

  const handleToggleRule = async (rule) => {
    const { data } = await api.put(`/bot/rules/${rule._id}`, { ...rule, isActive: !rule.isActive });
    setRules(prev => prev.map(r => r._id === rule._id ? data.rule : r));
  };

  const handleSaveCanned = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/bot/canned', { ...cannedForm, websiteId: selectedSite });
      setCanned(prev => [data.response, ...prev]);
      toast.success('Canned response added!');
      setShowCannedModal(false);
      setCannedForm({ shortcut: '', content: '' });
    } catch {
      toast.error('Failed to save');
    }
  };

  const handleDeleteCanned = async (id) => {
    await api.delete(`/bot/canned/${id}`);
    setCanned(prev => prev.filter(r => r._id !== id));
  };

  const openEditRule = (rule) => {
    setEditRule(rule);
    setRuleForm({
      name: rule.name,
      triggers: rule.triggers.join(', '),
      response: rule.response,
      matchType: rule.matchType,
      priority: rule.priority,
    });
    setShowRuleModal(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="topbar">
        <div>
          <div className="topbar-title">ChatBot Settings</div>
          <div className="topbar-subtitle">Configure auto-replies and canned responses</div>
        </div>
        <div className="topbar-actions">
          <select className="form-select" value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            style={{ width: 180 }}>
            {websites.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
          </select>
        </div>
      </div>

      <div className="page-content" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignContent: 'start' }}>
        {/* Bot Rules */}
        <div className="card" style={{ gridColumn: '1/-1' }}>
          <div className="card-header">
            <span className="card-title">🤖 Bot Rules (Keyword Triggers)</span>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditRule(null); setRuleForm({ name: '', triggers: '', response: '', matchType: 'contains', priority: 0 }); setShowRuleModal(true); }}>
              + Add Rule
            </button>
          </div>

          {rules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No bot rules yet. Add your first rule to auto-reply to visitors!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rules.map((rule) => (
                <div key={rule._id} style={{
                  padding: 14, background: 'var(--bg-hover)', borderRadius: 10,
                  border: `1px solid ${rule.isActive ? 'rgba(108,99,255,0.2)' : 'var(--border)'}`,
                  opacity: rule.isActive ? 1 : 0.5,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)' }}>{rule.name}</div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
                        {rule.triggers.map((t, i) => (
                          <span key={i} style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(108,99,255,0.15)', color: 'var(--primary)', borderRadius: 12, fontFamily: 'monospace' }}>{t}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <label className="toggle">
                        <input type="checkbox" checked={rule.isActive} onChange={() => handleToggleRule(rule)} />
                        <span className="toggle-slider" />
                      </label>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEditRule(rule)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteRule(rule._id)}>Del</button>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 8, borderLeft: '3px solid var(--primary)' }}>
                    💬 {rule.response}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 6 }}>
                    Match: {rule.matchType} · Priority: {rule.priority} · Triggered {rule.triggerCount}x
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Canned Responses */}
        <div className="card" style={{ gridColumn: '1/-1' }}>
          <div className="card-header">
            <span className="card-title">⚡ Canned Responses</span>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCannedModal(true)}>+ Add</button>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
            Type <code style={{ background: 'var(--bg-input)', padding: '2px 4px', borderRadius: 4 }}>/</code> in the chat input to see shortcuts.
          </p>

          {canned.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: '0.875rem' }}>No canned responses yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {canned.map((r) => (
                <div key={r._id} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--bg-hover)', borderRadius: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700, flexShrink: 0, background: 'rgba(108,99,255,0.15)', padding: '2px 8px', borderRadius: 6 }}>{r.shortcut}</span>
                  <div style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text)' }}>{r.content}</div>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteCanned(r._id)}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rule Modal */}
      {showRuleModal && (
        <div className="modal-overlay" onClick={() => setShowRuleModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editRule ? 'Edit Bot Rule' : 'New Bot Rule'}</div>
              <button className="modal-close" onClick={() => setShowRuleModal(false)}>
                <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>
            <form onSubmit={handleSaveRule}>
              <div className="form-group">
                <label className="form-label">Rule Name</label>
                <input type="text" className="form-input" placeholder="e.g., Greeting" value={ruleForm.name} onChange={e => setRuleForm({...ruleForm, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Trigger Keywords (comma-separated)</label>
                <input type="text" className="form-input" placeholder="hello, hi, hey, greetings" value={ruleForm.triggers} onChange={e => setRuleForm({...ruleForm, triggers: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Bot Response</label>
                <textarea className="form-input form-textarea" placeholder="Hello! How can I help you today?" value={ruleForm.response} onChange={e => setRuleForm({...ruleForm, response: e.target.value})} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Match Type</label>
                  <select className="form-select" value={ruleForm.matchType} onChange={e => setRuleForm({...ruleForm, matchType: e.target.value})}>
                    <option value="contains">Contains</option>
                    <option value="exact">Exact Match</option>
                    <option value="startsWith">Starts With</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <input type="number" className="form-input" value={ruleForm.priority} onChange={e => setRuleForm({...ruleForm, priority: parseInt(e.target.value)})} min="0" max="100" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowRuleModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editRule ? 'Update Rule' : 'Create Rule'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Canned Modal */}
      {showCannedModal && (
        <div className="modal-overlay" onClick={() => setShowCannedModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">New Canned Response</div>
              <button className="modal-close" onClick={() => setShowCannedModal(false)}>
                <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>
            <form onSubmit={handleSaveCanned}>
              <div className="form-group">
                <label className="form-label">Shortcut (start with /)</label>
                <input type="text" className="form-input" placeholder="/greeting" value={cannedForm.shortcut} onChange={e => setCannedForm({...cannedForm, shortcut: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Message Content</label>
                <textarea className="form-input form-textarea" placeholder="Hello! Thanks for reaching out..." value={cannedForm.content} onChange={e => setCannedForm({...cannedForm, content: e.target.value})} required />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCannedModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Response</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
