const BotRule = require('../models/BotRule');

/**
 * Rule-based bot engine
 * Checks visitor message against all active rules for the website
 * Returns the best matching response or null if no match
 */
const getResponse = async (websiteId, message) => {
  try {
    const rules = await BotRule.find({
      websiteId,
      isActive: true,
    }).sort({ priority: -1 });

    if (!rules.length) return getDefaultResponse(message);

    const lowerMessage = message.toLowerCase().trim();

    for (const rule of rules) {
      for (const trigger of rule.triggers) {
        const lowerTrigger = trigger.toLowerCase().trim();
        let matched = false;

        switch (rule.matchType) {
          case 'exact':
            matched = lowerMessage === lowerTrigger;
            break;
          case 'startsWith':
            matched = lowerMessage.startsWith(lowerTrigger);
            break;
          case 'contains':
          default:
            matched = lowerMessage.includes(lowerTrigger);
            break;
        }

        if (matched) {
          // Increment trigger count
          await BotRule.findByIdAndUpdate(rule._id, { $inc: { triggerCount: 1 } });
          return rule.response;
        }
      }
    }

    return getDefaultResponse(message);
  } catch (error) {
    console.error('Bot engine error:', error);
    return null;
  }
};

/**
 * Default responses for common questions
 */
const getDefaultResponse = (message) => {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return "Hello! 👋 How can I help you today?";
  }
  if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('pricing')) {
    return "For pricing information, please contact our team directly. An agent will be with you shortly! 💰";
  }
  if (lowerMessage.includes('help')) {
    return "I'm here to help! Please describe your issue and our team will assist you as soon as possible. ✨";
  }
  if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
    return "You're welcome! 😊 Is there anything else I can help you with?";
  }
  if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
    return "Goodbye! 👋 Feel free to reach out if you need anything else!";
  }

  // No match - hand off to human
  return "Thanks for your message! 🤖 I'm connecting you with a human agent who will help you shortly. Please wait...";
};

module.exports = { getResponse };
