const UserProfile = require('./user-profile.model');
const User = require('../../modules/auth/user.model');

async function getOnboardingProfile(userId) {
  const profile = await UserProfile.findOne({ user: userId })
    .populate('address')
    .populate('spouse')
    .populate('employmentProfile')
    .populate('additionalIncomes')
    .populate('deductions')
    .populate('receiptTypes')
    .populate('vehicles');

  if (!profile) {
    return null;
  }

  return profile;
}

module.exports = {
  getOnboardingProfile,
};












