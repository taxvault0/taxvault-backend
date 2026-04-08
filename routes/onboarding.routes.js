const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const {
  personalDetailsValidators,
  employmentValidators,
  additionalIncomeValidators,
  deductionValidators,
  vehicleValidators,
} = require('../validators/onboarding.validator');
const {
  saveOnboarding,
  getOnboarding,
  savePersonalDetailsHandler,
  saveEmploymentHandler,
  saveAdditionalIncomeHandler,
  saveDeductionsHandler,
  saveVehiclesHandler,
  saveConsentsHandler,
} = require('../controllers/onboarding.controller');

router.get('/', protect, getOnboarding);
router.put('/', protect, saveOnboarding);

router.post('/personal-details', protect, validate(personalDetailsValidators), savePersonalDetailsHandler);
router.post('/employment', protect, validate(employmentValidators), saveEmploymentHandler);
router.post('/additional-income', protect, validate(additionalIncomeValidators), saveAdditionalIncomeHandler);
router.post('/deductions', protect, validate(deductionValidators), saveDeductionsHandler);
router.post('/vehicles', protect, validate(vehicleValidators), saveVehiclesHandler);
router.post('/consents', protect, saveConsentsHandler);

module.exports = router;
