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
    'YT',
  ];

  return validProvinces.includes(value) ? value : 'ON';
};

// @desc    Register user
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    let {
      name,
      email,
      password,
      userType,
      phoneNumber,
      province,
      role,
      firmName,
      caNumber,
    } = req.body;

    console.log('REGISTER REQ BODY:', req.body);

    name = String(name || '').trim();
    email = String(email || '').trim().toLowerCase();
    password = String(password || '');
    firmName = String(firmName || '').trim();
    caNumber = String(caNumber || '').trim();

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const cleanProvince = normalizeProvince(province);

    const allowedUserTypes = [
      'gig-worker',
      'contractor',
      'trades',
      'business-owner',
      'student',
      'employee',
      'other',
      'professional',
    ];

    const cleanUserType = allowedUserTypes.includes(userType)
      ? userType
      : 'employee';

    const cleanRole = ['user', 'ca', 'admin'].includes(role) ? role : 'user';

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ message: 'Name, email and password are required' }],
      });
    }

    if (name.length < 2 || name.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ message: 'Name must be between 2 and 50 characters' }],
      });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ message: 'Please provide a valid email' }],
      });
    }

    if (password.includes(' ')) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ message: 'Password cannot contain spaces' }],
      });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [
          {
            message:
              'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
          },
        ],
      });
    }

    if (phoneNumber && !PHONE_REGEX.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ message: 'Please provide a valid phone number' }],
      });
    }

    if (cleanRole === 'ca') {
      if (!firmName) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: [{ message: 'Firm name is required for CA registration' }],
        });
      }

      if (!caNumber) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: [{ message: 'CA number is required for CA registration' }],
        });
      }
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: cleanRole,
      userType: cleanUserType,
      phoneNumber: normalizedPhone || undefined,
      province: cleanProvince,
      firmName: firmName || '',
      caNumber: caNumber || '',
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    console.error('REGISTER ERROR:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message,
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
        message: 'No user found with this Client ID',
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
        clientId: user.clientId,
      },
    });
  } catch (error) {
    console.error('Error finding user by client ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Error finding user',
      error: error.message,
    });
  }
};