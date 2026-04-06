const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const taxCaseTimelineController = require('../controllers/taxCaseTimelineController');

router.use(protect);

router.get('/:taxCaseId', taxCaseTimelineController.getTaxCaseTimeline);

module.exports = router;