const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const documentRequestController = require('../controllers/documentRequestController');

router.use(protect);

// Dedicated document-request routes for direct frontend/API use.
// These complement the nested tax-case routes that already exist.
router.post('/', authorize('ca', 'admin'), documentRequestController.createDocumentRequest);
router.get('/case/:taxCaseId', documentRequestController.getRequestsForCase);
router.post('/:requestId/submit', authorize('user', 'admin'), documentRequestController.submitRequestedDocument);
router.patch('/:requestId/review', authorize('ca', 'admin'), documentRequestController.reviewRequestedDocument);

module.exports = router;