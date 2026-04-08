const { body } = require('express-validator');

const familyStatuses = ['single', 'married', 'common_law', 'separated', 'divorced', 'widowed'];
const profileTypes = ['primary', 'spouse', 'household'];

const personalDetailsValidators = [
  body('dob').isISO8601().withMessage('Valid date of birth is required'),
  body('familyStatus').isIn(familyStatuses).withMessage('Invalid family status'),
  body('numberOfDependents').optional().isInt({ min: 0 }).withMessage('Dependents must be 0 or greater'),
  body('postalCode')
    .matches(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/)
    .withMessage('Postal code must be in Canadian format'),
  body('province').notEmpty().withMessage('Province is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('spouse').custom((spouse, { req }) => {
    if (['married', 'common_law'].includes(req.body.familyStatus)) {
      if (!spouse || !spouse.fullName || !spouse.dob) {
        throw new Error('Spouse details are required for married/common_law status');
      }
    }
    return true;
  }),
];

const employmentValidators = [
  body('primaryTaxpayer.isUnemployed').optional().isBoolean(),
  body('spouseTaxDetails.isUnemployed').optional().isBoolean(),
  body('primaryTaxpayer.employmentItems').optional().isArray(),
  body('spouseTaxDetails.employmentItems').optional().isArray(),
];

const additionalIncomeValidators = [
  body('additionalIncomes').isArray().withMessage('additionalIncomes must be an array'),
  body('additionalIncomes.*.profileType').isIn(['primary', 'spouse']).withMessage('Invalid profile type'),
  body('additionalIncomes.*.incomeType').notEmpty().withMessage('incomeType is required'),
];

const deductionValidators = [
  body('deductions').optional().isArray(),
  body('deductions.*.profileType').optional().isIn(profileTypes),
  body('receiptTypes').optional().isArray(),
  body('receiptTypes.*.profileType').optional().isIn(profileTypes),
];

const vehicleValidators = [
  body('vehicles').isArray().withMessage('vehicles must be an array'),
  body('vehicles.*.vehicleOwner').isIn(['primary', 'spouse', 'joint']),
  body('vehicles.*.purchaseDate').isISO8601(),
  body('vehicles.*.purchasePrice').isFloat({ min: 0 }),
];

module.exports = {
  personalDetailsValidators,
  employmentValidators,
  additionalIncomeValidators,
  deductionValidators,
  vehicleValidators,
};
