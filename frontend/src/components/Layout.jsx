import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import useAuthStore from '../stores/authStore';
import useConversationStore from '../stores/conversationStore';
import useWebsiteStore from '../stores/websiteStore';
import { connectSocket, getSocket } from '../services/socket';

const NAV_ITEMS = [
  {
    to: '/', label: 'Dashboard', exact: true,
    icon: <svg viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
  },
  {
    to: '/conversations', label: 'Conversations',
    icon: <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>,
    badge: 'unread',
  },
  {
    to: '/websites', label: 'Websites',
    icon: <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
  },
  {
    to: '/analytics', label: 'Analytics',
    icon: <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
  },
  {
    to: '/customers', label: 'Customers',
    icon: <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
  },
  {
    to: '/bot', label: 'ChatBot',
    icon: <svg viewBox="0 0 24 24"><path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zm-2 10H6V7h12v12zm-9-6c-.83 0-1.5-.67-1.5-1.5S8.17 10 9 10s1.5.67 1.5 1.5S9.83 13 9 13zm6 0c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z"/></svg>
  },
  {
    to: '/settings', label: 'Settings',
    icon: <svg viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>
  },
];

export default function Layout() {
  const [sidebarExpanded, setSidebarExpanded] = useState(window.innerWidth >= 768);
  const { user, logout } = useAuthStore();
  const { unreadTotal, fetchConversations, addIncomingMessage, updateConversationFromSocket, setTyping } = useConversationStore();
  const { fetchWebsites, websites } = useWebsiteStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchWebsites();
    fetchConversations();

    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarExpanded(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Setup Socket.IO
  useEffect(() => {
    if (!user) return;
    const socket = connectSocket();

    socket.on('connect', () => {
      const websiteIds = websites.map(w => w._id);
      socket.emit('agent:join', { agentId: user._id, websiteIds });
    });

    socket.on('message:receive', ({ message, conversationId }) => {
      if (message.sender === 'visitor' || message.sender === 'bot') {
        addIncomingMessage(message, conversationId);
        // Play notification
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(800, ctx.currentTime);
          gain.gain.setValueAtTime(0.05, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
          osc.start(); osc.stop(ctx.currentTime + 0.2);
        } catch (_) {}
      }
    });

    socket.on('conversation:updated', updateConversationFromSocket);

    socket.on('typing:start', ({ sender, senderName, conversationId }) => {
      setTyping(conversationId, sender, senderName, true);
    });

    socket.on('typing:stop', ({ conversationId }) => {
      setTyping(conversationId, null, null, false);
    });

    return () => {
      socket.off('message:receive');
      socket.off('conversation:updated');
      socket.off('typing:start');
      socket.off('typing:stop');
    };
  }, [user, websites]);

  // Re-emit when websites load
  useEffect(() => {
    const socket = getSocket();
    if (socket?.connected && user && websites.length) {
      socket.emit('agent:join', { agentId: user._id, websiteIds: websites.map(w => w._id) });
    }
  }, [websites]);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  const userInitials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <nav className={`sidebar ${sidebarExpanded ? 'expanded' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
          </div>
          {sidebarExpanded && <span className="sidebar-logo-text">WebChat</span>}
        </div>

        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span className="nav-label">{item.label}</span>
            {item.badge === 'unread' && unreadTotal > 0 && (
              <span className="nav-badge">{unreadTotal > 99 ? '99+' : unreadTotal}</span>
            )}
          </NavLink>
        ))}

        <div style={{ marginTop: 'auto', width: '100%' }}>
          {sidebarExpanded && (
            <div style={{ padding: '12px', background: 'var(--bg-hover)', borderRadius: 'var(--radius)', margin: '0 0 8px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{user?.name}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user?.email}</div>
            </div>
          )}
          <button className="nav-item" onClick={handleLogout} style={{ width: '100%' }}>
            <svg viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
            <span className="nav-label">Logout</span>
          </button>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            style={{ margin: '8px auto 0', display: 'flex' }}
          >
            <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div 
        className="main-content"
        onClick={() => {
          if (window.innerWidth < 768 && sidebarExpanded) {
            setSidebarExpanded(false);
          }
        }}
      >
        {!sidebarExpanded && (
          <button 
            className="mobile-menu-toggle" 
            onClick={(e) => {
              e.stopPropagation(); // Prevent closing it instantly
              setSidebarExpanded(true);
            }}
          >
            <svg viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
          </button>
        )}
        <Outlet />
      </div>
    </div>
  );
}
