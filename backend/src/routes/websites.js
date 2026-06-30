const express = require('express');
const router = express.Router();
const {
  getWebsites, getWebsite, createWebsite, updateWebsite, deleteWebsite,
  getWidgetCode, inviteAgent, removeAgent
} = require('../controllers/websiteController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getWebsites).post(createWebsite);
router.route('/:id').get(getWebsite).put(updateWebsite).delete(deleteWebsite);
router.get('/:id/widget-code', getWidgetCode);
router.post('/:id/agents', inviteAgent);
router.delete('/:id/agents/:agentId', removeAgent);

module.exports = router;
