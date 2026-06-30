const mongoose = require('mongoose');

const VisitorSchema = new mongoose.Schema({
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Website',
    required: true,
  },
  name: { type: String, default: 'Anonymous' },
  email: { type: String, default: '' },
  sessionId: { type: String, required: true, unique: true }, // localStorage token
  currentPage: { type: String, default: '' },
  browser: { type: String, default: '' },
  os: { type: String, default: '' },
  device: { type: String, default: '' },
  ipAddress: { type: String, default: '' },
  location: {
    city: { type: String, default: '' },
    country: { type: String, default: '' },
    countryCode: { type: String, default: '' },
  },
  isOnline: { type: Boolean, default: true },
  lastSeen: { type: Date, default: Date.now },
  socketId: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Visitor', VisitorSchema);
