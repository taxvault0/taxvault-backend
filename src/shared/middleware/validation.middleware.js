const { body, param, query, validationResult } = require('express-validator');

const PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

// Validation middleware
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg
      }))
    });
  };
};

// Auth validations
const authValidators = {
  register: [
    body('name')
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 120 }).withMessage('Name must be between 2 and 120 characters')
      .trim(),

    body('email')
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail({ gmail_remove_dots: false })
      .toLowerCase(),

    body('password')
      .matches(STRONG_PASSWORD_REGEX)
      .withMessage(
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character'
      )
      .not()
      .matches(/\s/)
      .withMessage('Password cannot contain spaces'),

    body('role')
      .optional()
      .isIn(['user', 'ca', 'admin'])
      .withMessage('Invalid role'),

    body('userType')
  .optional({ values: 'falsy' })
  .isIn([
    'gig-worker',
    'contractor',
    'trades',
    'business-owner',
    'student',
    'employee',
    'other',
    'professional'
  ])
  .withMessage('Invalid user type'),

    body('phoneNumber')
      .optional({ values: 'falsy' })
      .customSanitizer((value) => String(value).replace(/\D/g, ''))
      .matches(/^(1)?\d{10}$/)
      .withMessage('Please enter a valid phone number'),

    body('province')
      .optional({ values: 'falsy' })
      .customSanitizer((value) => String(value).trim().toUpperCase())
      .isIn(PROVINCES)
      .withMessage('Invalid province'),

    body('firmName')
      .optional({ values: 'falsy' })
      .isLength({ min: 1, max: 200 })
      .withMessage('Firm name must be between 1 and 200 characters')
      .trim(),

    body('caNumber')
      .optional({ values: 'falsy' })
      .customSanitizer((value) => String(value).trim().toUpperCase())
      .isLength({ min: 3, max: 30 })
      .withMessage('CA number must be between 3 and 30 characters'),

    body('termsAccepted')
      .optional()
      .isBoolean()
      .withMessage('termsAccepted must be boolean'),

    body('privacyAccepted')
      .optional()
      .isBoolean()
      .withMessage('privacyAccepted must be boolean'),

    body('professionalTermsAccepted')
      .optional()
      .isBoolean()
      .withMessage('professionalTermsAccepted must be boolean'),

    body('termsAcceptedAt')
      .optional({ values: 'falsy' })
      .isISO8601()
      .withMessage('termsAcceptedAt must be a valid ISO date'),

    body('profile')
      .optional()
      .isObject()
      .withMessage('profile must be an object'),

    body('filingFrequency')
      .optional({ checkFalsy: true })
      .isIn(['monthly', 'quarterly', 'annual', 'unknown'])
      .withMessage('Invalid filing frequency')
  ],

  login: [
    body('email')
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail({ gmail_remove_dots: false })
      .toLowerCase(),

    body('password')
      .notEmpty().withMessage('Password is required')
  ],

  verifyMfa: [
    body('token')
      .notEmpty().withMessage('MFA token is required')
      .isLength({ min: 6, max: 6 }).withMessage('MFA token must be 6 digits')
      .isNumeric().withMessage('MFA token must contain only numbers')
  ]
};

// Receipt validations
const receiptValidators = {
  create: [
    body('taxYear')
      .isInt({ min: 2020, max: 2030 }).withMessage('Invalid tax year'),

    body('category')
      .isIn([
        'fuel',
        'vehicle-maintenance',
        'insurance',
        'office-supplies',
        'internet',
        'rent',
        'utilities',
        'meals',
        'software',
        'advertising',
        'professional-fees',
        'tools',
        'training',
        'telephone',
        'home-office',
        'other'
      ])
      .withMessage('Invalid category'),

    body('vendor')
      .notEmpty().withMessage('Vendor is required')
      .trim()
      .escape(),

    body('amount')
      .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0')
      .toFloat(),

    body('gst')
      .optional()
      .isFloat({ min: 0 }).withMessage('GST cannot be negative')
      .toFloat(),

    body('date')
      .isISO8601().withMessage('Invalid date format')
      .toDate()
  ],

  update: [
    param('id')
      .isMongoId().withMessage('Invalid receipt ID'),

    body('category')
      .optional()
      .isIn([
        'fuel',
        'vehicle-maintenance',
        'insurance',
        'office-supplies',
        'internet',
        'rent',
        'utilities',
        'meals',
        'software',
        'other'
      ])
      .withMessage('Invalid category'),

    body('amount')
      .optional()
      .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0')
      .toFloat()
  ]
};

