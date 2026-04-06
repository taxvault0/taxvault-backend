const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const caDirectoryController = require('../controllers/caDirectoryController');
const caCaseController = require('../controllers/caCaseController');

// =====================
// Public routes
// =====================
router.get('/search', caDirectoryController.searchCAs);
router.get('/profile/:id', caDirectoryController.getCAProfile);

// =====================
// CA-only routes
// =====================
router.post(
  '/profile',
  protect,
  authorize('ca'),
  caDirectoryController.createOrUpdateProfile
);

router.put(
  '/toggle-status',
  protect,
  authorize('ca'),
  caDirectoryController.toggleAcceptingStatus
);

router.get(
  '/dashboard/stats',
  protect,
  authorize('ca'),
  caDirectoryController.getCADashboardStats
);

// =====================
// CA Case Workflow routes
// =====================
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

// =====================
// User to CA connection
// =====================
router.post('/connect', protect, caDirectoryController.requestConnection);

router.patch(
  '/connections/:connectionId/respond',
  protect,
  authorize('ca', 'admin'),
  caDirectoryController.respondToConnectionRequest
);

module.exports = router;