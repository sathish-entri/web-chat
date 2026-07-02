const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const WebsiteSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: [true, 'Website name is required'],
    trim: true,
  },
  domain: {
    type: String,
    required: [true, 'Website domain is required'],
    trim: true,
    lowercase: true,
  },
  widgetId: {
    type: String,
    unique: true,
    default: () => uuidv4(),
  },
  settings: {
    primaryColor: { type: String, default: '#6C63FF' },
    secondaryColor: { type: String, default: '#4F46E5' },
    welcomeMessage: { type: String, default: 'Hi! 👋 How can we help you today?' },
    awayMessage: { type: String, default: "We are currently away but we'll get back to you soon!" },
    botName: { type: String, default: 'Support Bot' },
    agentName: { type: String, default: 'Support Agent' },
    position: { type: String, enum: ['bottom-right', 'bottom-left'], default: 'bottom-right' },
    logo: { type: String, default: '' },
    requireEmail: { type: Boolean, default: true },
    showBranding: { type: Boolean, default: true },
    botFallbackEnabled: { type: Boolean, default: true },
  },
  botEnabled: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  businessHours: {
    enabled: { type: Boolean, default: false },
    timezone: { type: String, default: 'UTC' },
    schedule: {
      monday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      tuesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      wednesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      thursday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      friday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      saturday: { open: String, close: String, isOpen: { type: Boolean, default: false } },
      sunday: { open: String, close: String, isOpen: { type: Boolean, default: false } },
    },
  },
  agents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  totalConversations: { type: Number, default: 0 },
  totalMessages: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Website', WebsiteSchema);
