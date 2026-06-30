const mongoose = require('mongoose');

const CannedResponseSchema = new mongoose.Schema({
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Website',
    required: true,
  },
  shortcut: { type: String, required: true, trim: true }, // e.g., '/greeting'
  content: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('CannedResponse', CannedResponseSchema);
