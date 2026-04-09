const CARegistration = require('../models/CARegistration');
const CAProfile = require('../models/CAProfile');
const User = require('../models/User');

const STEP_ORDER = [
  'account',
  'professional',
  'firm-details',
  'credentials',
  'practice',
  'specialties',
  'verification',
  'review'
];

const PROVINCE_NAME_TO_CODE = {
  Alberta: 'AB',
  'British Columbia': 'BC',
  Manitoba: 'MB',
  'New Brunswick': 'NB',
  Newfoundland: 'NL',
  'Newfoundland and Labrador': 'NL',
  'Nova Scotia': 'NS',
  Ontario: 'ON',
  'Prince Edward Island': 'PE',
  Quebec: 'QC',
  Saskatchewan: 'SK',
  'Northwest Territories': 'NT',
  Nunavut: 'NU',
  Yukon: 'YT',
  AB: 'AB',
  BC: 'BC',
  MB: 'MB',
  NB: 'NB',
  NL: 'NL',
  NS: 'NS',
  ON: 'ON',
  PE: 'PE',
  QC: 'QC',
  SK: 'SK',
  NT: 'NT',
  NU: 'NU',
  YT: 'YT'
};

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

const normalizeProvince = (value) => {
  if (!value) return value;
  return PROVINCE_NAME_TO_CODE[value] || value;
};

const normalizeFile = (file) => {
  if (!file) return undefined;

  return {
    originalName: file.originalName || file.name || '',
    fileName: file.fileName || file.filename || '',
    filePath: file.filePath || file.path || '',
    fileUrl: file.fileUrl || file.url || '',
    mimeType: file.mimeType || file.mimetype || '',
    size: file.size || 0,
    uploadedAt: file.uploadedAt || new Date()
  };
};

