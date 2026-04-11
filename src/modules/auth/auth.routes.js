const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('./user.model');
const { protect } = require('../../shared/middleware/auth.middleware');
const { validate, authValidators } = require('../../shared/middleware/validation.middleware');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../../infrastructure/email/email.service');
const { body, validationResult, param } = require('express-validator');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// Import tax utilities
const taxUtils = require('../../shared/utils/tax-utils');

const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

// Generate JWT Token
const generateToken = (id) => {
  const expiresIn = (process.env.JWT_EXPIRE || '7d').trim();

  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn
  });
};

// Valid provinces list
const VALID_PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', validate(authValidators.register), async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      userType,
      phoneNumber,
      province,
      firmName,
      caNumber,
      profile,
      termsAccepted,
      privacyAccepted,
      professionalTermsAccepted,
      termsAcceptedAt,
      businessNumber,
      provincialTaxRegistered,
      provincialTaxNumber,
      filingFrequency,
      taxRegistrationDate,
      exceededProvincialThreshold
    } = req.body;

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedRole = role || 'user';
    const normalizedProvince = province ? String(province).trim().toUpperCase() : 'ON';

    // Check if user exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Validate province if provided
    if (normalizedProvince && !VALID_PROVINCES.includes(normalizedProvince)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid province selected'
      });
    }

    // Validate business number format based on province
    if (businessNumber && normalizedProvince) {
      const isValid = taxUtils.validateBusinessNumber(businessNumber, normalizedProvince);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: `Invalid business number format for ${normalizedProvince}`
        });
      }
    }

    const safeUserType =
      userType ||
      (normalizedRole === 'ca' ? 'professional' : 'other');

    // Create user with all fields
    const userData = {
      name: String(name).trim(),
      email: normalizedEmail,
      password,
      role: normalizedRole,
      userType: safeUserType,
      phoneNumber,
      province: normalizedProvince,
      firmName: firmName || '',
      caNumber: caNumber || '',
      termsAccepted: !!termsAccepted,
      privacyAccepted: !!privacyAccepted,
      professionalTermsAccepted: !!professionalTermsAccepted,
      termsAcceptedAt: termsAcceptedAt || null,
      profile: profile && typeof profile === 'object' ? profile : {},
      emailVerified: false
    };

    // Add optional tax fields if provided
    if (businessNumber) userData.businessNumber = businessNumber;
    if (provincialTaxRegistered !== undefined) {
      userData.provincialTaxRegistered = provincialTaxRegistered;
    }
    if (provincialTaxNumber) userData.provincialTaxNumber = provincialTaxNumber;
    if (filingFrequency) userData.filingFrequency = filingFrequency;
    if (taxRegistrationDate) userData.taxRegistrationDate = taxRegistrationDate;
    if (exceededProvincialThreshold !== undefined) {
      userData.exceededProvincialThreshold = exceededProvincialThreshold;
    }

    const user = await User.create(userData);

    // Generate email verification token
    const verificationToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Send welcome email safely
    try {
      await sendWelcomeEmail(user);
    } catch (emailError) {
      console.error('Welcome email failed:', emailError.message);
    }

    // Generate token
    const token = generateToken(user._id);

    // Get tax info based on province
    let taxInfo = {};
    if (user.province) {
      taxInfo = {
        display: taxUtils.getTaxDisplayString(user.province),
        agency: taxUtils.getTaxAgency(user.province).agency,
        requiresSeparateFiling: taxUtils.getTaxAgency(user.province).hasSeparateProvincial,
        rate: taxUtils.calculateTaxes(100, user.province).total,
        businessNumberFormat: taxUtils.getBusinessNumberFormat(user.province).pattern
      };
    }

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        userType: user.userType,
        phoneNumber: user.phoneNumber || '',
        province: user.province,
        firmName: user.firmName || '',
        caNumber: user.caNumber || '',
        profile: user.profile || {},
        termsAccepted: !!user.termsAccepted,
        privacyAccepted: !!user.privacyAccepted,
        professionalTermsAccepted: !!user.professionalTermsAccepted,
        termsAcceptedAt: user.termsAcceptedAt || null,
        emailVerified: user.emailVerified,
        businessNumber: user.businessNumber,
        provincialTaxRegistered: user.provincialTaxRegistered,
        provincialTaxNumber: user.provincialTaxNumber,
        filingFrequency: user.filingFrequency,
        taxInfo
      }
    });
  } catch (error) {
    console.error('Registration error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.values(error.errors).map((err) => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Update user profile (including province)
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const updates = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (updates.province) {
      updates.province = String(updates.province).trim().toUpperCase();
    }

    // Validate province if being updated
    if (updates.province && !VALID_PROVINCES.includes(updates.province)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid province selected'
      });
    }

    // Validate business number if being updated
    if (updates.businessNumber && (updates.province || user.province)) {
      const provinceToUse = updates.province || user.province;
      const isValid = taxUtils.validateBusinessNumber(updates.businessNumber, provinceToUse);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: `Invalid business number format for ${provinceToUse}`
        });
      }
    }

    const allowedUpdates = [
      'name',
      'phoneNumber',
      'province',
      'businessNumber',
      'provincialTaxRegistered',
      'provincialTaxNumber',
      'filingFrequency',
      'exceededProvincialThreshold',
      'firmName',
      'caNumber',
      'profile'
    ];

    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        user[field] = updates[field];
      }
    });

    await user.save();

    let taxInfo = {};
    if (user.province) {
      taxInfo = {
        display: taxUtils.getTaxDisplayString(user.province),
        agency: taxUtils.getTaxAgency(user.province).agency,
        requiresSeparateFiling: taxUtils.getTaxAgency(user.province).hasSeparateProvincial,
        rate: taxUtils.calculateTaxes(100, user.province).total,
        businessNumberFormat: taxUtils.getBusinessNumberFormat(user.province).pattern
      };
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        userType: user.userType,
        phoneNumber: user.phoneNumber,
        province: user.province,
        firmName: user.firmName || '',
        caNumber: user.caNumber || '',
        profile: user.profile || {},
        businessNumber: user.businessNumber,
        provincialTaxRegistered: user.provincialTaxRegistered,
        provincialTaxNumber: user.provincialTaxNumber,
        filingFrequency: user.filingFrequency,
        taxInfo
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
});

