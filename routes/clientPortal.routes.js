const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const clientPortalController = require('../controllers/clientPortalController');
const clientTaxProfileController = require('../controllers/clientTaxProfileController');

router.use(protect);
router.use(authorize('user', 'admin'));

// Client dashboard and case views
router.get('/dashboard', clientPortalController.getMyCaseDashboard);
router.get('/cases', clientPortalController.getMyCases);
router.get('/cases/:caseId', clientPortalController.getMyCaseById);
router.get('/checklist', clientPortalController.getMyChecklist);

// Tax profile
router.get('/tax-profile', clientTaxProfileController.getMyTaxProfile);
router.put('/tax-profile', clientTaxProfileController.upsertMyTaxProfile);

module.exports = router;