// Mileage validations
const mileageValidators = {
  addTrip: [
    body('date')
      .isISO8601().withMessage('Invalid date format')
      .toDate(),

    body('distance')
      .isFloat({ min: 0.1, max: 1000 }).withMessage('Distance must be between 0.1 and 1000 km')
      .toFloat(),

    body('purpose')
      .isIn(['business', 'commute', 'personal']).withMessage('Invalid purpose'),

    body('startLocation.address')
      .optional()
      .trim(),

    body('endLocation.address')
      .optional()
      .trim()
  ],

  updateSettings: [
    body('settings.autoTrack')
      .optional()
      .isBoolean().withMessage('autoTrack must be a boolean'),

    body('settings.homeAddress')
      .optional()
      .isObject(),

    body('settings.workAddress')
      .optional()
      .isObject()
  ]
};

// CA access validations
const caAccessValidators = {
  invite: [
    body('caEmail')
      .isEmail().withMessage('Please provide a valid CA email')
      .normalizeEmail({ gmail_remove_dots: false })
      .toLowerCase(),

    body('permissionLevel')
      .isIn(['read-only', 'full']).withMessage('Invalid permission level'),

    body('taxYears')
      .isArray({ min: 1 }).withMessage('At least one tax year is required'),

    body('taxYears.*')
      .isInt({ min: 2020, max: 2030 }).withMessage('Invalid tax year')
  ],

  updateAccess: [
    param('id')
      .isMongoId().withMessage('Invalid access ID'),

    body('permissionLevel')
      .optional()
      .isIn(['read-only', 'full']).withMessage('Invalid permission level'),

    body('status')
      .optional()
      .isIn(['active', 'revoked']).withMessage('Invalid status')
  ]
};

// Common validations
const commonValidators = {
  taxYear: [
    query('taxYear')
      .optional()
      .isInt({ min: 2020, max: 2030 }).withMessage('Invalid tax year')
      .toInt()
  ],

  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer')
      .toInt(),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
      .toInt()
  ],

  id: [
    param('id')
      .isMongoId().withMessage('Invalid ID format')
  ]
};

