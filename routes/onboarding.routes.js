const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    saveOnboarding,
    getOnboarding
} = require('../controllers/onboarding.controller');

router.get('/', protect, getOnboarding);
router.put('/', protect, saveOnboarding);

module.exports = router;