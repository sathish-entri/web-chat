const Visitor = require('../models/Visitor');
const Conversation = require('../models/Conversation');
const Website = require('../models/Website');
const Segment = require('../models/Segment');

// ── Helper: build MongoDB query from segment filters ──────────────────────────
const buildVisitorQuery = (filters, websiteIds) => {
  const query = { websiteId: { $in: websiteIds } };
  if (!filters || !filters.length) return query;

  for (const f of filters) {
    switch (f.field) {
      case 'country':
        if (f.operator === 'is')     query['location.country'] = f.value;
        if (f.operator === 'is_not') query['location.country'] = { $ne: f.value };
        break;
      case 'browser':
        if (f.operator === 'is')     query.browser = f.value;
        if (f.operator === 'is_not') query.browser = { $ne: f.value };
        break;
      case 'os':
        if (f.operator === 'is')     query.os = f.value;
        if (f.operator === 'is_not') query.os = { $ne: f.value };
        break;
      case 'hasEmail':
        if (f.operator === 'yes') query.email = { $exists: true, $ne: '' };
        if (f.operator === 'no')  query.$or = [{ email: { $exists: false } }, { email: '' }];
        break;
      case 'firstSeen':
        if (f.operator === 'within') {
          const days = parseInt(f.value);
          query.createdAt = { $gte: new Date(Date.now() - days * 86400000) };
        }
        if (f.operator === 'before') query.createdAt = { $lt: new Date(f.value) };
        if (f.operator === 'after')  query.createdAt = { $gt: new Date(f.value) };
        break;
      case 'lastSeen':
        if (f.operator === 'within') {
          const days = parseInt(f.value);
          query.lastSeen = { $gte: new Date(Date.now() - days * 86400000) };
        }
        if (f.operator === 'before') query.lastSeen = { $lt: new Date(f.value) };
        if (f.operator === 'after')  query.lastSeen  = { $gt: new Date(f.value) };
        break;
      default:
        break;
    }
  }
  return query;
};

