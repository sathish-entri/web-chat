const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Website = require('../models/Website');

// @desc    Get all conversations
// @route   GET /api/conversations
// @access  Private
const getConversations = async (req, res, next) => {
  try {
    const { websiteId, status, page = 1, limit = 20, search } = req.query;

    // Build filter - only show conversations for websites this user owns/manages
    const ownedWebsites = await Website.find({
      $or: [{ owner: req.user._id }, { agents: req.user._id }]
    }).select('_id');
    const websiteIds = ownedWebsites.map(w => w._id);

    let filter = { websiteId: { $in: websiteIds } };
    if (websiteId) filter.websiteId = websiteId;
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const conversations = await Conversation.find(filter)
      .populate('visitor', 'name email isOnline browser os currentPage location')
      .populate('assignedAgent', 'name avatar isOnline')
      .populate('websiteId', 'name settings')
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Conversation.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: conversations.length,
      total,
      pages: Math.ceil(total / limit),
      conversations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single conversation with messages
// @route   GET /api/conversations/:id
// @access  Private
const getConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('visitor', 'name email isOnline browser os currentPage location device ipAddress')
      .populate('assignedAgent', 'name email avatar isOnline')
      .populate('websiteId', 'name settings botEnabled');

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Mark agent-side unread as 0
    await Conversation.findByIdAndUpdate(req.params.id, { unreadCount: 0 });

    // Get messages
    const messages = await Message.find({ conversationId: req.params.id, isDeleted: false })
      .sort({ createdAt: 1 })
      .limit(100);

    // Mark messages as read
    await Message.updateMany(
      { conversationId: req.params.id, sender: 'visitor', isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.status(200).json({ success: true, conversation, messages });
  } catch (error) {
    next(error);
  }
};

// @desc    Send message (agent side)
// @route   POST /api/conversations/:id/messages
// @access  Private
const sendMessage = async (req, res, next) => {
  try {
    const { content, type = 'text', fileUrl, fileName, fileSize, mimeType } = req.body;

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const message = await Message.create({
      conversationId: conversation._id,
      sender: 'agent',
      senderId: req.user._id,
      senderModel: 'User',
      senderName: req.user.name,
      senderAvatar: req.user.avatar,
      content,
      type,
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      fileSize: fileSize || null,
      mimeType: mimeType || null,
    });

    // Update conversation
    await Conversation.findByIdAndUpdate(req.params.id, {
      lastMessage: content,
      lastMessageAt: new Date(),
      status: 'open',
      isBot: false,
      visitorUnreadCount: conversation.visitorUnreadCount + 1,
      firstResponseAt: conversation.firstResponseAt || new Date(),
    });

    // Update website stats
    await Website.findByIdAndUpdate(conversation.websiteId, { $inc: { totalMessages: 1 } });

    // Emit via socket (handled in socket service)
    const io = req.app.get('io');
    if (io) {
      io.to(`conv_${conversation._id}`).emit('message:receive', {
        message,
        conversationId: conversation._id,
      });
    }

    res.status(201).json({ success: true, message });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign conversation to agent
// @route   PUT /api/conversations/:id/assign
// @access  Private
const assignConversation = async (req, res, next) => {
  try {
    const { agentId } = req.body;
    const conversation = await Conversation.findByIdAndUpdate(
      req.params.id,
      { assignedAgent: agentId || null },
      { new: true }
    ).populate('assignedAgent', 'name avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(`conv_${conversation._id}`).emit('conversation:assigned', conversation);
    }

    res.status(200).json({ success: true, conversation });
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve conversation
// @route   PUT /api/conversations/:id/resolve
// @access  Private
const resolveConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved', resolvedAt: new Date() },
      { new: true }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`conv_${conversation._id}`).emit('conversation:resolved', { conversationId: conversation._id });
    }

    res.status(200).json({ success: true, message: 'Conversation resolved', conversation });
  } catch (error) {
    next(error);
  }
};

// @desc    Add internal note
// @route   POST /api/conversations/:id/notes
// @access  Private
const addNote = async (req, res, next) => {
  try {
    const { content } = req.body;
    const conversation = await Conversation.findByIdAndUpdate(
      req.params.id,
      { $push: { notes: { content, agentId: req.user._id } } },
      { new: true }
    );
    res.status(200).json({ success: true, conversation });
  } catch (error) {
    next(error);
  }
};

// @desc    Add tags to conversation
// @route   PUT /api/conversations/:id/tags
// @access  Private
const updateTags = async (req, res, next) => {
  try {
    const { tags } = req.body;
    const conversation = await Conversation.findByIdAndUpdate(
      req.params.id,
      { tags },
      { new: true }
    );
    res.status(200).json({ success: true, conversation });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete conversation
// @route   DELETE /api/conversations/:id
// @access  Private
const deleteConversation = async (req, res, next) => {
  try {
    await Message.deleteMany({ conversationId: req.params.id });
    await Conversation.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Conversation deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get more messages (pagination)
// @route   GET /api/conversations/:id/messages
// @access  Private
const getMessages = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ conversationId: req.params.id, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({ success: true, messages: messages.reverse() });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getConversations, getConversation, sendMessage, assignConversation,
  resolveConversation, addNote, updateTags, deleteConversation, getMessages
};
