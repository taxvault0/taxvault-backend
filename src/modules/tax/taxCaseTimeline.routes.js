const express = require('express');
const router = express.Router();

const { protect } = require('../../shared/middleware/auth.middleware');
const taxCaseTimelineController = require('./tax-case-timeline.controller');

router.use(protect);

router.get('/:taxCaseId', taxCaseTimelineController.getTaxCaseTimeline);

module.exports = router;













