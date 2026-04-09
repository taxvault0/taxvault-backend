const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../../shared/middleware/auth.middleware');
const documentRequestController = require('./document-request.controller');

router.use(protect);

router.post('/', authorize('ca', 'admin'), documentRequestController.createDocumentRequest);
router.get('/case/:taxCaseId', documentRequestController.getRequestsForCase);
router.post('/:requestId/submit', authorize('user', 'admin'), documentRequestController.submitRequestedDocument);
router.patch('/:requestId/review', authorize('ca', 'admin'), documentRequestController.reviewRequestedDocument);

module.exports = router;












