const express = require('express');
const router = express.Router();

const { protect } = require('../../shared/middleware/auth.middleware');
const caRegistrationController = require('./ca-registration.controller');
const {
  validate,
  caRegistrationValidators
} = require('../../shared/middleware/validation.middleware');

// Save draft
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