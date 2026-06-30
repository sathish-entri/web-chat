const Website = require('../models/Website');
const Visitor = require('../models/Visitor');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const BotRule = require('../models/BotRule');
const { v4: uuidv4 } = require('uuid');
const botEngine = require('../services/botEngine');

// @desc    Get widget config (public)
// @route   GET /api/widget/:widgetId/config
// @access  Public
const getWidgetConfig = async (req, res, next) => {
  try {
    const website = await Website.findOne({ widgetId: req.params.widgetId, isActive: true })
      .select('settings botEnabled name businessHours');
    if (!website) {
      return res.status(404).json({ success: false, message: 'Widget not found or inactive' });
    }
    res.status(200).json({ success: true, config: website });
  } catch (error) {
    next(error);
  }
};

// @desc    Start or resume conversation
// @route   POST /api/widget/:widgetId/conversations
// @access  Public
const startConversation = async (req, res, next) => {
  try {
    const { name, email, sessionId, currentPage, browser, os, device } = req.body;

    const website = await Website.findOne({ widgetId: req.params.widgetId, isActive: true });
    if (!website) {
      return res.status(404).json({ success: false, message: 'Widget not found' });
    }

    // Find or create visitor
    let visitor = await Visitor.findOne({ sessionId, websiteId: website._id });
    if (!visitor) {
      visitor = await Visitor.create({
        websiteId: website._id,
        name: name || 'Anonymous',
        email: email || '',
        sessionId: sessionId || uuidv4(),
        currentPage: currentPage || '',
        browser: browser || '',
        os: os || '',
        device: device || '',
        ipAddress: req.ip || '',
        isOnline: true,
      });
    } else {
      // Update visitor info
      visitor.name = name || visitor.name;
      visitor.email = email || visitor.email;
      visitor.currentPage = currentPage || visitor.currentPage;
      visitor.isOnline = true;
      visitor.lastSeen = new Date();
      await visitor.save();
    }

    // Find or create conversation
    let conversation = await Conversation.findOne({
      visitor: visitor._id,
      websiteId: website._id,
      status: { $ne: 'resolved' }
    }).sort({ createdAt: -1 });

    if (!conversation) {
      conversation = await Conversation.create({
        websiteId: website._id,
        visitor: visitor._id,
        status: website.botEnabled ? 'bot' : 'open',
        isBot: website.botEnabled,
      });
      await Website.findByIdAndUpdate(website._id, { $inc: { totalConversations: 1 } });

      // Send welcome message
      const welcomeMessage = await Message.create({
        conversationId: conversation._id,
        sender: website.botEnabled ? 'bot' : 'agent',
        senderName: website.botEnabled ? website.settings.botName : website.settings.agentName,
        content: website.settings.welcomeMessage || 'Hi! How can we help you today?',
        type: 'text',
      });
    }

    // Get message history
    const messages = await Message.find({ conversationId: conversation._id, isDeleted: false })
      .sort({ createdAt: 1 }).limit(50);

    res.status(200).json({
      success: true,
      conversation,
      visitor,
      messages,
      websiteSettings: website.settings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send message from widget (visitor)
// @route   POST /api/widget/:widgetId/conversations/:convId/messages
// @access  Public
const sendWidgetMessage = async (req, res, next) => {
  try {
    const { content, type = 'text', sessionId, fileUrl, fileName, fileSize, mimeType } = req.body;

    const conversation = await Conversation.findById(req.params.convId).populate('websiteId');
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const visitor = await Visitor.findOne({ sessionId });
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor session not found' });
    }

    // Save visitor message
    const visitorMessage = await Message.create({
      conversationId: conversation._id,
      sender: 'visitor',
      senderId: visitor._id,
      senderName: visitor.name,
      content,
      type,
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      fileSize: fileSize || null,
      mimeType: mimeType || null,
    });

    // Update conversation
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: content,
      lastMessageAt: new Date(),
      $inc: { unreadCount: 1 },
    });

    await Website.findByIdAndUpdate(conversation.websiteId._id, { $inc: { totalMessages: 1 } });

    // Emit to portal agents
    const io = req.app.get('io');
    if (io) {
      io.to(`website_${conversation.websiteId._id}`).emit('message:receive', {
        message: visitorMessage,
        conversationId: conversation._id,
      });
      io.to(`website_${conversation.websiteId._id}`).emit('conversation:updated', {
        conversationId: conversation._id,
        lastMessage: content,
        lastMessageAt: new Date(),
        unreadCount: conversation.unreadCount + 1,
      });
    }

    let botMessage = null;

    // Bot response if bot is enabled and conversation is in bot mode
    if (conversation.isBot && conversation.websiteId.botEnabled) {
      const botResponse = await botEngine.getResponse(
        conversation.websiteId._id,
        content
      );

      if (botResponse) {
        botMessage = await Message.create({
          conversationId: conversation._id,
          sender: 'bot',
          senderName: conversation.websiteId.settings.botName || 'Support Bot',
          content: botResponse,
          type: 'text',
        });

        await Conversation.findByIdAndUpdate(conversation._id, {
          lastMessage: botResponse,
          lastMessageAt: new Date(),
          $inc: { visitorUnreadCount: 1 },
        });

        // Emit bot message to widget
        if (io) {
          io.to(`conv_${conversation._id}`).emit('message:receive', {
            message: botMessage,
            conversationId: conversation._id,
          });
        }
      }
    }

    res.status(201).json({ success: true, message: visitorMessage, botMessage });
  } catch (error) {
    next(error);
  }
};

module.exports = { getWidgetConfig, startConversation, sendWidgetMessage };
