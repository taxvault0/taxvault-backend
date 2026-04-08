const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const {
  saveOnboarding,
  getOnboarding
} = require('../controllers/onboarding.controller');

const { validate } = require('../middleware/validation');
const { onboardingValidator } = require('../validators/onboarding.validator');

router.get('/', protect, getOnboarding);

router.put(
  '/',
  protect,
  validate(onboardingValidator),
  saveOnboarding
);

module.exports = router;