const express = require('express');
const router = express.Router();

const { protect } = require('../../shared/middleware/auth.middleware');
const {
  saveOnboarding,
  getOnboarding
} = require('./onboarding.controller');

const { validate } = require('../../shared/middleware/validation.middleware');
const { onboardingValidator } = require('./onboarding.validator');

router.get('/', protect, getOnboarding);

router.put(
  '/',
  protect,
  validate(onboardingValidator),
  saveOnboarding
);

module.exports = router;













