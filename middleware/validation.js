const { body, param, query, validationResult } = require('express-validator');

// Validation middleware
const validate = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        return res.status(400).json({ 
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.param,
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
            .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
            .trim()
            .escape(),
        body('email')
            .isEmail().withMessage('Please provide a valid email')
            .normalizeEmail()
            .toLowerCase(),
        body('password')
            .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
            .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password must contain at least one letter and one number')
            .not().matches(/^$|\s+/).withMessage('Password cannot contain spaces'),
        body('userType')
            .isIn(['gig-worker', 'contractor', 'trades', 'shop-owner', 'student', 'employee', 'other'])
            .withMessage('Invalid user type'),
        body('phoneNumber')
            .optional()
            .matches(/^\+?1?\d{10,14}$/).withMessage('Please enter a valid Canadian phone number')
    ],
    login: [
        body('email')
            .isEmail().withMessage('Please provide a valid email')
            .normalizeEmail(),
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
                'fuel', 'vehicle-maintenance', 'insurance', 'office-supplies',
                'internet', 'rent', 'utilities', 'meals', 'software',
                'advertising', 'professional-fees', 'tools', 'training',
                'telephone', 'home-office', 'other'
            ]).withMessage('Invalid category'),
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
            .isIn(['fuel', 'vehicle-maintenance', 'insurance', 'office-supplies', 'internet', 'rent', 'utilities', 'meals', 'software', 'other'])
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
            .normalizeEmail(),
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

module.exports = {
    validate,
    authValidators,
    receiptValidators,
    mileageValidators,
    caAccessValidators,
    commonValidators
};