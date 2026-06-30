const BotRule = require('../models/BotRule');
const CannedResponse = require('../models/CannedResponse');

// --- BOT RULES ---

// @desc    Get bot rules
// @route   GET /api/bot-rules?websiteId=xxx
// @access  Private
const getBotRules = async (req, res, next) => {
  try {
    const { websiteId } = req.query;
    const rules = await BotRule.find({ websiteId }).sort({ priority: -1, createdAt: -1 });
    res.status(200).json({ success: true, count: rules.length, rules });
  } catch (error) {
    next(error);
  }
};

// @desc    Create bot rule
// @route   POST /api/bot-rules
// @access  Private
const createBotRule = async (req, res, next) => {
  try {
    const { websiteId, name, triggers, response, matchType, priority } = req.body;
    const rule = await BotRule.create({ websiteId, name, triggers, response, matchType, priority });
    res.status(201).json({ success: true, rule });
  } catch (error) {
    next(error);
  }
};

// @desc    Update bot rule
// @route   PUT /api/bot-rules/:id
// @access  Private
const updateBotRule = async (req, res, next) => {
  try {
    const rule = await BotRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
    res.status(200).json({ success: true, rule });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete bot rule
// @route   DELETE /api/bot-rules/:id
// @access  Private
const deleteBotRule = async (req, res, next) => {
  try {
    await BotRule.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Rule deleted' });
  } catch (error) {
    next(error);
  }
};

// --- CANNED RESPONSES ---

const getCannedResponses = async (req, res, next) => {
  try {
    const { websiteId } = req.query;
    const responses = await CannedResponse.find({ websiteId, isActive: true });
    res.status(200).json({ success: true, responses });
  } catch (error) {
    next(error);
  }
};

const createCannedResponse = async (req, res, next) => {
  try {
    const { websiteId, shortcut, content } = req.body;
    const response = await CannedResponse.create({ websiteId, shortcut, content, createdBy: req.user._id });
    res.status(201).json({ success: true, response });
  } catch (error) {
    next(error);
  }
};

const deleteCannedResponse = async (req, res, next) => {
  try {
    await CannedResponse.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Canned response deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBotRules, createBotRule, updateBotRule, deleteBotRule,
  getCannedResponses, createCannedResponse, deleteCannedResponse
};
