const User = require('../models/User');
const QRCode = require('qrcode');
const generateToken = require('../utils/generateToken');

// @desc    Register user
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, userType, phoneNumber, province } = req.body;

    console.log('REGISTER REQ BODY:', req.body);

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Normalize province so empty string doesn't fail validation
    const cleanProvince =
      province && province.trim() !== '' ? province.trim() : 'ON';

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      userType: userType || 'employee',
      phoneNumber,
      province: cleanProvince
    });

    console.log('USER CREATED:', user);

    // Generate QR code only if clientId exists
    if (user.clientId) {
      const qrCodeData = await QRCode.toDataURL(user.clientId);
      user.clientIdQR = qrCodeData;
      await user.save({ validateBeforeSave: false });
    } else {
      console.warn('clientId was not generated for user:', user._id);
    }

    // Generate token
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

      console.log('VALIDATION ERRORS:', validationErrors);

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