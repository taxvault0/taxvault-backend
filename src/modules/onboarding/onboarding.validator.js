const { body } = require('express-validator');

const PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];

const onboardingValidator = [
  body('address')
    .optional()
    .isObject()
    .withMessage('address must be an object'),

  body('address.street')
    .optional()
    .isString()
    .withMessage('address.street must be a string')
    .trim(),

  body('address.city')
    .optional()
    .isString()
    .withMessage('address.city must be a string')
    .trim(),

  body('address.province')
    .optional()
    .isIn(PROVINCES)
    .withMessage('address.province must be a valid Canadian province code'),

  body('address.postalCode')
    .optional()
    .isString()
    .withMessage('address.postalCode must be a string')
    .trim(),

  body('address.country')
    .optional()
    .isString()
    .withMessage('address.country must be a string')
    .trim(),

  body('employmentProfiles')
    .optional()
    .isArray()
    .withMessage('employmentProfiles must be an array'),

  body('employmentProfiles.*')
    .optional()
    .isString()
    .withMessage('each employmentProfiles value must be a string')
    .trim(),

  body('familyStatus')
    .optional()
    .isString()
    .withMessage('familyStatus must be a string')
    .trim(),

  body('numberOfDependents')
    .optional()
    .isInt({ min: 0 })
    .withMessage('numberOfDependents must be a non-negative integer')
    .toInt(),

  body('spouse')
    .optional()
    .isObject()
    .withMessage('spouse must be an object'),

  body('spouse.name')
    .optional()
    .isString()
    .withMessage('spouse.name must be a string')
    .trim(),

  body('spouse.dob')
    .optional()
    .isString()
    .withMessage('spouse.dob must be a string')
    .trim(),

  body('spouse.sin')
    .optional()
    .isString()
    .withMessage('spouse.sin must be a string')
    .trim(),

  body('spouse.phone')
    .optional()
    .isString()
    .withMessage('spouse.phone must be a string')
    .trim(),

  body('spouse.gigPlatforms')
    .optional()
    .isArray()
    .withMessage('spouse.gigPlatforms must be an array'),

  body('spouse.gigPlatforms.*')
    .optional()
    .isString()
    .withMessage('each spouse.gigPlatforms value must be a string')
    .trim(),

  body('spouse.additionalIncomeSources')
    .optional()
    .isArray()
    .withMessage('spouse.additionalIncomeSources must be an array'),

  body('spouse.additionalIncomeSources.*')
    .optional()
    .isString()
    .withMessage('each spouse.additionalIncomeSources value must be a string')
    .trim(),

  body('incomeDetails')
    .optional()
    .isObject()
    .withMessage('incomeDetails must be an object'),

  body('incomeDetails.employerName')
    .optional()
    .isString()
    .withMessage('incomeDetails.employerName must be a string')
    .trim(),

  body('incomeDetails.t4Income')
    .optional()
    .isString()
    .withMessage('incomeDetails.t4Income must be a string')
    .trim(),

  body('incomeDetails.gigPlatforms')
    .optional()
    .isArray()
    .withMessage('incomeDetails.gigPlatforms must be an array'),

  body('incomeDetails.gigPlatforms.*')
    .optional()
    .isString()
    .withMessage('each incomeDetails.gigPlatforms value must be a string')
    .trim(),

  body('incomeDetails.gigPlatformOther')
    .optional()
    .isString()
    .withMessage('incomeDetails.gigPlatformOther must be a string')
    .trim(),

  body('incomeDetails.gigIncome')
    .optional()
    .isString()
    .withMessage('incomeDetails.gigIncome must be a string')
    .trim(),

  body('incomeDetails.selfEmploymentIncome')
    .optional()
    .isString()
    .withMessage('incomeDetails.selfEmploymentIncome must be a string')
    .trim(),

  body('incomeDetails.businessIncome')
    .optional()
    .isString()
    .withMessage('incomeDetails.businessIncome must be a string')
    .trim(),

  body('incomeDetails.additionalIncomeSources')
    .optional()
    .isArray()
    .withMessage('incomeDetails.additionalIncomeSources must be an array'),

  body('incomeDetails.additionalIncomeSources.*')
    .optional()
    .isString()
    .withMessage('each incomeDetails.additionalIncomeSources value must be a string')
    .trim(),

  body('additionalIncomes')
    .optional()
    .isArray()
    .withMessage('additionalIncomes must be an array'),

  body('additionalIncomes.*.source')
    .optional()
    .isString()
    .withMessage('additionalIncomes.source must be a string')
    .trim(),

  body('additionalIncomes.*.amount')
    .optional()
    .isString()
    .withMessage('additionalIncomes.amount must be a string')
    .trim(),

  body('additionalIncomes.*.notes')
    .optional()
    .isString()
    .withMessage('additionalIncomes.notes must be a string')
    .trim(),

  body('deductions')
    .optional()
    .isObject()
    .withMessage('deductions must be an object'),

  body('receiptTypes')
    .optional()
    .isObject()
    .withMessage('receiptTypes must be an object'),

  body('vehiclePurchasedForWork')
    .optional()
    .isBoolean()
    .withMessage('vehiclePurchasedForWork must be a boolean')
    .toBoolean(),

  body('vehicles')
    .optional()
    .isArray()
    .withMessage('vehicles must be an array'),

  body('vehicles.*.ownerPerson')
    .optional()
    .isString()
    .withMessage('vehicles.ownerPerson must be a string')
    .trim(),

  body('vehicles.*.ownershipType')
    .optional()
    .isString()
    .withMessage('vehicles.ownershipType must be a string')
    .trim(),

  body('vehicles.*.mainUse')
    .optional()
    .isString()
    .withMessage('vehicles.mainUse must be a string')
    .trim(),

  body('vehicles.*.purchaseDate')
    .optional()
    .isString()
    .withMessage('vehicles.purchaseDate must be a string')
    .trim(),

  body('vehicles.*.purchasePrice')
    .optional()
    .isString()
    .withMessage('vehicles.purchasePrice must be a string')
    .trim(),

  body('vehicles.*.gstHstPaid')
    .optional()
    .isString()
    .withMessage('vehicles.gstHstPaid must be a string')
    .trim(),

  body('agreeToTerms')
    .optional()
    .isBoolean()
    .withMessage('agreeToTerms must be a boolean')
    .toBoolean(),

  body('agreeToPrivacy')
    .optional()
    .isBoolean()
    .withMessage('agreeToPrivacy must be a boolean')
    .toBoolean(),

  body('confirmAccuracy')
    .optional()
    .isBoolean()
    .withMessage('confirmAccuracy must be a boolean')
    .toBoolean(),
];

module.exports = {
  onboardingValidator,
};












