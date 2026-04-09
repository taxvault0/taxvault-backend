const express = require('express');
const router = express.Router();
const { protect } = require('../../shared/middleware/auth.middleware');
const User = require('../auth/user.model');

// @desc    Get current authenticated user profile
// @route   GET /api/users/me
// @access  Private
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password -__v');

        return res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get me error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching user profile'
        });
    }
});

// @desc    Update current user basic profile
// @route   PUT /api/users/me
// @access  Private
router.put('/me', protect, async (req, res) => {
    try {
        const allowedFields = [
            'name',
            'phoneNumber',
            'profileImage',
            'province',
            'address',
            'notificationPreferences'
        ];

        const updates = {};
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password -__v');

        return res.json({
            success: true,
            message: 'Profile updated successfully',
            data: user
        });
    } catch (error) {
        console.error('Update profile error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error updating profile'
        });
    }
});

// @desc    Get all users (admin/testing only for now)
// @route   GET /api/users
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const users = await User.find().select('name email role userType province createdAt');

        return res.json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        console.error('List users error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching users'
        });
    }
});

module.exports = router;













