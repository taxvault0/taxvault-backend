const UserProfile = require('./user-profile.model');

async function updateConsents(userId, payload = {}) {
  let profile = await UserProfile.findOne({ user: userId });

  if (!profile) {
    profile = await UserProfile.create({ user: userId });
  }

  if (typeof payload.agreeToTerms !== 'undefined') {
    profile.agreeToTerms = !!payload.agreeToTerms;
  }

  if (typeof payload.agreeToPrivacy !== 'undefined') {
    profile.agreeToPrivacy = !!payload.agreeToPrivacy;
  }

  if (typeof payload.confirmAccuracy !== 'undefined') {
    profile.confirmAccuracy = !!payload.confirmAccuracy;
  }

  if (typeof payload.onboardingCompleted !== 'undefined') {
    profile.onboardingCompleted = !!payload.onboardingCompleted;
    profile.onboardingCompletedAt = payload.onboardingCompleted ? new Date() : null;
  }

  await profile.save();

  return profile;
}

module.exports = {
  updateConsents,
};












