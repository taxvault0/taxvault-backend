const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../../shared/middleware/auth.middleware');
const { upload, processImage, cleanup } = require('../../shared/middleware/upload.middleware');
const documentController = require('./document.controller');
const documentRequestController = require('./document-request.controller');

router.use(protect);

// Document routes
router.get('/', documentController.getMyDocuments);
router.get('/:id', documentController.getDocumentById);

router.post(
  '/upload',
  upload.single('file'),
  processImage,
  documentController.uploadDocument,
  cleanup
);

router.patch(
  '/:id/review',
  authorize('ca', 'admin'),
  documentController.reviewDocument
);

router.delete('/:id', documentController.deleteDocument);

// Document request routes
router.post(
  '/requests',
  authorize('ca', 'admin'),
  documentRequestController.createDocumentRequest
);

router.get(
  '/requests/case/:taxCaseId',
  documentRequestController.getRequestsForCase
);

router.post(
  '/requests/:requestId/submit',
  authorize('user', 'client', 'admin'),
  documentRequestController.submitRequestedDocument
);

router.patch(
  '/requests/:requestId/review',
  authorize('ca', 'admin'),
  documentRequestController.reviewRequestedDocument
);

module.exports = router;