const buildPayload = (body = {}) => {
  const payload = {};

  if (hasOwn(body, 'accountInformation')) {
    payload.accountInformation = {
      firstName: body.accountInformation?.firstName ?? '',
      lastName: body.accountInformation?.lastName ?? '',
      email: body.accountInformation?.email ?? '',
      primaryPhone: body.accountInformation?.primaryPhone ?? '',
      alternatePhone: body.accountInformation?.alternatePhone ?? ''
    };
  }

  if (hasOwn(body, 'professionalInformation')) {
    payload.professionalInformation = {
      caDesignation: body.professionalInformation?.caDesignation ?? '',
      caNumber: body.professionalInformation?.caNumber ?? '',
      provinceOfRegistration: normalizeProvince(body.professionalInformation?.provinceOfRegistration),
      yearAdmitted: body.professionalInformation?.yearAdmitted ?? null,
      yearsOfExperience: body.professionalInformation?.yearsOfExperience ?? null,
      firmName: body.professionalInformation?.firmName ?? '',
      firmWebsite: body.professionalInformation?.firmWebsite ?? '',
      areasOfExpertise: body.professionalInformation?.areasOfExpertise ?? [],
      languagesSpoken: body.professionalInformation?.languagesSpoken ?? []
    };
  }

  if (hasOwn(body, 'firmDetails')) {
    payload.firmDetails = {
      firmAddress: body.firmDetails?.firmAddress ?? '',
      city: body.firmDetails?.city ?? '',
      province: normalizeProvince(body.firmDetails?.province),
      postalCode: body.firmDetails?.postalCode ?? '',
      country: body.firmDetails?.country ?? 'Canada',
      firmPhone: body.firmDetails?.firmPhone ?? '',
      firmEmail: body.firmDetails?.firmEmail ?? '',
      firmSize: body.firmDetails?.firmSize ?? 'Solo',
      numberOfPartners: body.firmDetails?.numberOfPartners ?? 0,
      numberOfStaff: body.firmDetails?.numberOfStaff ?? 0,
      yearEstablished: body.firmDetails?.yearEstablished ?? null
    };
  }

  if (hasOwn(body, 'professionalCredentials')) {
    payload.professionalCredentials = {
      professionalLiabilityInsurance: {
        hasInsurance:
          body.professionalCredentials?.professionalLiabilityInsurance?.hasInsurance ?? false,
        provider: body.professionalCredentials?.professionalLiabilityInsurance?.provider ?? '',
        policyNumber:
          body.professionalCredentials?.professionalLiabilityInsurance?.policyNumber ?? '',
        coverageAmount:
          body.professionalCredentials?.professionalLiabilityInsurance?.coverageAmount ?? 0,
        expiryDate:
          body.professionalCredentials?.professionalLiabilityInsurance?.expiryDate ?? undefined,
        certificateFile: normalizeFile(
          body.professionalCredentials?.professionalLiabilityInsurance?.certificateFile
        )
      },

      cpaMembership: {
        isMemberInGoodStanding:
          body.professionalCredentials?.cpaMembership?.isMemberInGoodStanding ?? false,
        licenseVerificationNumber:
          body.professionalCredentials?.cpaMembership?.licenseVerificationNumber ?? ''
      },

      peerReview: {
        completedWithinLast3Years:
          body.professionalCredentials?.peerReview?.completedWithinLast3Years ?? false,
        reviewDate: body.professionalCredentials?.peerReview?.reviewDate ?? undefined,
        outcome: body.professionalCredentials?.peerReview?.outcome ?? '',
        reportFile: normalizeFile(body.professionalCredentials?.peerReview?.reportFile)
      },

      disciplinaryHistory: {
        hasHistory: body.professionalCredentials?.disciplinaryHistory?.hasHistory ?? false,
        details: body.professionalCredentials?.disciplinaryHistory?.details ?? ''
      },

      criminalRecordCheck: {
        consentGiven: body.professionalCredentials?.criminalRecordCheck?.consentGiven ?? false,
        documentFile: normalizeFile(body.professionalCredentials?.criminalRecordCheck?.documentFile)
      }
    };
  }

  if (hasOwn(body, 'practiceInformation')) {
    payload.practiceInformation = {
      practiceType: body.practiceInformation?.practiceType ?? '',
      acceptingNewClients: body.practiceInformation?.acceptingNewClients ?? true,
      primaryClientTypes: body.practiceInformation?.primaryClientTypes ?? [],
      averageClientsPerYear: body.practiceInformation?.averageClientsPerYear ?? 0,
      minimumFee: body.practiceInformation?.minimumFee ?? 0,
      maximumFee: body.practiceInformation?.maximumFee ?? 0,
      serviceOfferings: body.practiceInformation?.serviceOfferings ?? [],
      serviceRadiusKm: body.practiceInformation?.serviceRadiusKm ?? 50,
      hoursOfOperation: body.practiceInformation?.hoursOfOperation ?? ''
    };
  }

  if (hasOwn(body, 'specialtiesAndTechnology')) {
    payload.specialtiesAndTechnology = {
      taxSpecialties: body.specialtiesAndTechnology?.taxSpecialties ?? [],
      provincialSpecialties: body.specialtiesAndTechnology?.provincialSpecialties ?? [],
      internationalSpecialties: body.specialtiesAndTechnology?.internationalSpecialties ?? [],
      accountingSoftware: body.specialtiesAndTechnology?.accountingSoftware ?? [],
      taxSoftware: body.specialtiesAndTechnology?.taxSoftware ?? [],
      practiceManagementSoftware: body.specialtiesAndTechnology?.practiceManagementSoftware ?? '',
      clientPortalAccess: body.specialtiesAndTechnology?.clientPortalAccess ?? false,
      digitalDocumentSigning: body.specialtiesAndTechnology?.digitalDocumentSigning ?? false,
      endToEndEncryption: body.specialtiesAndTechnology?.endToEndEncryption ?? false,
      twoFactorAuthentication: body.specialtiesAndTechnology?.twoFactorAuthentication ?? false
    };
  }

  if (hasOwn(body, 'verificationAndDocuments')) {
    payload.verificationAndDocuments = {
      caCertificateFile: normalizeFile(body.verificationAndDocuments?.caCertificateFile),
      professionalHeadshotFile: normalizeFile(body.verificationAndDocuments?.professionalHeadshotFile),
      firmLogoFile: normalizeFile(body.verificationAndDocuments?.firmLogoFile),
      professionalReferences: body.verificationAndDocuments?.professionalReferences ?? [],
      authorizeTaxVaultVerification:
        body.verificationAndDocuments?.authorizeTaxVaultVerification ?? false,
      consentBackgroundCheck: body.verificationAndDocuments?.consentBackgroundCheck ?? false
    };
  }

  if (hasOwn(body, 'reviewAndSubmit')) {
    payload.reviewAndSubmit = {
      agreedTermsAndConditions: body.reviewAndSubmit?.agreedTermsAndConditions ?? false,
      agreedPrivacyPolicy: body.reviewAndSubmit?.agreedPrivacyPolicy ?? false,
      agreedProfessionalTerms: body.reviewAndSubmit?.agreedProfessionalTerms ?? false,
      confirmAccuracy: body.reviewAndSubmit?.confirmAccuracy ?? false
    };
  }

  if (hasOwn(body, 'onboarding')) {
    payload.onboarding = {
      currentStep: body.onboarding?.currentStep ?? 'account',
      completedSteps: body.onboarding?.completedSteps ?? [],
      percentComplete: body.onboarding?.percentComplete ?? 0
    };
  }

  return payload;
};

