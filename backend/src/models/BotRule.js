const mongoose = require('mongoose');

const BotRuleSchema = new mongoose.Schema({
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Website',
    required: true,
  },
  name: { type: String, required: true, trim: true },
  triggers: [{ type: String, trim: true, lowercase: true }], // keywords
  response: {
    type: String,
    required: true,
    maxlength: [2000, 'Bot response cannot exceed 2000 characters'],
  },
  matchType: {
    type: String,
    enum: ['contains', 'exact', 'startsWith'],
    default: 'contains',
  },
  priority: { type: Number, default: 0 }, // higher = checked first
  isActive: { type: Boolean, default: true },
  triggerCount: { type: Number, default: 0 }, // how many times triggered
}, { timestamps: true });

BotRuleSchema.index({ websiteId: 1, priority: -1, isActive: 1 });

module.exports = mongoose.model('BotRule', BotRuleSchema);
