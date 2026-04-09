const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../../shared/middleware/auth.middleware');
const taxCaseController = require('./tax-case.controller');
const documentRequestController = require('../documents/document-request.controller');

// Tax cases
router.post('/', protect, authorize('ca', 'admin'), taxCaseController.createTaxCase);
router.get('/', protect, taxCaseController.getMyCases);
router.get('/:id', protect, taxCaseController.getTaxCaseById);

// Status routes
router.patch('/:id/status', protect, authorize('ca', 'admin'), taxCaseController.updateTaxCaseStatus);
router.patch(
  '/:taxCaseId/manual-status',
  protect,
  authorize('ca', 'admin'),
  taxCaseController.updateTaxCaseStatusManually
);

// Notes on tax case
router.post('/:id/notes', protect, taxCaseController.addCaseNote);

// Document requests
router.post(
  '/document-requests',
  protect,
  authorize('ca', 'admin'),
  documentRequestController.createDocumentRequest
);

router.get(
  '/:taxCaseId/document-requests',
  protect,
  documentRequestController.getRequestsForCase
);

router.post(
  '/document-requests/:requestId/submit',
  protect,
  authorize('user', 'admin'),
  documentRequestController.submitRequestedDocument
);

router.patch(
  '/document-requests/:requestId/review',
  protect,
  authorize('ca', 'admin'),
  documentRequestController.reviewRequestedDocument
);

module.exports = router;













