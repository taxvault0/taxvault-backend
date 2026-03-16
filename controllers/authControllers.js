const User = require('../models/User');
const QRCode = require('qrcode');

// @desc    Register user
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, userType, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user (clientId will be auto-generated)
    const user = await User.create({
      name,
      email,
      password,
      userType: userType || 'employee',
      phone
    });

    // Generate QR code for client ID
    const qrCodeData = await QRCode.toDataURL(user.clientId);
    user.clientIdQR = qrCodeData;
    await user.save({ validateBeforeSave: false });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        userType: user.userType,
        clientId: user.clientId, // Include client ID in response
        clientIdQR: user.clientIdQR
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get user by client ID (for CA use)
// @route   GET /api/users/client/:clientId
exports.getUserByClientId = async (req, res) => {
  try {
    const { clientId } = req.params;
    
    const user = await User.findOne({ clientId }).select('name email userType clientId');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this Client ID'
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        clientId: user.clientId
      }
    });
  } catch (error) {
    console.error('Error finding user by client ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error finding user'
    });
  }
};