const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const caDirectoryController = require('../controllers/caDirectoryController');

// Public search routes
router.get('/search', caDirectoryController.searchCAs);
router.get('/:id', caDirectoryController.getCAProfile);

// Protected CA routes
router.post('/profile', protect, authorize('ca'), caDirectoryController.createOrUpdateProfile);
router.put('/toggle-status', protect, authorize('ca'), caDirectoryController.toggleAcceptingStatus);
router.get('/dashboard/stats', protect, authorize('ca'), caDirectoryController.getCADashboardStats);

// Connection routes
router.post('/connect', protect, caDirectoryController.requestConnection);

module.exports = router;