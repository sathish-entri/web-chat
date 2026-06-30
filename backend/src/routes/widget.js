const express = require('express');
const router = express.Router();
const { getWidgetConfig, startConversation, sendWidgetMessage } = require('../controllers/widgetController');

// Public routes - no auth needed (used by widget)
router.get('/:widgetId/config', getWidgetConfig);
router.post('/:widgetId/conversations', startConversation);
router.post('/:widgetId/conversations/:convId/messages', sendWidgetMessage);

module.exports = router;