const caRegistrationValidators = {
  saveDraft: [
    body('accountInformation.firstName')
      .optional()
      .isLength({ min: 1, max: 50 }).withMessage('First name must be between 1 and 50 characters')
      .trim(),

    body('accountInformation.lastName')
      .optional()
      .isLength({ min: 1, max: 50 }).withMessage('Last name must be between 1 and 50 characters')
      .trim(),

    body('accountInformation.email')
      .optional()
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail({ gmail_remove_dots: false })
      .toLowerCase(),

    body('accountInformation.primaryPhone')
      .optional({ values: 'falsy' })
      .customSanitizer((value) => String(value).replace(/\D/g, ''))
      .matches(/^(1)?\d{10}$/)
      .withMessage('Please provide a valid primary phone number'),

    body('accountInformation.alternatePhone')
      .optional({ values: 'falsy' })
      .customSanitizer((value) => String(value).replace(/\D/g, ''))
      .matches(/^(1)?\d{10}$/)
      .withMessage('Please provide a valid alternate phone number'),

    body('professionalInformation.caDesignation')
      .optional()
      .isIn([
        'Chartered Professional Accountant (CPA)',
        'CPA, CA',
        'CPA, CGA',
        'CPA, CMA',
        'Other'
      ])
      .withMessage('Invalid CA designation'),

    body('professionalInformation.caNumber')
      .optional({ values: 'falsy' })
      .customSanitizer((value) => String(value).trim().toUpperCase())
      .matches(/^[A-Z0-9-]{5,15}$/)
      .withMessage('CA number must be 5 to 15 characters and only allow letters, numbers, and hyphen'),

    body('professionalInformation.provinceOfRegistration')
      .optional()
      .customSanitizer((value) => String(value).trim().toUpperCase())
      .isIn(PROVINCES)
      .withMessage('Invalid province of registration'),

    body('professionalInformation.yearAdmitted')
      .optional({ values: 'falsy' })
      .isInt({ min: 1950, max: new Date().getFullYear() })
      .withMessage('Year admitted must be between 1950 and the current year')
      .toInt(),

    body('professionalInformation.yearsOfExperience')
      .optional({ values: 'falsy' })
      .isInt({ min: 0, max: 100 }).withMessage('Years of experience must be between 0 and 100')
      .toInt(),

    body('professionalInformation.firmName')
      .optional()
      .isLength({ min: 1, max: 200 }).withMessage('Firm name is required')
      .trim(),

    body('professionalInformation.firmWebsite')
      .optional({ checkFalsy: true })
      .isURL().withMessage('Firm website must be a valid URL'),

    body('professionalInformation.languagesSpoken')
      .optional()
      .isArray().withMessage('Languages spoken must be an array'),

    body('professionalInformation.otherLanguage')
      .optional()
      .isLength({ max: 100 }).withMessage('Other language must be less than 100 characters')
      .trim(),

    body('firmDetails.firmAddress')
      .optional()
      .isLength({ min: 1, max: 300 }).withMessage('Firm address is required')
      .trim(),

    body('firmDetails.city')
      .optional()
      .isLength({ min: 1, max: 100 }).withMessage('City is required')
      .trim(),

    body('firmDetails.province')
      .optional()
      .customSanitizer((value) => String(value).trim().toUpperCase())
      .isIn(PROVINCES)
      .withMessage('Invalid province'),

    body('firmDetails.postalCode')
      .optional()
      .isLength({ min: 3, max: 20 }).withMessage('Postal code is required')
      .trim(),

    body('firmDetails.firmPhone')
      .optional({ values: 'falsy' })
      .customSanitizer((value) => String(value).replace(/\D/g, ''))
      .matches(/^(1)?\d{10}$/)
      .withMessage('Please provide a valid firm phone number'),

    body('firmDetails.firmEmail')
      .optional()
      .isEmail().withMessage('Please provide a valid firm email')
      .normalizeEmail({ gmail_remove_dots: false })
      .toLowerCase(),

    body('firmDetails.numberOfPartners')
      .optional({ values: 'falsy' })
      .isInt({ min: 0 }).withMessage('Number of partners must be 0 or more')
      .toInt(),

    body('firmDetails.numberOfStaff')
      .optional({ values: 'falsy' })
      .isInt({ min: 0 }).withMessage('Number of staff must be 0 or more')
      .toInt(),

    body('firmDetails.yearEstablished')
      .optional({ values: 'falsy' })
      .isInt({ min: 1900, max: 2100 }).withMessage('Invalid year established')
      .toInt(),

    body('professionalCredentials.professionalLiabilityInsurance.policyNumber')
      .optional({ values: 'falsy' })
      .customSanitizer((value) => String(value).trim().toUpperCase())
      .matches(/^[A-Z0-9/-]{6,20}$/)
      .withMessage('Policy number must be 6 to 20 characters and only allow letters, numbers, slash, and hyphen'),

    body('professionalCredentials.peerReview.reviewDate')
      .optional({ values: 'falsy' })
      .isISO8601()
      .withMessage('Peer review date must be a valid date')
      .toDate(),

    body('practiceInformation.averageClientsPerYear')
      .optional({ values: 'falsy' })
      .isInt({ min: 0 }).withMessage('Average clients per year must be 0 or more')
      .toInt(),

    body('practiceInformation.minimumFee')
      .optional({ values: 'falsy' })
      .isFloat({ min: 0 }).withMessage('Minimum fee must be 0 or more')
      .toFloat(),

    body('practiceInformation.maximumFee')
      .optional({ values: 'falsy' })
      .isFloat({ min: 0 }).withMessage('Maximum fee must be 0 or more')
      .toFloat(),

    body('practiceInformation.serviceRadiusKm')
      .optional({ values: 'falsy' })
      .isFloat({ min: 0 }).withMessage('Service radius must be 0 or more')
      .toFloat(),

    body('practiceInformation.hoursOfOperation')
      .optional()
      .isObject().withMessage('Hours of operation must be an object'),

    body('verificationAndDocuments.professionalReferences')
      .optional()
      .isArray().withMessage('Professional references must be an array'),

    body('reviewAndSubmit.agreedTermsAndConditions')
      .optional()
      .isBoolean().withMessage('agreedTermsAndConditions must be boolean'),

    body('reviewAndSubmit.agreedPrivacyPolicy')
      .optional()
      .isBoolean().withMessage('agreedPrivacyPolicy must be boolean'),

    body('reviewAndSubmit.agreedProfessionalTerms')
      .optional()
      .isBoolean().withMessage('agreedProfessionalTerms must be boolean'),

    body('reviewAndSubmit.confirmAccuracy')
      .optional()
      .isBoolean().withMessage('confirmAccuracy must be boolean')
  ],

  submit: [
    body('reviewAndSubmit.agreedTermsAndConditions')
      .optional()
      .isBoolean().withMessage('agreedTermsAndConditions must be boolean'),

    body('reviewAndSubmit.agreedPrivacyPolicy')
      .optional()
      .isBoolean().withMessage('agreedPrivacyPolicy must be boolean'),

    body('reviewAndSubmit.agreedProfessionalTerms')
      .optional()
      .isBoolean().withMessage('agreedProfessionalTerms must be boolean'),

    body('reviewAndSubmit.confirmAccuracy')
      .optional()
      .isBoolean().withMessage('confirmAccuracy must be boolean')
  ]
};

module.exports = {
  validate,
  authValidators,
  receiptValidators,
  mileageValidators,
  caAccessValidators,
  commonValidators,
  caRegistrationValidators
};