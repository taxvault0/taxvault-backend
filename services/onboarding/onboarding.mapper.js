function arrayToKeyValue(items = []) {
  return (items || []).reduce((acc, item) => {
    if (!item?.category) return acc;
    acc[item.category] = item.value;
    return acc;
  }, {});
}

function mapProfileToOnboardingResponse(profile) {
  if (!profile) {
    return null;
  }

  return {
    personalDetails: {
      address: profile.address || null,
      spouse: profile.spouse || null,
      familyStatus: profile.familyStatus || '',
      numberOfDependents: profile.numberOfDependents || 0,
    },

    employment: {
      employmentProfiles: profile.employmentProfiles || [],
      incomeDetails: profile.employmentProfile || null,
      additionalIncomes: profile.additionalIncomes || [],
    },

    deductions: {
      deductions: arrayToKeyValue(profile.deductions),
      receiptTypes: arrayToKeyValue(profile.receiptTypes),
    },

    vehicles: {
      vehiclePurchasedForWork: !!profile.vehiclePurchasedForWork,
      vehicles: profile.vehicles || [],
    },

    consents: {
      agreeToTerms: !!profile.agreeToTerms,
      agreeToPrivacy: !!profile.agreeToPrivacy,
      confirmAccuracy: !!profile.confirmAccuracy,
      onboardingCompleted: !!profile.onboardingCompleted,
      onboardingCompletedAt: profile.onboardingCompletedAt || null,
    },
  };
}

module.exports = {
  mapProfileToOnboardingResponse,
};