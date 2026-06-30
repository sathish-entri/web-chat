const express = require('express');
const router = express.Router();
const { getOverview, getVisitorStats } = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/overview', getOverview);
router.get('/visitors', getVisitorStats);

module.exports = router;
