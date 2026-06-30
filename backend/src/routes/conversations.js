const express = require('express');
const router = express.Router();
const {
  getConversations, getConversation, sendMessage, assignConversation,
  resolveConversation, addNote, updateTags, deleteConversation, getMessages
} = require('../controllers/conversationController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getConversations);
router.get('/:id', getConversation);
router.delete('/:id', deleteConversation);
router.put('/:id/assign', assignConversation);
router.put('/:id/resolve', resolveConversation);
router.post('/:id/notes', addNote);
router.put('/:id/tags', updateTags);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', sendMessage);

module.exports = router;
