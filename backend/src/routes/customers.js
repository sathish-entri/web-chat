const express = require('express');
const router = express.Router();
const {
  getCustomers,
  getCustomerStats,
  getCustomerProfile,
  previewSegment,
  getSegments,
  createSegment,
  deleteSegment,
  getSegmentCustomers,
} = require('../controllers/customerController');
const { protect } = require('../middleware/auth');

router.use(protect);

// Customer routes
router.get('/',             getCustomers);
router.get('/stats',        getCustomerStats);
router.get('/:id',          getCustomerProfile);
router.post('/segment-preview', previewSegment);

// Segment routes
router.get('/segments/all',           getSegments);
router.post('/segments',              createSegment);
router.delete('/segments/:id',        deleteSegment);
router.get('/segments/:id/customers', getSegmentCustomers);

module.exports = router;