const deepMergeSection = (existingValue, incomingValue) => {
  if (incomingValue === undefined) return existingValue;
  if (incomingValue === null) return null;
  if (Array.isArray(incomingValue)) return incomingValue;
  if (incomingValue instanceof Date) return incomingValue;

  if (incomingValue && typeof incomingValue === 'object') {
    const existingObject =
      existingValue && typeof existingValue.toObject === 'function'
        ? existingValue.toObject()
        : existingValue && typeof existingValue === 'object'
          ? existingValue
          : {};

    const result = { ...existingObject };

    Object.keys(incomingValue).forEach((key) => {
      result[key] = deepMergeSection(existingObject[key], incomingValue[key]);
    });

    return result;
  }

  return incomingValue;
};

const validateSubmission = (registration) => {
  const errors = [];

  if (!registration.accountInformation?.firstName) errors.push('First name is required');
  if (!registration.accountInformation?.lastName) errors.push('Last name is required');
  if (!registration.accountInformation?.email) errors.push('Email is required');
  if (!registration.accountInformation?.primaryPhone) errors.push('Primary phone is required');

  if (!registration.professionalInformation?.caDesignation) errors.push('CA designation is required');
  if (!registration.professionalInformation?.caNumber) errors.push('CA number is required');
  if (!registration.professionalInformation?.provinceOfRegistration) {
    errors.push('Province of registration is required');
  }
  if (!registration.professionalInformation?.firmName) errors.push('Firm name is required');

  if (!registration.firmDetails?.firmAddress) errors.push('Firm address is required');
  if (!registration.firmDetails?.city) errors.push('City is required');
  if (!registration.firmDetails?.province) errors.push('Firm province is required');
  if (!registration.firmDetails?.postalCode) errors.push('Postal code is required');
  if (!registration.firmDetails?.firmPhone) errors.push('Firm phone is required');
  if (!registration.firmDetails?.firmEmail) errors.push('Firm email is required');

  const cert = registration.verificationAndDocuments?.caCertificateFile;
  if (!cert || (!cert.fileName && !cert.fileUrl && !cert.filePath)) {
    errors.push('CA certificate is required');
  }

  if (!registration.verificationAndDocuments?.authorizeTaxVaultVerification) {
    errors.push('Authorization for TaxVault verification is required');
  }

  if (!registration.verificationAndDocuments?.consentBackgroundCheck) {
    errors.push('Background check consent is required');
  }

  if (!registration.reviewAndSubmit?.agreedTermsAndConditions) {
    errors.push('Terms and Conditions must be accepted');
  }

  if (!registration.reviewAndSubmit?.agreedPrivacyPolicy) {
    errors.push('Privacy Policy must be accepted');
  }

  if (!registration.reviewAndSubmit?.agreedProfessionalTerms) {
    errors.push('Professional Terms must be accepted');
  }

  if (!registration.reviewAndSubmit?.confirmAccuracy) {
    errors.push('Accuracy confirmation is required');
  }

  return errors;
};

