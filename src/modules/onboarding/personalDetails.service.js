const Address = require('./address.model');
const Spouse = require('./spouse.model');
const UserProfile = require('./user-profile.model');

function hasMeaningfulSpouseData(spouse = {}) {
  return Boolean(
    spouse.name ||
    spouse.dob ||
    spouse.sin ||
    spouse.phone ||
    (Array.isArray(spouse.gigPlatforms) && spouse.gigPlatforms.length) ||
    (Array.isArray(spouse.additionalIncomeSources) && spouse.additionalIncomeSources.length)
  );
}

async function upsertPersonalDetails(userId, payload = {}) {
  let profile = await UserProfile.findOne({ user: userId });

  if (!profile) {
    profile = await UserProfile.create({ user: userId });
  }

  if (payload.address) {
    let addressDoc = null;

    if (profile.address) {
      addressDoc = await Address.findByIdAndUpdate(
        profile.address,
        {
          street: payload.address.street || '',
          city: payload.address.city || '',
          province: payload.address.province || '',
          postalCode: payload.address.postalCode || '',
          country: payload.address.country || 'Canada',
        },
        { new: true, runValidators: true }
      );
    } else {
      addressDoc = await Address.create({
        street: payload.address.street || '',
        city: payload.address.city || '',
        province: payload.address.province || '',
        postalCode: payload.address.postalCode || '',
        country: payload.address.country || 'Canada',
      });

      profile.address = addressDoc._id;
    }
  }

  if (payload.spouse && hasMeaningfulSpouseData(payload.spouse)) {
    let spouseDoc = null;

    if (profile.spouse) {
      spouseDoc = await Spouse.findByIdAndUpdate(
        profile.spouse,
        {
          name: payload.spouse.name || '',
          dob: payload.spouse.dob || '',
          sin: payload.spouse.sin || '',
          phone: payload.spouse.phone || '',
          gigPlatforms: payload.spouse.gigPlatforms || [],
          additionalIncomeSources: payload.spouse.additionalIncomeSources || [],
        },
        { new: true, runValidators: true }
      );
    } else {
      spouseDoc = await Spouse.create({
        user: userId,
        name: payload.spouse.name || '',
        dob: payload.spouse.dob || '',
        sin: payload.spouse.sin || '',
        phone: payload.spouse.phone || '',
        gigPlatforms: payload.spouse.gigPlatforms || [],
        additionalIncomeSources: payload.spouse.additionalIncomeSources || [],
      });

      profile.spouse = spouseDoc._id;
    }
  } else if (profile.spouse) {
    await Spouse.findByIdAndDelete(profile.spouse);
    profile.spouse = null;
  }

  if (typeof payload.familyStatus !== 'undefined') {
    profile.familyStatus = payload.familyStatus || '';
  }

  if (typeof payload.numberOfDependents !== 'undefined') {
    profile.numberOfDependents = Number(payload.numberOfDependents || 0);
  }

  await profile.save();

  return profile;
}

module.exports = {
  upsertPersonalDetails,
};












