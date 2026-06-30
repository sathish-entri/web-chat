const express = require('express');
const router = express.Router();
const {
  getBotRules, createBotRule, updateBotRule, deleteBotRule,
  getCannedResponses, createCannedResponse, deleteCannedResponse
} = require('../controllers/botController');
const { protect } = require('../middleware/auth');

router.use(protect);

// Bot rules
router.route('/rules').get(getBotRules).post(createBotRule);
router.route('/rules/:id').put(updateBotRule).delete(deleteBotRule);

// Canned responses
router.route('/canned').get(getCannedResponses).post(createCannedResponse);
router.route('/canned/:id').delete(deleteCannedResponse);

module.exports = router;
