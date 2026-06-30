# 🚀 WebChat SaaS Platform

A full-stack MERN multi-tenant WebChat SaaS platform with embeddable chat widgets, real-time messaging, an AI chatbot, and a beautiful agent portal.

---

## 📦 Project Structure

```
webchat/
├── backend/        # Node.js + Express + Socket.IO API
├── frontend/       # React 18 + Vite Agent Dashboard
└── widget/         # Embeddable Vanilla JS Chat Widget
```

---

## ⚙️ Prerequisites

- **Node.js** >= 18
- **MongoDB** (local or MongoDB Atlas)
- **npm** >= 9

---

## 🚀 Getting Started

### 1. Start MongoDB
Make sure MongoDB is running locally:
```bash
# Windows: Start via Services or
mongod
```

### 2. Backend Setup

```bash
cd backend
npm install
# Edit .env if needed (MongoDB URI, etc.)
npm run dev
```

Backend runs on: **http://localhost:5000**

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: **http://localhost:5173**

### 4. Test Widget

Open `widget/test.html` in your browser. 
- First, create a website in the portal and copy your Widget ID
- Replace `PASTE_YOUR_WIDGET_ID_HERE` in `test.html` with your real Widget ID

---

## 🎯 Features

### Agent Portal (React Dashboard)
- 🔐 **JWT Authentication** — Secure login/register
- 💬 **Real-time Conversations** — Live chat with visitors via Socket.IO
- 🏢 **Multi-website Support** — Manage multiple websites from one dashboard
- 🤖 **ChatBot Management** — Create keyword-triggered auto-reply rules
- ⚡ **Canned Responses** — Quick `/shortcut` replies
- 📊 **Analytics Dashboard** — Charts, stats, response times
- 🏷️ **Tags & Labels** — Organize conversations
- 👥 **Agent Management** — Invite team members
- 🎨 **Widget Customization** — Colors, messages, position
- 🔔 **Typing Indicators** — Real-time typing status

### Embeddable Widget (Vanilla JS)
- 📱 **Responsive Design** — Works on mobile and desktop
- 👤 **Pre-chat Form** — Collect visitor name & email
- 💬 **Real-time Chat** — Instant message delivery via Socket.IO
- 🤖 **Bot Responses** — Automatic replies when agents are away
- 📎 **File Upload** — Send images and files
- 🔔 **Notification Sound** — Audio alert for new messages
- 🎨 **Branded** — Matches your website's color scheme
- 💾 **Session Persistence** — Remembers visitor across page loads

### Backend API
- 🔒 **JWT + bcrypt** — Secure authentication
- ⚡ **Socket.IO** — Real-time bidirectional communication
- 🗄️ **MongoDB + Mongoose** — Flexible data storage
- 🤖 **Bot Engine** — Rule-based keyword matching
- 📈 **Analytics** — Aggregated stats and charts data
- 🛡️ **Rate Limiting** — API protection
- 🌐 **CORS** — Cross-origin widget support

---

## 🌐 Widget Embedding

1. Go to **Portal → Websites → Get Widget Code**
2. Copy the embed code snippet
3. Paste it in your website's HTML before `</body>`:

```html
<script>
  window.WebChatConfig = { widgetId: 'your-widget-id-here' };
</script>
<script src="http://localhost:5000/widget/widget.js" async defer></script>
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new owner |
| POST | `/api/auth/login` | Login |
| GET | `/api/websites` | Get all websites |
| POST | `/api/websites` | Create website |
| GET | `/api/conversations` | Get conversations |
| POST | `/api/conversations/:id/messages` | Send message |
| GET | `/api/widget/:widgetId/config` | Widget config (public) |
| POST | `/api/widget/:widgetId/conversations` | Start conversation (public) |
| GET | `/api/analytics/overview` | Analytics stats |
| GET/POST | `/api/bot/rules` | Bot rules CRUD |

---

## 🔌 Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `agent:join` | Client→Server | Agent connects to portal |
| `visitor:join` | Client→Server | Visitor opens widget |
| `message:receive` | Server→Both | New message delivered |
| `typing:start` | Client→Server | User is typing |
| `typing:stop` | Client→Server | User stopped typing |
| `conversation:resolved` | Server→Widget | Chat resolved |
| `visitor:online` | Server→Portal | Visitor status update |

---

## 📁 Environment Variables

### Backend (`.env`)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/webchat
JWT_SECRET=your_super_secret
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
```

### Frontend (`.env`)
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🏗️ Built With

- **React 18** + Vite
- **Node.js** + Express
- **MongoDB** + Mongoose
- **Socket.IO** v4
- **Zustand** (state management)
- **Recharts** (analytics charts)
- **JWT** + bcrypt (auth)
- **Vanilla JS** (embeddable widget)

---

Made with ❤️ — WebChat SaaS Platform
