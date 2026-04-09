const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const caRegistrationController = require('../controllers/caRegistrationController');
const { validate, caRegistrationValidators } = require('../middleware/validation');

// Save draft
// TEMP: validation removed for debugging req.body issues
router.post(
  '/save-draft',
  protect,
  caRegistrationController.saveDraft
);

// Submit registration
router.post(
  '/submit',
  protect,
  validate(caRegistrationValidators.submit),
  caRegistrationController.submitRegistration
);

// Get current user's registration
router.get('/me', protect, caRegistrationController.getMyRegistration);

// Dashboard data
router.get('/dashboard', protect, caRegistrationController.getDashboardSummary);

module.exports = router;