// ── GET /api/customers ────────────────────────────────────────────────────────
exports.getCustomers = async (req, res) => {
  try {
    const websites = await Website.find({ owner: req.user._id }).select('_id');
    const websiteIds = websites.map(w => w._id);

    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const skip   = (page - 1) * limit;

    // Base query
    const query = buildVisitorQuery([], websiteIds);
    if (search) {
      query.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [visitors, total] = await Promise.all([
      Visitor.find(query).sort({ lastSeen: -1 }).skip(skip).limit(limit).lean(),
      Visitor.countDocuments(query),
    ]);

    // Enrich each visitor with conversation count
    const visitorIds = visitors.map(v => v._id);
    const convCounts = await Conversation.aggregate([
      { $match: { 'visitor': { $in: visitorIds } } },
      { $group: { _id: '$visitor', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    convCounts.forEach(c => { countMap[c._id.toString()] = c.count; });

    const enriched = visitors.map(v => ({
      ...v,
      conversationCount: countMap[v._id.toString()] || 0,
    }));

    res.json({ customers: enriched, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/customers/stats ──────────────────────────────────────────────────
exports.getCustomerStats = async (req, res) => {
  try {
    const websites = await Website.find({ owner: req.user._id }).select('_id');
    const websiteIds = websites.map(w => w._id);

    const now       = new Date();
    const weekAgo   = new Date(now - 7 * 86400000);
    const monthAgo  = new Date(now - 30 * 86400000);

    const [
      total,
      newThisWeek,
      newThisMonth,
      countryData,
      browserData,
      osData,
      dailyNew,
      returning,
    ] = await Promise.all([
      Visitor.countDocuments({ websiteId: { $in: websiteIds } }),
      Visitor.countDocuments({ websiteId: { $in: websiteIds }, createdAt: { $gte: weekAgo } }),
      Visitor.countDocuments({ websiteId: { $in: websiteIds }, createdAt: { $gte: monthAgo } }),
      // Top countries
      Visitor.aggregate([
        { $match: { websiteId: { $in: websiteIds } } },
        { $group: { _id: '$location.country', count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 6 },
      ]),
      // Browser breakdown
      Visitor.aggregate([
        { $match: { websiteId: { $in: websiteIds } } },
        { $group: { _id: '$browser', count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 6 },
      ]),
      // OS breakdown
      Visitor.aggregate([
        { $match: { websiteId: { $in: websiteIds } } },
        { $group: { _id: '$os', count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 6 },
      ]),
      // New customers per day (last 30 days)
      Visitor.aggregate([
        { $match: { websiteId: { $in: websiteIds }, createdAt: { $gte: monthAgo } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        }},
        { $sort: { _id: 1 } },
      ]),
      // Returning customers (with >1 conversation)
      Conversation.aggregate([
        { $match: { websiteId: { $in: websiteIds } } },
        { $group: { _id: '$visitor', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $count: 'total' },
      ]),
    ]);

    res.json({
      total,
      newThisWeek,
      newThisMonth,
      returning: returning[0]?.total || 0,
      countryData:  countryData.map(d => ({ name: d._id || 'Unknown', value: d.count })),
      browserData:  browserData.map(d => ({ name: d._id || 'Unknown', value: d.count })),
      osData:       osData.map(d => ({ name: d._id || 'Unknown', value: d.count })),
      dailyNew:     dailyNew.map(d => ({ date: d._id, count: d.count })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/customers/:id ────────────────────────────────────────────────────
exports.getCustomerProfile = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id).lean();
    if (!visitor) return res.status(404).json({ message: 'Customer not found' });

    const conversations = await Conversation.find({ visitor: visitor._id })
      .sort({ createdAt: -1 })
      .select('status createdAt updatedAt lastMessage lastMessageAt')
      .lean();

    res.json({ customer: { ...visitor, conversations } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/customers/segment-preview ──────────────────────────────────────
exports.previewSegment = async (req, res) => {
  try {
    const websites = await Website.find({ owner: req.user._id }).select('_id');
    const websiteIds = websites.map(w => w._id);
    const { filters } = req.body;
    const query = buildVisitorQuery(filters || [], websiteIds);
    const count = await Visitor.countDocuments(query);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/segments ─────────────────────────────────────────────────────────
exports.getSegments = async (req, res) => {
  try {
    const websites = await Website.find({ owner: req.user._id }).select('_id');
    const websiteIds = websites.map(w => w._id);
    const segments = await Segment.find({ websiteId: { $in: websiteIds } }).sort({ createdAt: -1 });
    res.json({ segments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/segments ────────────────────────────────────────────────────────
exports.createSegment = async (req, res) => {
  try {
    const { name, description, color, filters, websiteId } = req.body;
    const segment = await Segment.create({
      name, description, color: color || '#6C63FF',
      filters: filters || [], websiteId, createdBy: req.user._id,
    });
    res.status(201).json({ segment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── DELETE /api/segments/:id ──────────────────────────────────────────────────
exports.deleteSegment = async (req, res) => {
  try {
    await Segment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Segment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/segments/:id/customers ──────────────────────────────────────────
exports.getSegmentCustomers = async (req, res) => {
  try {
    const websites = await Website.find({ owner: req.user._id }).select('_id');
    const websiteIds = websites.map(w => w._id);
    const segment = await Segment.findById(req.params.id);
    if (!segment) return res.status(404).json({ message: 'Segment not found' });

    const query = buildVisitorQuery(segment.filters, websiteIds);
    const visitors = await Visitor.find(query).sort({ lastSeen: -1 }).lean();

    const visitorIds = visitors.map(v => v._id);
    const convCounts = await Conversation.aggregate([
      { $match: { visitor: { $in: visitorIds } } },
      { $group: { _id: '$visitor', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    convCounts.forEach(c => { countMap[c._id.toString()] = c.count; });

    const customers = visitors.map(v => ({ ...v, conversationCount: countMap[v._id.toString()] || 0 }));
    res.json({ customers, total: customers.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
