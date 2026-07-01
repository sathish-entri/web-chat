import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'react-hot-toast';
import useConversationStore from '../stores/conversationStore';
import useWebsiteStore from '../stores/websiteStore';
import { getSocket } from '../services/socket';
import api from '../services/api';

const STATUS_FILTERS = ['all', 'open', 'pending', 'bot', 'resolved'];

export default function Conversations() {
  const { id } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [cannedResponses, setCannedResponses] = useState([]);
  const [showCanned, setShowCanned] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // chat | notes | visitor

  const {
    conversations, activeConversation, messages, fetchConversations,
    fetchConversation, sendMessage, resolveConversation, typingUsers,
    filter, setFilter, clearActiveConversation
  } = useConversationStore();

  const { websites, activeWebsite } = useWebsiteStore();

  useEffect(() => {
    fetchConversations();
  }, [filter]);

  useEffect(() => {
    if (id) {
      fetchConversation(id);
      // Join socket room
      const socket = getSocket();
      if (socket) socket.emit('conv:join', { conversationId: id });

      // Fetch canned responses
      if (activeWebsite) {
        api.get(`/bot/canned?websiteId=${activeWebsite._id}`)
          .then(({ data }) => setCannedResponses(data.responses || []))
          .catch(() => {});
      }
    } else {
      clearActiveConversation();
    }
    return () => {
      if (id) {
        const socket = getSocket();
        if (socket) socket.emit('conv:leave', { conversationId: id });
      }
    };
  }, [id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Typing indicator
  const typingTimer = useRef(null);
  const handleInput = (e) => {
    setMessage(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';

    // Show canned responses on /
    if (e.target.value.startsWith('/')) {
      setShowCanned(true);
    } else {
      setShowCanned(false);
    }

    // Typing events
    const socket = getSocket();
    if (socket && id) {
      clearTimeout(typingTimer.current);
      socket.emit('typing:start', { conversationId: id, sender: 'agent', senderName: 'Agent' });
      typingTimer.current = setTimeout(() => {
        socket.emit('typing:stop', { conversationId: id, sender: 'agent' });
      }, 1500);
    }
  };

  const handleSend = async () => {
    const content = message.trim();
    if (!content || !id || sending) return;

    setSending(true);
    setMessage('');
    if (inputRef.current) { inputRef.current.style.height = 'auto'; }

    // Stop typing
    const socket = getSocket();
    if (socket) socket.emit('typing:stop', { conversationId: id, sender: 'agent' });

    try {
      await sendMessage(id, content);
    } catch (e) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleResolve = async () => {
    if (!id) return;
    try {
      await resolveConversation(id);
      toast.success('Conversation resolved! ✅');
    } catch (e) {
      toast.error('Failed to resolve');
    }
  };

  const getAvatarColor = (name) => {
    const colors = ['#6C63FF', '#06B6D4', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'];
    const i = (name?.charCodeAt(0) || 0) % colors.length;
    return colors[i];
  };

  const isTyping = id && typingUsers[id];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Topbar */}
      <div className="topbar">
        <div>
          <div className="topbar-title">Conversations</div>
          <div className="topbar-subtitle">{conversations.length} total</div>
        </div>
      </div>

      <div className="conv-layout" style={{ flex: 1, overflow: 'hidden' }}>
        {/* Conversation List */}
        <div className="conv-list">
          <div className="conv-list-header">
            <div className="search-box">
              <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
              <input placeholder="Search conversations..." />
            </div>
          </div>

          {/* Filters */}
          <div className="conv-list-filters">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                className={`filter-tab ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="conv-list-items">
            {conversations.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No conversations
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv._id}
                  className={`conv-item ${id === conv._id ? 'active' : ''} ${conv.unreadCount > 0 ? 'unread' : ''}`}
                  onClick={() => navigate(`/conversations/${conv._id}`)}
                >
                  <div className="conv-avatar" style={{ background: getAvatarColor(conv.visitor?.name) }}>
                    {conv.visitor?.name?.[0]?.toUpperCase() || 'V'}
                    {conv.visitor?.isOnline && <span className="conv-online-dot" />}
                  </div>
                  <div className="conv-info">
                    <div className="conv-name">{conv.visitor?.name || 'Visitor'}</div>
                    <div className="conv-preview">{conv.lastMessage || 'Started conversation'}</div>
                    <div className="conv-meta">
                      <span className={`badge badge-${conv.status}`}>{conv.status}</span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(conv.lastMessageAt || conv.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                  {conv.unreadCount > 0 && (
                    <div className="conv-unread-badge">{conv.unreadCount}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Panel */}
        {activeConversation ? (
          <div className="chat-panel">
            {/* Chat Header */}
            <div className="chat-header">
              <div className="conv-avatar" style={{ background: getAvatarColor(activeConversation.visitor?.name), width: 38, height: 38 }}>
                {activeConversation.visitor?.name?.[0]?.toUpperCase() || 'V'}
                {activeConversation.visitor?.isOnline && <span className="conv-online-dot" />}
              </div>
              <div className="chat-header-info">
                <div className="chat-header-name">{activeConversation.visitor?.name || 'Visitor'}</div>
                <div className="chat-header-sub">
                  {activeConversation.visitor?.isOnline ? '🟢 Online' : '⚫ Offline'}
                  {activeConversation.visitor?.currentPage && ` · ${activeConversation.visitor.currentPage}`}
                </div>
              </div>
              <div className="chat-header-actions">
                <span className={`badge badge-${activeConversation.status}`}>{activeConversation.status}</span>
                {activeConversation.status !== 'resolved' && (
                  <button className="btn btn-success btn-sm" onClick={handleResolve}>
                    <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: 'currentColor' }}><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                    Resolve
                  </button>
                )}
                <button
                  className={`btn btn-sm ${activeTab === 'visitor' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setActiveTab(activeTab === 'visitor' ? 'chat' : 'visitor')}
                >
                  Info
                </button>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Messages */}
              <div className="chat-messages" style={{ flex: 1 }}>
                {messages.map((msg, idx) => {
                  if (msg.type === 'system') {
                    return <div key={msg._id || idx} className="msg-system">{msg.content}</div>;
                  }
                  return (
                    <div key={msg._id || idx} className={`msg-group ${msg.sender}`}>
                      {msg.sender !== 'visitor' && (
                        <div className="msg-sender">{msg.sender === 'bot' ? '🤖 Bot' : '👤 ' + (msg.senderName || 'Agent')}</div>
                      )}
                      <div className="msg-row">
                        {msg.sender !== 'visitor' && (
                          <div className={`msg-avatar ${msg.sender === 'bot' ? 'bot' : ''}`}>
                            {msg.sender === 'bot' ? '🤖' : (msg.senderName?.[0] || 'A')}
                          </div>
                        )}
                        <div className="msg-bubble-container">
                          <div className="msg-bubble">
                            {msg.type === 'image' && msg.fileUrl ? (
                              <img src={msg.fileUrl} alt="img" style={{ maxWidth: 200, borderRadius: 10 }} />
                            ) : msg.content}
                          </div>
                          <div className="msg-time">{format(new Date(msg.createdAt), 'h:mm a')}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="typing-indicator">
                    <div className="msg-avatar">{isTyping.senderName?.[0] || 'V'}</div>
                    <div className="typing-dots">
                      <span /><span /><span />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Visitor Info Panel */}
              {activeTab === 'visitor' && (
                <div className="info-panel">
                  <div className="info-section">
                    <div className="info-section-title">Visitor Details</div>
                    <div className="info-row">
                      <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                      <div>
                        <div className="info-row-label">Name</div>
                        <div className="info-row-value">{activeConversation.visitor?.name || '-'}</div>
                      </div>
                    </div>
                    <div className="info-row">
                      <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                      <div>
                        <div className="info-row-label">Email</div>
                        <div className="info-row-value">{activeConversation.visitor?.email || '-'}</div>
                      </div>
                    </div>
                    <div className="info-row">
                      <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                      <div>
                        <div className="info-row-label">Location</div>
                        <div className="info-row-value">
                          {activeConversation.visitor?.location?.city || ''} {activeConversation.visitor?.location?.country || '-'}
                        </div>
                      </div>
                    </div>
                    <div className="info-row">
                      <svg viewBox="0 0 24 24"><path d="M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/></svg>
                      <div>
                        <div className="info-row-label">Browser / OS</div>
                        <div className="info-row-value">{activeConversation.visitor?.browser} · {activeConversation.visitor?.os}</div>
                      </div>
                    </div>
                    <div className="info-row">
                      <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                      <div>
                        <div className="info-row-label">Current Page</div>
                        <div className="info-row-value" style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>{activeConversation.visitor?.currentPage || '-'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="info-section">
                    <div className="info-section-title">Conversation</div>
                    <div className="info-row">
                      <svg viewBox="0 0 24 24"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>
                      <div>
                        <div className="info-row-label">Started</div>
                        <div className="info-row-value">{format(new Date(activeConversation.createdAt), 'MMM d, h:mm a')}</div>
                      </div>
                    </div>
                    {activeConversation.assignedAgent && (
                      <div className="info-row">
                        <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                        <div>
                          <div className="info-row-label">Assigned To</div>
                          <div className="info-row-value">{activeConversation.assignedAgent?.name}</div>
                        </div>
                      </div>
                    )}
                    <div className="info-row">
                      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                      <div>
                        <div className="info-row-label">Website</div>
                        <div className="info-row-value">{activeConversation.websiteId?.name}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            {activeConversation.status !== 'resolved' && (
              <div className="chat-input-area">
                {showCanned && cannedResponses.length > 0 && (
                  <div className="canned-suggestions">
                    {cannedResponses
                      .filter(r => r.shortcut.toLowerCase().includes(message.slice(1).toLowerCase()))
                      .map((r) => (
                        <button key={r._id} className="canned-suggestion"
                          onClick={() => { setMessage(r.content); setShowCanned(false); inputRef.current?.focus(); }}>
                          {r.shortcut}: {r.content.slice(0, 40)}...
                        </button>
                      ))
                    }
                  </div>
                )}
                <div className="chat-input-row">
                  <textarea
                    ref={inputRef}
                    className="chat-input"
                    placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
                    value={message}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    rows={1}
                  />
                  <button
                    className="send-btn"
                    onClick={handleSend}
                    disabled={!message.trim() || sending}
                  >
                    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state" style={{ flex: 1 }}>
            <div className="empty-state-icon">
              <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
            </div>
            <h3>Select a Conversation</h3>
            <p>Choose a conversation from the left panel to start replying to your customers.</p>
          </div>
        )}
      </div>
    </div>
  );
}
