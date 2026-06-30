const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Website = require('../models/Website');
const Visitor = require('../models/Visitor');

// @desc    Get analytics overview
// @route   GET /api/analytics/overview?websiteId=xxx
// @access  Private
const getOverview = async (req, res, next) => {
  try {
    const { websiteId, period = '7d' } = req.query;

    const ownedWebsites = await Website.find({
      $or: [{ owner: req.user._id }, { agents: req.user._id }]
    }).select('_id totalConversations totalMessages');
    const websiteIds = ownedWebsites.map(w => w._id);

    const filter = { websiteId: { $in: websiteIds } };
    if (websiteId) filter.websiteId = websiteId;

    // Date range
    const days = period === '30d' ? 30 : period === '7d' ? 7 : 1;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalConversations,
      openConversations,
      resolvedConversations,
      totalMessages,
      recentConversations,
    ] = await Promise.all([
      Conversation.countDocuments(filter),
      Conversation.countDocuments({ ...filter, status: 'open' }),
      Conversation.countDocuments({ ...filter, status: 'resolved' }),
      Message.countDocuments({ conversationId: { $exists: true } }),
      Conversation.countDocuments({ ...filter, createdAt: { $gte: startDate } }),
    ]);

    // Avg response time (conversations with firstResponseAt)
    const responseTimes = await Conversation.find({
      ...filter,
      firstResponseAt: { $exists: true, $ne: null },
    }).select('createdAt firstResponseAt');

    let avgResponseTime = 0;
    if (responseTimes.length > 0) {
      const totalTime = responseTimes.reduce((sum, conv) => {
        return sum + (conv.firstResponseAt - conv.createdAt);
      }, 0);
      avgResponseTime = Math.round(totalTime / responseTimes.length / 1000 / 60); // minutes
    }

    // Messages per day (last 7 days)
    const messagesByDay = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          sender: { $in: ['visitor', 'agent'] },
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Conversations by status
    const byStatus = await Conversation.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      overview: {
        totalConversations,
        openConversations,
        resolvedConversations,
        totalMessages,
        recentConversations,
        avgResponseTime,
        messagesByDay,
        byStatus,
        websites: ownedWebsites,
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get visitor stats
// @route   GET /api/analytics/visitors
// @access  Private
const getVisitorStats = async (req, res, next) => {
  try {
    const { websiteId } = req.query;
    const ownedWebsites = await Website.find({ owner: req.user._id }).select('_id');
    const websiteIds = ownedWebsites.map(w => w._id);
    const filter = { websiteId: { $in: websiteIds } };
    if (websiteId) filter.websiteId = websiteId;

    const totalVisitors = await Visitor.countDocuments(filter);
    const onlineVisitors = await Visitor.countDocuments({ ...filter, isOnline: true });

    const browserStats = await Visitor.aggregate([
      { $match: filter },
      { $group: { _id: '$browser', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const locationStats = await Visitor.aggregate([
      { $match: { ...filter, 'location.country': { $ne: '' } } },
      { $group: { _id: '$location.country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      success: true,
      visitors: { totalVisitors, onlineVisitors, browserStats, locationStats }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getOverview, getVisitorStats };
