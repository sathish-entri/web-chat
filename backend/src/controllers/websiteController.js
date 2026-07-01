const Website = require('../models/Website');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

// @desc    Get all websites for logged-in user
// @route   GET /api/websites
// @access  Private
const getWebsites = async (req, res, next) => {
  try {
    let websites;
    if (req.user.role === 'owner' || req.user.role === 'admin') {
      websites = await Website.find({ owner: req.user._id }).populate('agents', 'name email avatar isOnline');
    } else {
      // agent - can see websites they are assigned to
      websites = await Website.find({ agents: req.user._id }).populate('agents', 'name email avatar isOnline');
    }
    res.status(200).json({ success: true, count: websites.length, websites });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single website
// @route   GET /api/websites/:id
// @access  Private
const getWebsite = async (req, res, next) => {
  try {
    const website = await Website.findById(req.params.id).populate('agents', 'name email avatar isOnline role');
    if (!website) {
      return res.status(404).json({ success: false, message: 'Website not found' });
    }
    if (website.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.status(200).json({ success: true, website });
  } catch (error) {
    next(error);
  }
};

// @desc    Create website
// @route   POST /api/websites
// @access  Private (owner)
const createWebsite = async (req, res, next) => {
  try {
    const { name, domain, settings, botEnabled } = req.body;
    const widgetId = uuidv4();

    const website = await Website.create({
      owner: req.user._id,
      name,
      domain: domain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
      widgetId,
      settings: settings || {},
      botEnabled: botEnabled !== undefined ? botEnabled : true,
    });

    // Add website to user's websites
    await User.findByIdAndUpdate(req.user._id, { $push: { websites: website._id } });

    res.status(201).json({ success: true, message: 'Website created successfully', website });
  } catch (error) {
    next(error);
  }
};

// @desc    Update website
// @route   PUT /api/websites/:id
// @access  Private (owner)
const updateWebsite = async (req, res, next) => {
  try {
    let website = await Website.findById(req.params.id);
    if (!website) {
      return res.status(404).json({ success: false, message: 'Website not found' });
    }
    if (website.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    website = await Website.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, message: 'Website updated', website });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete website
// @route   DELETE /api/websites/:id
// @access  Private (owner)
const deleteWebsite = async (req, res, next) => {
  try {
    const website = await Website.findById(req.params.id);
    if (!website) {
      return res.status(404).json({ success: false, message: 'Website not found' });
    }
    if (website.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await website.deleteOne();
    await User.findByIdAndUpdate(req.user._id, { $pull: { websites: website._id } });

    res.status(200).json({ success: true, message: 'Website deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get widget embed code
// @route   GET /api/websites/:id/widget-code
// @access  Private (owner)
const getWidgetCode = async (req, res, next) => {
  try {
    const website = await Website.findById(req.params.id);
    if (!website) {
      return res.status(404).json({ success: false, message: 'Website not found' });
    }
    if (website.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const widgetUrl = process.env.WIDGET_URL || `${req.protocol}://${req.get('host')}`;
    const embedCode = `<!-- WebChat Widget -->
<script>
  window.WebChatConfig = { widgetId: '${website.widgetId}' };
</script>
<script src="${widgetUrl}/widget/widget.js" async defer></script>`;

    res.status(200).json({ success: true, embedCode, widgetId: website.widgetId });
  } catch (error) {
    next(error);
  }
};

// @desc    Invite agent to website
// @route   POST /api/websites/:id/agents
// @access  Private (owner)
const inviteAgent = async (req, res, next) => {
  try {
    const { email, name } = req.body;
    const website = await Website.findById(req.params.id);
    if (!website) {
      return res.status(404).json({ success: false, message: 'Website not found' });
    }
    if (website.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Check if user already exists
    let agent = await User.findOne({ email });
    if (!agent) {
      // Create agent account with temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      agent = await User.create({
        name: name || email.split('@')[0],
        email,
        password: tempPassword,
        role: 'agent',
        ownerId: req.user._id,
      });
    }

    if (!website.agents.includes(agent._id)) {
      website.agents.push(agent._id);
      await website.save();
    }

    res.status(200).json({ success: true, message: 'Agent invited successfully', agent: { _id: agent._id, name: agent.name, email: agent.email } });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove agent from website
// @route   DELETE /api/websites/:id/agents/:agentId
// @access  Private (owner)
const removeAgent = async (req, res, next) => {
  try {
    const website = await Website.findById(req.params.id);
    if (!website) {
      return res.status(404).json({ success: false, message: 'Website not found' });
    }
    if (website.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    website.agents = website.agents.filter(a => a.toString() !== req.params.agentId);
    await website.save();

    res.status(200).json({ success: true, message: 'Agent removed' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getWebsites, getWebsite, createWebsite, updateWebsite, deleteWebsite, getWidgetCode, inviteAgent, removeAgent };
