/**
 * WebChat Embeddable Widget v1.0.0
 * Usage: <script src="https://your-server.com/widget/widget.js?id=WIDGET_ID" async defer></script>
 * Or: window.WebChatConfig = { widgetId: 'xxx' }; then load this script
 */
(function () {
  'use strict';

  // ─── CONFIGURATION ───
  const API_BASE = document.currentScript
    ? new URL(document.currentScript.src).origin
    : window.location.origin;

  const SOCKET_URL = API_BASE;
  const widgetId = (window.WebChatConfig && window.WebChatConfig.widgetId) ||
    new URLSearchParams(document.currentScript ? document.currentScript.src.split('?')[1] : '').get('id');

  if (!widgetId) {
    console.warn('[WebChat] No widgetId provided');
    return;
  }

  // ─── STATE ───
  let state = {
    isOpen: false,
    isMinimized: false,
    messages: [],
    conversation: null,
    visitor: null,
    config: null,
    sessionId: null,
    socket: null,
    isTyping: false,
    agentTyping: false,
    unreadCount: 0,
    preFormSubmitted: false,
    isConnected: false,
  };

  // ─── SESSION ID ───
  const getSessionId = () => {
    let sid = localStorage.getItem('wc_session_' + widgetId);
    if (!sid) {
      sid = 'vis_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('wc_session_' + widgetId, sid);
    }
    return sid;
  };
  state.sessionId = getSessionId();

  // ─── BROWSER DETECTION ───
  const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    let browser = 'Unknown', os = 'Unknown', device = 'Desktop';
    if (/Chrome/.test(ua)) browser = 'Chrome';
    else if (/Firefox/.test(ua)) browser = 'Firefox';
    else if (/Safari/.test(ua)) browser = 'Safari';
    else if (/Edge/.test(ua)) browser = 'Edge';
    if (/Windows/.test(ua)) os = 'Windows';
    else if (/Mac/.test(ua)) os = 'macOS';
    else if (/Linux/.test(ua)) os = 'Linux';
    else if (/Android/.test(ua)) { os = 'Android'; device = 'Mobile'; }
    else if (/iPhone|iPad/.test(ua)) { os = 'iOS'; device = 'Mobile'; }
    return { browser, os, device };
  };

  // ─── API CALLS ───
  const api = {
    get: async (url) => {
      const res = await fetch(`${API_BASE}${url}`);
      return res.json();
    },
    post: async (url, data) => {
      const res = await fetch(`${API_BASE}${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
  };

  // ─── LOAD SOCKET.IO ───
  const loadSocketIO = () => {
    return new Promise((resolve) => {
      if (window.io) return resolve();
      const script = document.createElement('script');
      script.src = `${SOCKET_URL}/socket.io/socket.io.js`;
      script.onload = resolve;
      document.head.appendChild(script);
    });
  };

  // ─── INIT SOCKET ───
  const initSocket = () => {
    state.socket = window.io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    state.socket.on('connect', () => {
      state.isConnected = true;
      if (state.conversation && state.visitor) {
        state.socket.emit('visitor:join', {
          conversationId: state.conversation._id,
          visitorId: state.visitor._id,
          websiteId: state.conversation.websiteId,
        });
      }
      updateConnectionIndicator(true);
    });

    state.socket.on('disconnect', () => {
      state.isConnected = false;
      updateConnectionIndicator(false);
    });

    state.socket.on('message:receive', ({ message }) => {
      if (message.sender === 'agent' || message.sender === 'bot') {
        addMessage(message);
        if (!state.isOpen) {
          state.unreadCount++;
          updateBadge();
        }
        playNotificationSound();
      }
    });

    state.socket.on('typing:start', ({ sender }) => {
      if (sender === 'agent' || sender === 'bot') {
        state.agentTyping = true;
        showTypingIndicator();
      }
    });

    state.socket.on('typing:stop', ({ sender }) => {
      if (sender === 'agent' || sender === 'bot') {
        state.agentTyping = false;
        hideTypingIndicator();
      }
    });

    state.socket.on('conversation:resolved', () => {
      addSystemMessage('This conversation has been resolved. Thank you! 🎉');
    });

    state.socket.on('agent:status', ({ isOnline }) => {
      updateAgentStatus(isOnline);
    });
  };

  // ─── INJECT STYLES ───
  const injectStyles = (config) => {
    const primary = (config && config.primaryColor) || '#6C63FF';
    const secondary = (config && config.secondaryColor) || '#4F46E5';
    const position = (config && config.position) || 'bottom-right';
    const isRight = position === 'bottom-right';

    const css = `
      :root {
        --wc-primary: ${primary};
        --wc-secondary: ${secondary};
        --wc-bg: #ffffff;
        --wc-bg2: #f8f9fc;
        --wc-text: #1a1a2e;
        --wc-text-muted: #6b7280;
        --wc-border: #e5e7eb;
        --wc-shadow: 0 20px 60px rgba(0,0,0,0.15);
        --wc-radius: 20px;
        --wc-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      #wc-container * { box-sizing: border-box; margin: 0; padding: 0; font-family: var(--wc-font); }
      #wc-container { position: fixed; ${isRight ? 'right: 24px' : 'left: 24px'}; bottom: 24px; z-index: 999999; }

      /* ── TRIGGER BUTTON ── */
      #wc-trigger {
        width: 60px; height: 60px; border-radius: 50%;
        background: linear-gradient(135deg, var(--wc-primary), var(--wc-secondary));
        border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
        box-shadow: 0 8px 30px rgba(108,99,255,0.4);
        transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease;
        position: relative; outline: none;
      }
      #wc-trigger:hover { transform: scale(1.1); box-shadow: 0 12px 40px rgba(108,99,255,0.5); }
      #wc-trigger:active { transform: scale(0.95); }
      #wc-trigger svg { width: 28px; height: 28px; fill: white; transition: all 0.3s ease; }
      #wc-badge {
        position: absolute; top: -4px; ${isRight ? 'right: -4px' : 'left: -4px'};
        background: #ef4444; color: white; border-radius: 50%; width: 22px; height: 22px;
        font-size: 12px; font-weight: 700; display: none; align-items: center; justify-content: center;
        border: 2px solid white; animation: wc-pulse 1.5s infinite;
      }
      @keyframes wc-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }

      /* ── CHAT WINDOW ── */
      #wc-window {
        width: 380px; max-width: calc(100vw - 48px);
        height: 580px; max-height: calc(100vh - 120px);
        background: var(--wc-bg); border-radius: var(--wc-radius);
        box-shadow: var(--wc-shadow); display: flex; flex-direction: column;
        overflow: hidden; position: absolute; ${isRight ? 'right: 0' : 'left: 0'}; bottom: 72px;
        transform: scale(0.8) translateY(20px); transform-origin: ${isRight ? 'bottom right' : 'bottom left'};
        opacity: 0; pointer-events: none;
        transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease;
      }
      #wc-window.wc-open { transform: scale(1) translateY(0); opacity: 1; pointer-events: all; }

      /* ── HEADER ── */
      #wc-header {
        background: linear-gradient(135deg, var(--wc-primary), var(--wc-secondary));
        padding: 18px 20px; display: flex; align-items: center; gap: 12px; position: relative;
      }
      #wc-avatar-wrap {
        width: 42px; height: 42px; border-radius: 50%; background: rgba(255,255,255,0.2);
        display: flex; align-items: center; justify-content: center; flex-shrink: 0; position: relative;
      }
      #wc-avatar-wrap svg { width: 24px; height: 24px; fill: white; }
      #wc-status-dot {
        width: 10px; height: 10px; border-radius: 50%; background: #22c55e;
        border: 2px solid white; position: absolute; bottom: 0; right: 0;
      }
      #wc-header-info { flex: 1; }
      #wc-header-name { color: white; font-weight: 700; font-size: 15px; }
      #wc-header-status { color: rgba(255,255,255,0.8); font-size: 12px; margin-top: 2px; }
      #wc-close-btn {
        background: rgba(255,255,255,0.2); border: none; border-radius: 50%;
        width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center;
        justify-content: center; transition: background 0.2s; outline: none;
      }
      #wc-close-btn:hover { background: rgba(255,255,255,0.35); }
      #wc-close-btn svg { width: 16px; height: 16px; fill: white; }

      /* ── PRE-CHAT FORM ── */
      #wc-pre-form {
        padding: 24px 20px; flex: 1; overflow-y: auto;
        display: flex; flex-direction: column; gap: 16px;
      }
      #wc-pre-form h3 { font-size: 18px; color: var(--wc-text); font-weight: 700; }
      #wc-pre-form p { font-size: 13px; color: var(--wc-text-muted); line-height: 1.6; }
      .wc-input-group { display: flex; flex-direction: column; gap: 6px; }
      .wc-input-group label { font-size: 13px; font-weight: 600; color: var(--wc-text); }
      .wc-input-group input {
        padding: 12px 14px; border: 1.5px solid var(--wc-border); border-radius: 10px;
        font-size: 14px; outline: none; transition: border-color 0.2s, box-shadow 0.2s;
        background: var(--wc-bg); color: var(--wc-text);
      }
      .wc-input-group input:focus { border-color: var(--wc-primary); box-shadow: 0 0 0 3px rgba(108,99,255,0.1); }
      #wc-start-btn {
        background: linear-gradient(135deg, var(--wc-primary), var(--wc-secondary));
        color: white; border: none; border-radius: 12px; padding: 14px;
        font-size: 15px; font-weight: 600; cursor: pointer; transition: opacity 0.2s, transform 0.2s;
        margin-top: 4px;
      }
      #wc-start-btn:hover { opacity: 0.92; transform: translateY(-1px); }

      /* ── MESSAGES ── */
      #wc-messages {
        flex: 1; overflow-y: auto; padding: 16px 16px 8px;
        display: flex; flex-direction: column; gap: 12px;
        scroll-behavior: smooth;
      }
      #wc-messages::-webkit-scrollbar { width: 4px; }
      #wc-messages::-webkit-scrollbar-track { background: transparent; }
      #wc-messages::-webkit-scrollbar-thumb { background: var(--wc-border); border-radius: 4px; }

      .wc-msg-group { display: flex; flex-direction: column; gap: 4px; }
      .wc-msg-group.wc-visitor { align-items: flex-end; }
      .wc-msg-group.wc-agent, .wc-msg-group.wc-bot { align-items: flex-start; }

      .wc-bubble-row { display: flex; align-items: flex-end; gap: 8px; }
      .wc-msg-group.wc-visitor .wc-bubble-row { flex-direction: row-reverse; }

      .wc-bubble-avatar {
        width: 28px; height: 28px; border-radius: 50%;
        background: linear-gradient(135deg, var(--wc-primary), var(--wc-secondary));
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0; font-size: 11px; font-weight: 700; color: white;
      }
      .wc-bubble {
        max-width: 78%; padding: 10px 14px; border-radius: 18px;
        font-size: 14px; line-height: 1.5; word-break: break-word;
        animation: wc-pop 0.3s cubic-bezier(0.34,1.56,0.64,1);
      }
      @keyframes wc-pop { from{transform:scale(0.8);opacity:0} to{transform:scale(1);opacity:1} }

      .wc-msg-group.wc-visitor .wc-bubble {
        background: linear-gradient(135deg, var(--wc-primary), var(--wc-secondary));
        color: white; border-bottom-right-radius: 4px;
      }
      .wc-msg-group.wc-agent .wc-bubble, .wc-msg-group.wc-bot .wc-bubble {
        background: var(--wc-bg2); color: var(--wc-text); border-bottom-left-radius: 4px;
        border: 1px solid var(--wc-border);
      }
      .wc-msg-group.wc-bot .wc-bubble { background: linear-gradient(135deg,#f0edff,#e8f4fd); }

      .wc-msg-time { font-size: 10px; color: var(--wc-text-muted); padding: 0 4px; }
      .wc-sender-name { font-size: 11px; color: var(--wc-text-muted); font-weight: 600; padding: 0 4px; }

      .wc-system-msg {
        text-align: center; font-size: 11px; color: var(--wc-text-muted);
        background: var(--wc-bg2); padding: 6px 12px; border-radius: 20px;
        margin: 4px auto; width: fit-content;
      }

      /* ── TYPING INDICATOR ── */
      #wc-typing {
        display: none; align-items: center; gap: 8px;
        padding: 0 16px 8px;
      }
      #wc-typing.show { display: flex; }
      .wc-typing-avatar {
        width: 28px; height: 28px; border-radius: 50%;
        background: linear-gradient(135deg, var(--wc-primary), var(--wc-secondary));
        display: flex; align-items: center; justify-content: center;
      }
      .wc-typing-dots {
        background: var(--wc-bg2); border: 1px solid var(--wc-border);
        padding: 10px 14px; border-radius: 18px; border-bottom-left-radius: 4px;
        display: flex; gap: 4px; align-items: center;
      }
      .wc-typing-dots span {
        width: 6px; height: 6px; background: var(--wc-text-muted);
        border-radius: 50%; animation: wc-bounce 1.2s infinite;
      }
      .wc-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
      .wc-typing-dots span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes wc-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }

      /* ── INPUT AREA ── */
      #wc-input-area {
        padding: 12px 16px; border-top: 1px solid var(--wc-border);
        background: var(--wc-bg); display: flex; gap: 10px; align-items: flex-end;
      }
      #wc-input {
        flex: 1; min-height: 42px; max-height: 120px;
        border: 1.5px solid var(--wc-border); border-radius: 22px;
        padding: 10px 16px; font-size: 14px; resize: none; outline: none;
        background: var(--wc-bg2); color: var(--wc-text);
        transition: border-color 0.2s, box-shadow 0.2s; font-family: var(--wc-font);
        line-height: 1.4;
      }
      #wc-input:focus { border-color: var(--wc-primary); box-shadow: 0 0 0 3px rgba(108,99,255,0.1); }
      #wc-input::placeholder { color: var(--wc-text-muted); }

      #wc-attach-btn {
        width: 40px; height: 40px; border-radius: 50%; border: none;
        background: var(--wc-bg2); cursor: pointer; display: flex;
        align-items: center; justify-content: center; transition: background 0.2s; outline: none;
        flex-shrink: 0;
      }
      #wc-attach-btn:hover { background: var(--wc-border); }
      #wc-attach-btn svg { width: 18px; height: 18px; fill: var(--wc-text-muted); }

      #wc-send-btn {
        width: 42px; height: 42px; border-radius: 50%; border: none;
        background: linear-gradient(135deg, var(--wc-primary), var(--wc-secondary));
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: transform 0.2s, opacity 0.2s; outline: none; flex-shrink: 0;
      }
      #wc-send-btn:hover { transform: scale(1.05); }
      #wc-send-btn:active { transform: scale(0.95); }
      #wc-send-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
      #wc-send-btn svg { width: 18px; height: 18px; fill: white; margin-left: 2px; }

      /* ── BRANDING ── */
      #wc-branding {
        text-align: center; padding: 6px; font-size: 10px; color: var(--wc-text-muted);
        border-top: 1px solid var(--wc-border);
      }
      #wc-branding a { color: var(--wc-primary); text-decoration: none; font-weight: 600; }

      /* ── FILE PREVIEW ── */
      .wc-image-msg { max-width: 200px; border-radius: 12px; margin-top: 4px; cursor: pointer; }
      .wc-file-msg {
        display: flex; align-items: center; gap: 8px; padding: 8px 12px;
        background: rgba(0,0,0,0.08); border-radius: 10px; font-size: 12px;
      }

      /* ── RESPONSIVE ── */
      @media (max-width: 480px) {
        #wc-window { width: calc(100vw - 48px); height: calc(100vh - 120px); }
      }
    `;

    const style = document.createElement('style');
    style.id = 'wc-styles';
    style.textContent = css;
    document.head.appendChild(style);
  };

  // ─── SVG ICONS ───
  const icons = {
    chat: `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>`,
    close: `<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
    send: `<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`,
    agent: `<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`,
    attach: `<svg viewBox="0 0 24 24"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>`,
    bot: `<svg viewBox="0 0 24 24"><path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zm-2 10H6V7h12v12zm-9-6c-.83 0-1.5-.67-1.5-1.5S8.17 10 9 10s1.5.67 1.5 1.5S9.83 13 9 13zm6 0c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z"/></svg>`,
  };

  // ─── CREATE WIDGET HTML ───
  const createWidget = (config) => {
    const container = document.createElement('div');
    container.id = 'wc-container';

    const agentName = (config && config.settings && config.settings.agentName) || 'Support';
    const botName = (config && config.settings && config.settings.botName) || 'Support Bot';

    container.innerHTML = `
      <!-- Trigger Button -->
      <button id="wc-trigger" aria-label="Open Chat" title="Chat with us">
        ${icons.chat}
        <span id="wc-badge"></span>
      </button>

      <!-- Chat Window -->
      <div id="wc-window" role="dialog" aria-label="Chat Window">
        <!-- Header -->
        <div id="wc-header">
          <div id="wc-avatar-wrap">
            ${icons.agent}
            <span id="wc-status-dot"></span>
          </div>
          <div id="wc-header-info">
            <div id="wc-header-name">${agentName}</div>
            <div id="wc-header-status">🟢 Online - Typically replies instantly</div>
          </div>
          <button id="wc-close-btn" aria-label="Close Chat">${icons.close}</button>
        </div>

        <!-- Pre-Chat Form -->
        <div id="wc-pre-form">
          <h3>👋 Welcome!</h3>
          <p>Please fill in your details and we'll get you connected right away.</p>
          <div class="wc-input-group">
            <label for="wc-name-input">Your Name</label>
            <input type="text" id="wc-name-input" placeholder="Enter your name" autocomplete="name" />
          </div>
          <div class="wc-input-group">
            <label for="wc-email-input">Email Address</label>
            <input type="email" id="wc-email-input" placeholder="Enter your email" autocomplete="email" />
          </div>
          <button id="wc-start-btn">Start Chat 💬</button>
        </div>

        <!-- Messages Area (hidden initially) -->
        <div id="wc-messages" style="display:none"></div>

        <!-- Typing Indicator -->
        <div id="wc-typing" style="display:none">
          <div class="wc-typing-avatar">${icons.bot}</div>
          <div class="wc-typing-dots"><span></span><span></span><span></span></div>
        </div>

        <!-- Input Area (hidden initially) -->
        <div id="wc-input-area" style="display:none">
          <input type="file" id="wc-file-input" accept="image/*,.pdf,.doc,.docx,.txt" style="display:none" />
          <button id="wc-attach-btn" aria-label="Attach File">${icons.attach}</button>
          <textarea id="wc-input" placeholder="Type a message..." rows="1"></textarea>
          <button id="wc-send-btn" aria-label="Send Message" disabled>${icons.send}</button>
        </div>

        <!-- Branding -->
        <div id="wc-branding">
          Powered by <a href="#" target="_blank">WebChat</a>
        </div>
      </div>
    `;

    document.body.appendChild(container);
  };

  // ─── RENDER MESSAGES ───
  const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const addMessage = (msg) => {
    state.messages.push(msg);
    renderMessage(msg);
    scrollToBottom();
  };

  const renderMessage = (msg) => {
    const container = document.getElementById('wc-messages');
    if (!container) return;

    if (msg.type === 'system') {
      const div = document.createElement('div');
      div.className = 'wc-system-msg';
      div.textContent = msg.content;
      container.appendChild(div);
      return;
    }

    const group = document.createElement('div');
    group.className = `wc-msg-group wc-${msg.sender}`;

    const senderInitial = (msg.senderName || (msg.sender === 'bot' ? 'B' : 'A'))[0].toUpperCase();
    const avatarIcon = msg.sender === 'bot' ? icons.bot : icons.agent;

    let bubbleContent = '';
    if (msg.type === 'image' && msg.fileUrl) {
      bubbleContent = `<img src="${msg.fileUrl}" class="wc-image-msg" alt="Image" onclick="window.open('${msg.fileUrl}','_blank')" />`;
    } else if (msg.type === 'file' && msg.fileUrl) {
      bubbleContent = `<div class="wc-file-msg">📎 <a href="${msg.fileUrl}" target="_blank" style="color:inherit">${msg.fileName || 'File'}</a></div>`;
    } else {
      bubbleContent = escapeHtml(msg.content).replace(/\n/g, '<br>');
    }

    const showAvatar = msg.sender !== 'visitor';

    group.innerHTML = `
      ${msg.sender !== 'visitor' ? `<div class="wc-sender-name">${msg.senderName || (msg.sender === 'bot' ? '🤖 Bot' : '👤 Agent')}</div>` : ''}
      <div class="wc-bubble-row">
        ${showAvatar ? `<div class="wc-bubble-avatar">${senderInitial}</div>` : ''}
        <div>
          <div class="wc-bubble">${bubbleContent}</div>
          <div class="wc-msg-time">${formatTime(msg.createdAt || new Date())}</div>
        </div>
      </div>
    `;

    container.appendChild(group);
  };

  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  };

  const addSystemMessage = (text) => {
    addMessage({ type: 'system', content: text, createdAt: new Date() });
  };

  const scrollToBottom = () => {
    const msgs = document.getElementById('wc-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  };

  // ─── TYPING INDICATOR ───
  const showTypingIndicator = () => {
    const el = document.getElementById('wc-typing');
    if (el) { el.style.display = 'flex'; scrollToBottom(); }
  };

  const hideTypingIndicator = () => {
    const el = document.getElementById('wc-typing');
    if (el) el.style.display = 'none';
  };

  // ─── BADGE ───
  const updateBadge = () => {
    const badge = document.getElementById('wc-badge');
    if (!badge) return;
    if (state.unreadCount > 0) {
      badge.textContent = state.unreadCount > 9 ? '9+' : state.unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  };

  // ─── CONNECTION INDICATOR ───
  const updateConnectionIndicator = (isOnline) => {
    const dot = document.getElementById('wc-status-dot');
    const status = document.getElementById('wc-header-status');
    if (dot) dot.style.background = isOnline ? '#22c55e' : '#f59e0b';
    if (status) status.textContent = isOnline ? '🟢 Online - Typically replies instantly' : '🟡 Connecting...';
  };

  const updateAgentStatus = (isOnline) => {
    const dot = document.getElementById('wc-status-dot');
    const status = document.getElementById('wc-header-status');
    if (dot) dot.style.background = isOnline ? '#22c55e' : '#6b7280';
    if (status) status.textContent = isOnline ? '🟢 Agent is online' : '⚫ Agent is offline';
  };

  // ─── SEND MESSAGE ───
  let typingTimer;
  const sendMessage = async () => {
    const input = document.getElementById('wc-input');
    const content = input ? input.value.trim() : '';
    if (!content || !state.conversation) return;

    input.value = '';
    input.style.height = 'auto';
    document.getElementById('wc-send-btn').disabled = true;

    // Clear typing
    if (state.socket) {
      state.socket.emit('typing:stop', {
        conversationId: state.conversation._id,
        sender: 'visitor',
      });
    }

    // Optimistic UI
    const tempMsg = {
      _id: 'temp_' + Date.now(),
      conversationId: state.conversation._id,
      sender: 'visitor',
      senderName: state.visitor ? state.visitor.name : 'You',
      content,
      type: 'text',
      createdAt: new Date(),
    };
    addMessage(tempMsg);

    try {
      await api.post(
        `/api/widget/${widgetId}/conversations/${state.conversation._id}/messages`,
        {
          content,
          type: 'text',
          sessionId: state.sessionId,
        }
      );
    } catch (err) {
      console.error('[WebChat] Send message error', err);
      addSystemMessage('Failed to send message. Please try again.');
    }
  };

  // ─── OPEN/CLOSE WINDOW ───
  const openChat = () => {
    const win = document.getElementById('wc-window');
    const trigger = document.getElementById('wc-trigger');
    if (win) { win.classList.add('wc-open'); state.isOpen = true; }
    if (trigger) trigger.innerHTML = icons.close + `<span id="wc-badge"></span>`;
    state.unreadCount = 0;
    updateBadge();

    // Read messages
    if (state.conversation && state.socket) {
      state.socket.emit('message:read', { conversationId: state.conversation._id });
    }
  };

  const closeChat = () => {
    const win = document.getElementById('wc-window');
    const trigger = document.getElementById('wc-trigger');
    if (win) { win.classList.remove('wc-open'); state.isOpen = false; }
    if (trigger) trigger.innerHTML = icons.chat + `<span id="wc-badge"></span>`;
    updateBadge();
  };

  // ─── SHOW CHAT VIEW ───
  const showChatView = () => {
    const preForm = document.getElementById('wc-pre-form');
    const messages = document.getElementById('wc-messages');
    const inputArea = document.getElementById('wc-input-area');
    const typing = document.getElementById('wc-typing');
    if (preForm) preForm.style.display = 'none';
    if (messages) messages.style.display = 'flex';
    if (inputArea) inputArea.style.display = 'flex';
    if (typing) typing.style.display = 'none';
    state.preFormSubmitted = true;

    // Render existing messages
    state.messages.forEach(renderMessage);
    setTimeout(scrollToBottom, 100);

    // Focus input
    setTimeout(() => {
      const input = document.getElementById('wc-input');
      if (input) input.focus();
    }, 300);
  };

  // ─── NOTIFICATION SOUND ───
  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) { /* audio not supported */ }
  };

  // ─── BIND EVENTS ───
  const bindEvents = () => {
    // Toggle chat
    document.getElementById('wc-trigger').addEventListener('click', () => {
      state.isOpen ? closeChat() : openChat();
    });

    // Close button
    document.getElementById('wc-close-btn').addEventListener('click', closeChat);

    // Start chat button
    document.getElementById('wc-start-btn').addEventListener('click', async () => {
      const name = document.getElementById('wc-name-input').value.trim();
      const email = document.getElementById('wc-email-input').value.trim();
      if (!name) {
        document.getElementById('wc-name-input').focus();
        return;
      }

      const btn = document.getElementById('wc-start-btn');
      btn.textContent = 'Connecting...';
      btn.disabled = true;

      try {
        const { browser, os, device } = getBrowserInfo();
        const result = await api.post(`/api/widget/${widgetId}/conversations`, {
          name, email,
          sessionId: state.sessionId,
          currentPage: window.location.href,
          browser, os, device,
        });

        if (result.success) {
          state.conversation = result.conversation;
          state.visitor = result.visitor;
          state.messages = result.messages || [];

          // Update header
          const headerName = document.getElementById('wc-header-name');
          if (headerName && result.websiteSettings) {
            headerName.textContent = result.websiteSettings.agentName || 'Support';
          }

          // Init socket
          await loadSocketIO();
          initSocket();

          showChatView();
        } else {
          btn.textContent = 'Start Chat 💬';
          btn.disabled = false;
        }
      } catch (err) {
        console.error('[WebChat] Start conversation error', err);
        btn.textContent = 'Start Chat 💬';
        btn.disabled = false;
      }
    });

    // Send button
    document.getElementById('wc-send-btn').addEventListener('click', sendMessage);

    // Input events
    const input = document.getElementById('wc-input');
    input.addEventListener('input', () => {
      // Auto-resize
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';

      // Enable/disable send
      const sendBtn = document.getElementById('wc-send-btn');
      sendBtn.disabled = !input.value.trim();

      // Typing indicator
      if (state.socket && state.conversation) {
        clearTimeout(typingTimer);
        state.socket.emit('typing:start', {
          conversationId: state.conversation._id,
          sender: 'visitor',
          senderName: state.visitor ? state.visitor.name : 'Visitor',
        });
        typingTimer = setTimeout(() => {
          state.socket.emit('typing:stop', {
            conversationId: state.conversation._id,
            sender: 'visitor',
          });
        }, 2000);
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // File attachment
    document.getElementById('wc-attach-btn').addEventListener('click', () => {
      document.getElementById('wc-file-input').click();
    });

    document.getElementById('wc-file-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      // In production, upload to server. For now show local preview
      const reader = new FileReader();
      reader.onload = (ev) => {
        const tempMsg = {
          _id: 'temp_' + Date.now(),
          sender: 'visitor',
          senderName: state.visitor ? state.visitor.name : 'You',
          content: file.name,
          type: file.type.startsWith('image/') ? 'image' : 'file',
          fileUrl: ev.target.result,
          fileName: file.name,
          createdAt: new Date(),
        };
        addMessage(tempMsg);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    });
  };

  // ─── INIT ───
  const init = async () => {
    try {
      // Fetch widget config
      const result = await api.get(`/api/widget/${widgetId}/config`);
      if (!result.success) {
        console.warn('[WebChat] Widget config not found');
        return;
      }

      state.config = result.config;
      const settings = result.config.settings || {};

      // Inject styles
      injectStyles(settings);

      // Create widget HTML
      createWidget(result.config);

      // Check if visitor already has a session - try to resume
      const storedConvId = localStorage.getItem('wc_conv_' + widgetId);
      if (storedConvId) {
        state.preFormSubmitted = true;
      }

      // Bind events
      bindEvents();

      console.log('[WebChat] ✅ Widget initialized for', widgetId);
    } catch (err) {
      console.error('[WebChat] Initialization error', err);
    }
  };

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