const syncProfileFromRegistration = async (registration, userId) => {
  const coordinates = [-79.3832, 43.6532];

  await CAProfile.findOneAndUpdate(
    { user: userId },
    {
      user: userId,
      firmName: registration.professionalInformation?.firmName || '',
      firmLogo:
        registration.verificationAndDocuments?.firmLogoFile?.fileUrl ||
        registration.verificationAndDocuments?.firmLogoFile?.filePath ||
        '',
      yearsOfExperience: registration.professionalInformation?.yearsOfExperience,
      address: {
        street: registration.firmDetails?.firmAddress || '',
        city: registration.firmDetails?.city || '',
        province: registration.firmDetails?.province || '',
        postalCode: registration.firmDetails?.postalCode || '',
        country: registration.firmDetails?.country || 'Canada'
      },
      location: {
        type: 'Point',
        coordinates
      },
      serviceRadius: registration.practiceInformation?.serviceRadiusKm || 50,
      specializations: registration.specialtiesAndTechnology?.taxSpecialties || [],
      services: registration.practiceInformation?.serviceOfferings || [],
      languages: (registration.professionalInformation?.languagesSpoken || []).map((lang) =>
        String(lang).toLowerCase()
      ),
      phone: registration.firmDetails?.firmPhone || registration.accountInformation?.primaryPhone || '',
      website: registration.professionalInformation?.firmWebsite || '',
      acceptingNewClients: registration.practiceInformation?.acceptingNewClients ?? true,
      availabilityStatus:
        registration.practiceInformation?.acceptingNewClients ?? true ? 'active' : 'not-accepting',
      verified: ['submitted', 'under_review', 'approved'].includes(registration.status),
      updatedAt: new Date()
    },
    { upsert: true, new: true, runValidators: false }
  );
};

const updateUserFromRegistration = async (userId, registration) => {
  const updateData = {
    role: 'ca',
    userType: 'other'
  };

  const firstName = registration.accountInformation?.firstName || '';
  const lastName = registration.accountInformation?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) updateData.name = fullName;
  if (registration.accountInformation?.email) updateData.email = registration.accountInformation.email;
  if (registration.accountInformation?.primaryPhone) {
    updateData.phoneNumber = registration.accountInformation.primaryPhone;
  }
  if (registration.firmDetails?.province) {
    updateData.province = registration.firmDetails.province;
  }

  await User.findByIdAndUpdate(userId, updateData);
};

