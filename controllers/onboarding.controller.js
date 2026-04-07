const User = require('../models/User');

// @desc    Save onboarding data
// @route   PUT /api/onboarding
// @access  Private
const saveOnboarding = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.employmentProfiles = req.body.employmentProfiles || [];
        user.familyStatus = req.body.familyStatus || '';
        user.numberOfDependents = Number(req.body.numberOfDependents || 0);

        user.spouse = {
            ...(user.spouse || {}),
            ...(req.body.spouse || {})
        };

        user.incomeDetails = {
            ...(user.incomeDetails || {}),
            ...(req.body.incomeDetails || {})
        };

        user.deductions = req.body.deductions || {};
        user.receiptTypes = req.body.receiptTypes || {};
        user.vehiclePurchasedForWork = !!req.body.vehiclePurchasedForWork;
        user.vehicles = Array.isArray(req.body.vehicles) ? req.body.vehicles : [];

        user.agreeToTerms = !!req.body.agreeToTerms;
        user.agreeToPrivacy = !!req.body.agreeToPrivacy;
        user.confirmAccuracy = !!req.body.confirmAccuracy;
        user.onboardingCompleted = true;
        user.onboardingCompletedAt = new Date();

        await user.save();

        return res.json({
            success: true,
            message: 'Onboarding data saved successfully',
            user
        });
    } catch (error) {
        console.error('Save onboarding error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error saving onboarding data'
        });
    }
};

// @desc    Get onboarding data
// @route   GET /api/onboarding
// @access  Private
const getOnboarding = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select(
            'employmentProfiles familyStatus numberOfDependents spouse incomeDetails deductions receiptTypes vehiclePurchasedForWork vehicles agreeToTerms agreeToPrivacy confirmAccuracy onboardingCompleted onboardingCompletedAt'
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        return res.json({
            success: true,
            onboarding: user
        });
    } catch (error) {
        console.error('Get onboarding error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching onboarding data'
        });
    }
};

module.exports = {
    saveOnboarding,
    getOnboarding
};