// @desc    Get user's tax information
// @route   GET /api/auth/tax-info
// @access  Private
router.get('/tax-info', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user || !user.province) {
      return res.status(404).json({
        success: false,
        message: 'Tax information not available'
      });
    }

    const taxInfo = {
      province: user.province,
      display: taxUtils.getTaxDisplayString(user.province),
      agency: taxUtils.getTaxAgency(user.province),
      rate: taxUtils.calculateTaxes(100, user.province),
      businessNumberFormat: taxUtils.getBusinessNumberFormat(user.province),
      filingDeadline: user.filingDeadline,
      requiresSeparateFiling: user.requiresSeparateProvincialFiling,
      taxType: user.taxType,
      taxRate: user.taxRate,
      taxRateDisplay: user.taxRateDisplay
    };

    res.json({
      success: true,
      taxInfo
    });
  } catch (error) {
    console.error('Tax info error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tax information'
    });
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', validate(authValidators.login), async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: String(email).toLowerCase() })
      .select('+password +loginAttempts +lockUntil +mfaEnabled +mfaSecret');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (user.isLocked()) {
      const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
      return res.status(401).json({
        success: false,
        message: `Account locked. Try again in ${remainingTime} minutes`
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      user.loginAttempts += 1;

      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 30 * 60 * 1000;
      }

      await user.save({ validateBeforeSave: false });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    if (user.mfaEnabled) {
      return res.json({
        success: true,
        requiresMfa: true,
        userId: user._id
      });
    }

    const token = generateToken(user._id);

    let taxInfo = {};
    if (user.province) {
      taxInfo = {
        display: taxUtils.getTaxDisplayString(user.province),
        agency: taxUtils.getTaxAgency(user.province).agency,
        requiresSeparateFiling: taxUtils.getTaxAgency(user.province).hasSeparateProvincial
      };
    }

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        userType: user.userType,
        mfaEnabled: user.mfaEnabled,
        province: user.province,
        firmName: user.firmName || '',
        caNumber: user.caNumber || '',
        profile: user.profile || {},
        businessNumber: user.businessNumber,
        provincialTaxRegistered: user.provincialTaxRegistered,
        filingFrequency: user.filingFrequency,
        taxInfo
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login'
    });
  }
});