exports.saveDraft = async (req, res) => {
  try {
    console.log('HEADERS:', req.headers['content-type']);
    console.log('BODY:', JSON.stringify(req.body, null, 2));

    if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Request body is empty or not valid JSON',
        receivedBody: req.body ?? null,
        contentType: req.headers['content-type'] || null
      });
    }

    const existing = await CARegistration.findOne({ user: req.user.id });
    const payload = buildPayload(req.body);

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid CA registration sections were found in request body',
        expectedSections: [
          'accountInformation',
          'professionalInformation',
          'firmDetails',
          'professionalCredentials',
          'practiceInformation',
          'specialtiesAndTechnology',
          'verificationAndDocuments',
          'reviewAndSubmit',
          'onboarding'
        ],
        receivedKeys: Object.keys(req.body || {})
      });
    }

    if (!existing) {
      const registration = await CARegistration.create({
        user: req.user.id,
        ...payload,
        status: 'draft'
      });

      await updateUserFromRegistration(req.user.id, registration);
      await syncProfileFromRegistration(registration, req.user.id);

      return res.json({
        success: true,
        message: 'CA registration draft saved successfully',
        registration
      });
    }

    Object.keys(payload).forEach((key) => {
      existing[key] = deepMergeSection(existing[key], payload[key]);
    });

    existing.status = 'draft';
    await existing.save();

    await updateUserFromRegistration(req.user.id, existing);
    await syncProfileFromRegistration(existing, req.user.id);

    return res.json({
      success: true,
      message: 'CA registration draft saved successfully',
      registration: existing
    });
  } catch (error) {
    console.error('saveDraft error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save CA registration draft',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.submitRegistration = async (req, res) => {
  try {
    const existing = await CARegistration.findOne({ user: req.user.id });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'No CA registration draft found'
      });
    }

    if (existing.status === 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Registration already submitted'
      });
    }

    if (req.body && Object.keys(req.body).length > 0) {
      const payload = buildPayload(req.body);

      Object.keys(payload).forEach((key) => {
        existing[key] = deepMergeSection(existing[key], payload[key]);
      });
    }

    const errors = validateSubmission(existing);

    if (errors.length > 0) {
      existing.reviewSummary = existing.reviewSummary || {};
      existing.reviewSummary.reviewErrors = errors;
      await existing.save();

      return res.status(400).json({
        success: false,
        message: 'Please fix the validation errors before submitting',
        errors
      });
    }

    existing.status = 'submitted';
    existing.reviewSummary = existing.reviewSummary || {};
    existing.reviewSummary.submittedAt = new Date();
    existing.reviewSummary.reviewErrors = [];
    existing.onboarding.currentStep = 'review';
    existing.onboarding.completedSteps = STEP_ORDER;
    existing.onboarding.percentComplete = 100;

    await existing.save();

    await updateUserFromRegistration(req.user.id, existing);
    await syncProfileFromRegistration(existing, req.user.id);

    return res.json({
      success: true,
      message: 'CA registration submitted successfully',
      registration: existing
    });
  } catch (error) {
    console.error('submitRegistration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit CA registration'
    });
  }
};

exports.getMyRegistration = async (req, res) => {
  try {
    const registration = await CARegistration.findOne({ user: req.user.id }).populate(
      'user',
      'name email role phoneNumber province'
    );

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'CA registration not found'
      });
    }

    return res.json({
      success: true,
      registration
    });
  } catch (error) {
    console.error('getMyRegistration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch CA registration'
    });
  }
};

exports.getDashboardSummary = async (req, res) => {
  try {
    const registration = await CARegistration.findOne({ user: req.user.id }).lean();

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'CA registration not found'
      });
    }

    return res.json({
      success: true,
      dashboard: {
        status: registration.status,
        submittedAt: registration.reviewSummary?.submittedAt || null,
        professionalSummary: {
          name: `${registration.accountInformation?.firstName || ''} ${registration.accountInformation?.lastName || ''}`.trim(),
          designation: registration.professionalInformation?.caDesignation || '',
          caNumber: registration.professionalInformation?.caNumber || '',
          province: registration.professionalInformation?.provinceOfRegistration || '',
          experience: registration.professionalInformation?.yearsOfExperience || 0,
          firm: registration.professionalInformation?.firmName || ''
        },
        credentialsStatus: {
          hasInsurance:
            registration.professionalCredentials?.professionalLiabilityInsurance?.hasInsurance || false,
          cpaMemberInGoodStanding:
            registration.professionalCredentials?.cpaMembership?.isMemberInGoodStanding || false,
          hasDisciplinaryHistory:
            registration.professionalCredentials?.disciplinaryHistory?.hasHistory || false
        },
        documentsUploaded: {
          caCertificate: registration.verificationAndDocuments?.caCertificateFile || null,
          professionalHeadshot: registration.verificationAndDocuments?.professionalHeadshotFile || null,
          firmLogo: registration.verificationAndDocuments?.firmLogoFile || null
        },
        reviewErrors: registration.reviewSummary?.reviewErrors || []
      }
    });
  } catch (error) {
    console.error('getDashboardSummary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard summary'
    });
  }
};