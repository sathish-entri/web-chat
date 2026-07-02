import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import useAuthStore from '../stores/authStore';
import useWebsiteStore from '../stores/websiteStore';
import api from '../services/api';

const COLORS = ['#6C63FF', '#EF4444', '#22C55E', '#F59E0B', '#06B6D4', '#8B5CF6', '#EC4899', '#F97316'];

export default function Settings() {
  const { user, updateUser } = useAuthStore();
  const { websites, updateWebsite, activeWebsite, setActiveWebsite } = useWebsiteStore();
  const [selectedSite, setSelectedSite] = useState(activeWebsite?._id || '');
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', avatar: user?.avatar || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [widgetSettings, setWidgetSettings] = useState(
    activeWebsite?.settings || {
      primaryColor: '#6C63FF', welcomeMessage: 'Hi! 👋 How can we help you today?',
      agentName: 'Support Agent', botName: 'Support Bot', position: 'bottom-right', requireEmail: true,
      botFallbackEnabled: true,
    }
  );
  const [botEnabled, setBotEnabled] = useState(activeWebsite?.botEnabled !== false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingWidget, setSavingWidget] = useState(false);

  useEffect(() => {
    if (activeWebsite) {
      setSelectedSite(activeWebsite._id);
      setWidgetSettings(activeWebsite.settings || {});
      setBotEnabled(activeWebsite.botEnabled !== false);
    }
  }, [activeWebsite]);

  const handleSiteChange = (id) => {
    setSelectedSite(id);
    const site = websites.find(w => w._id === id);
    if (site) {
      setActiveWebsite(site);
      setWidgetSettings(site.settings || {});
      setBotEnabled(site.botEnabled !== false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await api.put('/auth/profile', profileForm);
      updateUser(data.user);
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await api.put('/auth/password', { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      toast.success('Password changed!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    }
  };

  const handleSaveWidget = async () => {
    if (!selectedSite) return;
    setSavingWidget(true);
    try {
      await updateWebsite(selectedSite, { settings: widgetSettings, botEnabled });
      toast.success('Widget settings saved!');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSavingWidget(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="topbar">
        <div>
          <div className="topbar-title">Settings</div>
          <div className="topbar-subtitle">Manage your account and widget settings</div>
        </div>
      </div>

      <div className="page-content" style={{ maxWidth: 800, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Profile Settings */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: 20 }}>
            <span className="card-title">👤 Profile Settings</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6C63FF, #06B6D4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: 800, color: 'white',
              border: '3px solid var(--border-light)',
            }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>{user?.name}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{user?.email}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: 2 }}>
                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input type="text" className="form-input" value={profileForm.name}
                  onChange={e => setProfileForm({...profileForm, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Email (read-only)</label>
                <input type="email" className="form-input" value={user?.email} disabled
                  style={{ opacity: 0.5, cursor: 'not-allowed' }} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Password */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: 20 }}>
            <span className="card-title">🔒 Change Password</span>
          </div>
          <form onSubmit={handleSavePassword}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Current Password</label>
                <input type="password" className="form-input" value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type="password" className="form-input" value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input type="password" className="form-input" value={passwordForm.confirm}
                  onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">Change Password</button>
          </form>
        </div>

        {/* Widget Customization */}
        {websites.length > 0 && (
          <div className="card">
            <div className="card-header" style={{ marginBottom: 16 }}>
              <span className="card-title">🎨 Widget Customization</span>
              <select className="form-select" value={selectedSite} onChange={(e) => handleSiteChange(e.target.value)} style={{ width: 160 }}>
                {websites.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Agent Name</label>
                <input type="text" className="form-input" value={widgetSettings.agentName || ''}
                  onChange={e => setWidgetSettings({...widgetSettings, agentName: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Bot Name</label>
                <input type="text" className="form-input" value={widgetSettings.botName || ''}
                  onChange={e => setWidgetSettings({...widgetSettings, botName: e.target.value})} />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Welcome Message</label>
                <textarea className="form-input form-textarea" value={widgetSettings.welcomeMessage || ''}
                  onChange={e => setWidgetSettings({...widgetSettings, welcomeMessage: e.target.value})} />
              </div>

              <div className="form-group">
                <label className="form-label">Widget Position</label>
                <select className="form-select" value={widgetSettings.position || 'bottom-right'}
                  onChange={e => setWidgetSettings({...widgetSettings, position: e.target.value})}>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Require Email Before Chat</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                  <label className="toggle">
                    <input type="checkbox" checked={widgetSettings.requireEmail !== false}
                      onChange={e => setWidgetSettings({...widgetSettings, requireEmail: e.target.checked})} />
                    <span className="toggle-slider" />
                  </label>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {widgetSettings.requireEmail !== false ? 'Required' : 'Optional'}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Enable ChatBot (Auto-Replies)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                  <label className="toggle">
                    <input type="checkbox" checked={botEnabled}
                      onChange={e => setBotEnabled(e.target.checked)} />
                    <span className="toggle-slider" />
                  </label>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {botEnabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Enable Default Bot Replies</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                  <label className="toggle">
                    <input type="checkbox" checked={widgetSettings.botFallbackEnabled !== false}
                      disabled={!botEnabled}
                      onChange={e => setWidgetSettings({...widgetSettings, botFallbackEnabled: e.target.checked})} />
                    <span className="toggle-slider" style={{ opacity: botEnabled ? 1 : 0.5 }} />
                  </label>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', opacity: botEnabled ? 1 : 0.5 }}>
                    {widgetSettings.botFallbackEnabled !== false ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Primary Color</label>
                <div className="color-options">
                  {COLORS.map(c => (
                    <div key={c} className={`color-swatch ${widgetSettings.primaryColor === c ? 'selected' : ''}`}
                      style={{ background: c }}
                      onClick={() => setWidgetSettings({...widgetSettings, primaryColor: c})} />
                  ))}
                  <input type="color" value={widgetSettings.primaryColor || '#6C63FF'}
                    onChange={e => setWidgetSettings({...widgetSettings, primaryColor: e.target.value})}
                    style={{ width: 32, height: 32, borderRadius: 8, border: '2px solid var(--border)', cursor: 'pointer', padding: 2 }} />
                </div>
              </div>
            </div>

            {/* Widget Preview */}
            <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-input)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Preview</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${widgetSettings.primaryColor || '#6C63FF'}, ${widgetSettings.primaryColor || '#6C63FF'}99)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 4px 16px ${widgetSettings.primaryColor || '#6C63FF'}55`,
                }}>
                  <svg viewBox="0 0 24 24" style={{ width: 24, height: 24, fill: 'white' }}><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                </div>
                <div style={{ padding: '10px 14px', borderRadius: 14, background: widgetSettings.primaryColor || '#6C63FF', color: 'white', fontSize: '0.82rem', maxWidth: 260 }}>
                  {widgetSettings.welcomeMessage || 'Hi! 👋 How can we help you today?'}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <button className="btn btn-primary" onClick={handleSaveWidget} disabled={savingWidget}>
                {savingWidget ? 'Saving...' : '💾 Save Widget Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