// @desc    Verify MFA
// @route   POST /api/auth/verify-mfa
// @access  Public
router.post('/verify-mfa', validate(authValidators.verifyMfa), async (req, res) => {
  try {
    const { userId, token } = req.body;

    const user = await User.findById(userId).select('+mfaSecret +mfaBackupCodes');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.mfaBackupCodes && user.mfaBackupCodes.length > 0) {
      const backupCode = user.mfaBackupCodes.find(
        (code) => code.code === token && !code.used
      );

      if (backupCode) {
        backupCode.used = true;
        await user.save({ validateBeforeSave: false });

        const jwtToken = generateToken(user._id);

        return res.json({
          success: true,
          token: jwtToken,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        });
      }
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 1
    });

    if (!verified) {
      return res.status(401).json({
        success: false,
        message: 'Invalid MFA token'
      });
    }

    const jwtToken = generateToken(user._id);

    res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('MFA verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying MFA'
    });
  }
});

// @desc    Setup MFA
// @route   POST /api/auth/setup-mfa
// @access  Private
router.post('/setup-mfa', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+mfaSecret');

    const secret = speakeasy.generateSecret({
      name: `TaxVault Canada (${req.user.email})`
    });

    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push({
        code: crypto.randomBytes(4).toString('hex').toUpperCase(),
        used: false
      });
    }

    user.mfaSecret = secret.base32;
    user.mfaBackupCodes = backupCodes;
    await user.save();

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      secret: secret.base32,
      qrCode,
      backupCodes: backupCodes.map((c) => c.code)
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting up MFA'
    });
  }
});

// @desc    Enable MFA
// @route   POST /api/auth/enable-mfa
// @access  Private
router.post('/enable-mfa', protect, validate(authValidators.verifyMfa), async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id).select('+mfaSecret');

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 1
    });

    if (!verified) {
      return res.status(401).json({
        success: false,
        message: 'Invalid MFA token'
      });
    }

    user.mfaEnabled = true;
    await user.save();

    res.json({
      success: true,
      message: 'MFA enabled successfully'
    });
  } catch (error) {
    console.error('Enable MFA error:', error);
    res.status(500).json({
      success: false,
      message: 'Error enabling MFA'
    });
  }
});

// @desc    Disable MFA
// @route   POST /api/auth/disable-mfa
// @access  Private
router.post('/disable-mfa', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+mfaSecret');

    user.mfaEnabled = false;
    user.mfaSecret = undefined;
    user.mfaBackupCodes = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'MFA disabled successfully'
    });
  } catch (error) {
    console.error('Disable MFA error:', error);
    res.status(500).json({
      success: false,
      message: 'Error disabling MFA'
    });
  }
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with that email'
      });
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    await sendPasswordResetEmail(user, resetToken);

    res.json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending reset email'
    });
  }
});

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
router.put('/reset-password/:token', [
  param('token').notEmpty().withMessage('Token is required'),
  body('password')
    .matches(STRONG_PASSWORD_REGEX)
    .withMessage('Password must be at least 8 characters and include uppercase, lowercase, number, and special character')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { token } = req.params;
    const { password } = req.body;

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password'
    });
  }
});

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying email'
    });
  }
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-__v')
      .lean();

    let taxInfo = {};
    if (user.province) {
      taxInfo = {
        display: taxUtils.getTaxDisplayString(user.province),
        agency: taxUtils.getTaxAgency(user.province).agency,
        requiresSeparateFiling: taxUtils.getTaxAgency(user.province).hasSeparateProvincial,
        rate: taxUtils.calculateTaxes(100, user.province).total
      };
    }

    res.json({
      success: true,
      user: {
        ...user,
        taxInfo
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user'
    });
  }
});

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;