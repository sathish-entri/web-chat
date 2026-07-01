const mongoose = require('mongoose');

const segmentFilterSchema = new mongoose.Schema({
  field: {
    type: String,
    required: true,
    enum: ['country', 'browser', 'os', 'conversations', 'firstSeen', 'lastSeen', 'hasEmail', 'status'],
  },
  operator: {
    type: String,
    required: true,
    enum: ['is', 'is_not', 'gte', 'lte', 'eq', 'before', 'after', 'within', 'yes', 'no'],
  },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
}, { _id: false });

const segmentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  color: { type: String, default: '#6C63FF' },
  filters: [segmentFilterSchema],
  websiteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Website', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Segment', segmentSchema);
