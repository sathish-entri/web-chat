const Visitor = require('../models/Visitor');
const User = require('../models/User');
const Conversation = require('../models/Conversation');

const initializeSocket = (io) => {
  // Track connected agents per website
  const agentRooms = new Map();
  // Track connected visitors
  const visitorSockets = new Map();

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ─── AGENT JOINS ───
    socket.on('agent:join', async ({ agentId, websiteIds }) => {
      try {
        // Join website rooms
        if (websiteIds && websiteIds.length) {
          websiteIds.forEach((wid) => {
            socket.join(`website_${wid}`);
            if (!agentRooms.has(wid)) agentRooms.set(wid, new Set());
            agentRooms.get(wid).add(agentId);
          });
        }

        // Update agent online status
        await User.findByIdAndUpdate(agentId, { isOnline: true, lastSeen: new Date() });

        // Notify websites that agent is online
        if (websiteIds) {
          websiteIds.forEach((wid) => {
            io.to(`website_${wid}`).emit('agent:status', { agentId, isOnline: true });
          });
        }

        socket.data.agentId = agentId;
        socket.data.websiteIds = websiteIds;
        socket.data.role = 'agent';

        console.log(`👤 Agent ${agentId} joined`);
      } catch (err) {
        console.error('agent:join error', err);
      }
    });

    // ─── VISITOR JOINS ───
    socket.on('visitor:join', async ({ conversationId, visitorId, websiteId }) => {
      try {
        socket.join(`conv_${conversationId}`);
        socket.join(`visitor_${visitorId}`);

        visitorSockets.set(visitorId, socket.id);

        await Visitor.findByIdAndUpdate(visitorId, {
          isOnline: true,
          lastSeen: new Date(),
          socketId: socket.id,
        });

        // Notify agents that visitor is online
        io.to(`website_${websiteId}`).emit('visitor:online', { visitorId, isOnline: true, conversationId });

        socket.data.visitorId = visitorId;
        socket.data.websiteId = websiteId;
        socket.data.conversationId = conversationId;
        socket.data.role = 'visitor';

        console.log(`🙋 Visitor ${visitorId} joined conv ${conversationId}`);
      } catch (err) {
        console.error('visitor:join error', err);
      }
    });

    // ─── AGENT JOINS CONVERSATION ───
    socket.on('conv:join', ({ conversationId }) => {
      socket.join(`conv_${conversationId}`);
    });

    // ─── AGENT LEAVES CONVERSATION ───
    socket.on('conv:leave', ({ conversationId }) => {
      socket.leave(`conv_${conversationId}`);
    });

    // ─── TYPING INDICATORS ───
    socket.on('typing:start', ({ conversationId, sender, senderName }) => {
      socket.to(`conv_${conversationId}`).emit('typing:start', { sender, senderName, conversationId });
    });

    socket.on('typing:stop', ({ conversationId, sender }) => {
      socket.to(`conv_${conversationId}`).emit('typing:stop', { sender, conversationId });
    });

    // ─── VISITOR READ RECEIPT ───
    socket.on('message:read', async ({ conversationId }) => {
      try {
        await Conversation.findByIdAndUpdate(conversationId, { visitorUnreadCount: 0 });
        socket.to(`conv_${conversationId}`).emit('message:read', { conversationId });
      } catch (err) {
        console.error('message:read error', err);
      }
    });

    // ─── DISCONNECT ───
    socket.on('disconnect', async () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
      try {
        if (socket.data.role === 'agent' && socket.data.agentId) {
          await User.findByIdAndUpdate(socket.data.agentId, {
            isOnline: false,
            lastSeen: new Date(),
          });
          if (socket.data.websiteIds) {
            socket.data.websiteIds.forEach((wid) => {
              io.to(`website_${wid}`).emit('agent:status', {
                agentId: socket.data.agentId,
                isOnline: false,
              });
            });
          }
        }

        if (socket.data.role === 'visitor' && socket.data.visitorId) {
          visitorSockets.delete(socket.data.visitorId);
          await Visitor.findByIdAndUpdate(socket.data.visitorId, {
            isOnline: false,
            lastSeen: new Date(),
          });
          if (socket.data.websiteId) {
            io.to(`website_${socket.data.websiteId}`).emit('visitor:online', {
              visitorId: socket.data.visitorId,
              isOnline: false,
              conversationId: socket.data.conversationId,
            });
          }
        }
      } catch (err) {
        console.error('disconnect error', err);
      }
    });
  });

  return io;
};

module.exports = initializeSocket;
