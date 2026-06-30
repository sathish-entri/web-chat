const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  sender: {
    type: String,
    enum: ['visitor', 'agent', 'bot'],
    required: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null, // null for visitor/bot
    refPath: 'senderModel',
  },
  senderModel: {
    type: String,
    enum: ['User', 'Visitor', null],
    default: null,
  },
  senderName: { type: String, default: '' },
  senderAvatar: { type: String, default: '' },
  content: {
    type: String,
    required: true,
    maxlength: [5000, 'Message cannot exceed 5000 characters'],
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text',
  },
  fileUrl: { type: String, default: null },
  fileName: { type: String, default: null },
  fileSize: { type: Number, default: null },
  mimeType: { type: String, default: null },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date, default: null },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

MessageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', MessageSchema);
