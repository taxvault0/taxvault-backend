const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../../shared/middleware/auth.middleware');
const caController = require('./ca.controller');
const caDirectoryController = require('./ca-directory.controller');
const caCaseController = require('./ca-case.controller');

// Public routes
router.get('/search', caDirectoryController.searchCAs);
router.get('/profile/:id', caDirectoryController.getCAProfile);

// CA profile routes
router.post('/profile', protect, authorize('ca'), caController.createOrUpdateProfile);
router.put('/toggle-status', protect, authorize('ca'), caController.toggleAcceptingStatus);
router.get('/dashboard/stats', protect, authorize('ca'), caController.getCADashboardStats);

// CA case workflow routes
router.get(
  '/assigned-clients',
  protect,
  authorize('ca', 'admin'),
  caCaseController.getAssignedClientsOverview
);

router.get(
  '/cases/:taxCaseId/dashboard',
  protect,
  authorize('ca', 'admin'),
  caCaseController.getCaseDashboard
);

router.get(
  '/review-queue',
  protect,
  authorize('ca', 'admin'),
  caCaseController.getPendingReviewQueue
);

// User ↔ CA connection routes
router.post('/connect', protect, caController.requestConnection);
router.patch(
  '/connections/:connectionId/respond',
  protect,
  authorize('ca', 'admin'),
  caController.respondToConnectionRequest
);

module.exports = router;