const User = require('../models/User');

const { upsertPersonalDetails } = require('../services/onboarding/personalDetails.service');
const { upsertEmployment } = require('../services/onboarding/employment.service');
const { replaceAdditionalIncomes } = require('../services/onboarding/additionalIncome.service');
const { replaceDeductions } = require('../services/onboarding/deductions.service');
const { replaceVehicles } = require('../services/onboarding/vehicles.service');
const { updateConsents } = require('../services/onboarding/consents.service');
const { getOnboardingProfile } = require('../services/onboarding/onboarding.read.service');
const { mapProfileToOnboardingResponse } = require('../services/onboarding/onboarding.mapper');

// @desc    Save onboarding data
// @route   PUT /api/onboarding
// @access  Private
const saveOnboarding = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const body = req.body || {};

    // Personal details
    await upsertPersonalDetails(user._id, {
      address: body.address || null,
      spouse: body.spouse || null,
      familyStatus: body.familyStatus || '',
      numberOfDependents: Number(body.numberOfDependents || 0),
    });

    // Employment / income details
    await upsertEmployment(user._id, {
      employmentProfiles: Array.isArray(body.employmentProfiles)
        ? body.employmentProfiles
        : [],
      employerName: body.incomeDetails?.employerName || '',
      t4Income: body.incomeDetails?.t4Income || '',
      gigPlatforms: Array.isArray(body.incomeDetails?.gigPlatforms)
        ? body.incomeDetails.gigPlatforms
        : [],
      gigPlatformOther: body.incomeDetails?.gigPlatformOther || '',
      gigIncome: body.incomeDetails?.gigIncome || '',
      selfEmploymentIncome: body.incomeDetails?.selfEmploymentIncome || '',
      businessIncome: body.incomeDetails?.businessIncome || '',
      additionalIncomeSources: Array.isArray(body.incomeDetails?.additionalIncomeSources)
        ? body.incomeDetails.additionalIncomeSources
        : [],
    });

    // Optional normalized list for additional incomes
    await replaceAdditionalIncomes(
      user._id,
      Array.isArray(body.additionalIncomes) ? body.additionalIncomes : []
    );

    // Deductions + receipt types
    await replaceDeductions(
      user._id,
      body.deductions || {},
      body.receiptTypes || {}
    );

    // Vehicles
    await replaceVehicles(
      user._id,
      Array.isArray(body.vehicles) ? body.vehicles : [],
      !!body.vehiclePurchasedForWork
    );

    // Consents / completion
    await updateConsents(user._id, {
      agreeToTerms: !!body.agreeToTerms,
      agreeToPrivacy: !!body.agreeToPrivacy,
      confirmAccuracy: !!body.confirmAccuracy,
      onboardingCompleted: true,
    });

    const profile = await getOnboardingProfile(user._id);
    const onboarding = mapProfileToOnboardingResponse(profile);

    return res.json({
      success: true,
      message: 'Onboarding data saved successfully',
      onboarding,
    });
  } catch (error) {
    console.error('Save onboarding error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error saving onboarding data',
      error: error.message,
    });
  }
};

// @desc    Get onboarding data
// @route   GET /api/onboarding
// @access  Private
const getOnboarding = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('_id');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const profile = await getOnboardingProfile(user._id);
    const onboarding = mapProfileToOnboardingResponse(profile);

    return res.json({
      success: true,
      onboarding: onboarding || {
        personalDetails: {
          address: null,
          spouse: null,
          familyStatus: '',
          numberOfDependents: 0,
        },
        employment: {
          employmentProfiles: [],
          incomeDetails: null,
          additionalIncomes: [],
        },
        deductions: {
          deductions: {},
          receiptTypes: {},
        },
        vehicles: {
          vehiclePurchasedForWork: false,
          vehicles: [],
        },
        consents: {
          agreeToTerms: false,
          agreeToPrivacy: false,
          confirmAccuracy: false,
          onboardingCompleted: false,
          onboardingCompletedAt: null,
        },
      },
    });
  } catch (error) {
    console.error('Get onboarding error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching onboarding data',
      error: error.message,
    });
  }
};

module.exports = {
  saveOnboarding,
  getOnboarding,
};