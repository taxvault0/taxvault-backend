const EmploymentProfile = require('./employment-profile.model');
const UserProfile = require('./user-profile.model');

async function upsertEmployment(userId, payload = {}) {
  let profile = await UserProfile.findOne({ user: userId });

  if (!profile) {
    profile = await UserProfile.create({ user: userId });
  }

  let employmentDoc = null;

  if (profile.employmentProfile) {
    employmentDoc = await EmploymentProfile.findByIdAndUpdate(
      profile.employmentProfile,
      {
        employerName: payload.employerName || '',
        t4Income: payload.t4Income || '',
        gigPlatforms: payload.gigPlatforms || [],
        gigPlatformOther: payload.gigPlatformOther || '',
        gigIncome: payload.gigIncome || '',
        selfEmploymentIncome: payload.selfEmploymentIncome || '',
        businessIncome: payload.businessIncome || '',
        additionalIncomeSources: payload.additionalIncomeSources || [],
      },
      { new: true, runValidators: true }
    );
  } else {
    employmentDoc = await EmploymentProfile.create({
      user: userId,
      employerName: payload.employerName || '',
      t4Income: payload.t4Income || '',
      gigPlatforms: payload.gigPlatforms || [],
      gigPlatformOther: payload.gigPlatformOther || '',
      gigIncome: payload.gigIncome || '',
      selfEmploymentIncome: payload.selfEmploymentIncome || '',
      businessIncome: payload.businessIncome || '',
      additionalIncomeSources: payload.additionalIncomeSources || [],
    });

    profile.employmentProfile = employmentDoc._id;
  }

  if (Array.isArray(payload.employmentProfiles)) {
    profile.employmentProfiles = payload.employmentProfiles;
  }

  await profile.save();

  return employmentDoc;
}

module.exports = {
  upsertEmployment,
};












