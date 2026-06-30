const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Website',
    required: true,
  },
  visitor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visitor',
    required: true,
  },
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  status: {
    type: String,
    enum: ['open', 'resolved', 'pending', 'bot'],
    default: 'open',
  },
  channel: {
    type: String,
    enum: ['widget', 'email'],
    default: 'widget',
  },
  tags: [{ type: String }],
  lastMessage: { type: String, default: '' },
  lastMessageAt: { type: Date, default: Date.now },
  unreadCount: { type: Number, default: 0 }, // unread for agent
  visitorUnreadCount: { type: Number, default: 0 }, // unread for visitor
  firstResponseAt: { type: Date, default: null },
  resolvedAt: { type: Date, default: null },
  isBot: { type: Boolean, default: false }, // currently being handled by bot
  notes: [{ // internal notes, not visible to visitor
    content: String,
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

// Index for fast queries
ConversationSchema.index({ websiteId: 1, status: 1, lastMessageAt: -1 });
ConversationSchema.index({ visitor: 1 });

module.exports = mongoose.model('Conversation', ConversationSchema);
