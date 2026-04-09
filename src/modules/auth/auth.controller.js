const User = require('../auth/user.model');
const QRCode = require('qrcode');
const generateToken = require('../utils/generateToken');

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const PHONE_REGEX = /^(1)?\d{10}$/;
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

const normalizePhoneNumber = (phone = '') => {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits;
  }
  if (digits.length === 10) {
    return digits;
  }
  return digits;
};

const normalizeProvince = (province = '') => {
  const value = String(province || '').trim().toUpperCase();
  const validProvinces = [
    'AB',
    'BC',
    'MB',
    'NB',
    'NL',
    'NS',
    'NT',
    'NU',
    'ON',
    'PE',
    'QC',
    'SK',
    'YT'
  ];

  return validProvinces.includes(value) ? value : 'ON';
};

// @desc    Register user
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    let { name, email, password, userType, phoneNumber, province } = req.body;

    name = typeof name === 'string' ? name.trim() : '';
    email = typeof email === 'string' ? email.trim().toLowerCase() : '';
    password = typeof password === 'string' ? password.trim() : '';
    phoneNumber = phoneNumber ? normalizePhoneNumber(phoneNumber) : '';

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 8 characters and include uppercase, lowercase, number, and special character'
      });
    }

    if (phoneNumber && !PHONE_REGEX.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid phone number'
      });
    }

    const allowedUserTypes = [
      'gig-worker',
      'contractor',
      'trades',
      'business-owner',
      'student',
      'employee',
      'other'
    ];

    const cleanUserType = allowedUserTypes.includes(userType) ? userType : 'employee';
    const cleanProvince = normalizeProvince(province);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      userType: cleanUserType,
      phoneNumber: phoneNumber || undefined,
      province: cleanProvince
    });

    if (user.clientId) {
      const qrCodeData = await QRCode.toDataURL(user.clientId);
      user.clientIdQR = qrCodeData;
      await user.save({ validateBeforeSave: false });
    }

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        userType: user.userType,
        phoneNumber: user.phoneNumber,
        province: user.province,
        clientId: user.clientId,
        clientIdQR: user.clientIdQR
      }
    });
  } catch (error) {
    console.error('Registration error:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    });
  }
};

// @desc    Get user by client ID (for CA use)
// @route   GET /api/users/client/:clientId
exports.getUserByClientId = async (req, res) => {
  try {
    const { clientId } = req.params;

    const user = await User.findOne({ clientId }).select(
      'name email userType clientId phoneNumber province'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this Client ID'
      });
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        phoneNumber: user.phoneNumber,
        province: user.province,
        clientId: user.clientId
      }
    });
  } catch (error) {
    console.error('Error finding user by client ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Error finding user',
      error: error.message
    });
  }
};