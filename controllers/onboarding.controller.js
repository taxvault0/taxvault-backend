const crypto = require('crypto');
const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const Address = require('../models/Address');
const Spouse = require('../models/Spouse');
const EmploymentProfile = require('../models/EmploymentProfile');
const AdditionalIncome = require('../models/AdditionalIncome');
const Deduction = require('../models/Deduction');
const ReceiptType = require('../models/ReceiptType');
const Vehicle = require('../models/Vehicle');

const ENCRYPTION_SECRET = process.env.SIN_ENCRYPTION_KEY || process.env.JWT_SECRET || 'taxvault-default-secret-change-me';

const getKey = () => crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();

const encryptValue = (value) => {
  if (!value) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
};

const getCurrentOnboarding = async (userId) => {
  const [profile, address, spouse, employmentProfiles, additionalIncomes, deductions, receiptTypes, vehicles] = await Promise.all([
    UserProfile.findOne({ user: userId }),
    Address.findOne({ user: userId }),
    Spouse.findOne({ user: userId }),
    EmploymentProfile.find({ user: userId }),
    AdditionalIncome.find({ user: userId }),
    Deduction.find({ user: userId }),
    ReceiptType.find({ user: userId }),
    Vehicle.find({ user: userId }),
  ]);

  return {
    userProfile: profile,
    address,
    spouse,
    employmentProfiles,
    additionalIncomes,
    deductions,
    receiptTypes,
    vehicles,
  };
};

const savePersonalDetails = async (userId, body) => {
  const { dob, sinNumber, numberOfDependents, familyStatus, address, postalCode, country, province, city, spouse } = body;

  await UserProfile.findOneAndUpdate(
    { user: userId },
    {
      user: userId,
      dob,
      sinNumberEncrypted: encryptValue(sinNumber),
      numberOfDependents: Number(numberOfDependents || 0),
      familyStatus,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Address.findOneAndUpdate(
    { user: userId },
    {
      user: userId,
      addressLine1: address,
      postalCode,
      country: country || 'Canada',
      province,
      city,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const shouldHaveSpouse = ['married', 'common_law'].includes(familyStatus);
  if (shouldHaveSpouse && spouse) {
    await Spouse.findOneAndUpdate(
      { user: userId },
      {
        user: userId,
        fullName: spouse.fullName,
        dob: spouse.dob,
        sinNumberEncrypted: encryptValue(spouse.sinNumber),
        phone: spouse.phone || null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } else {
    await Spouse.deleteOne({ user: userId });
  }
};

const saveEmployment = async (userId, body) => {
  const payloads = [
    { profileType: 'primary', ...body.primaryTaxpayer },
    { profileType: 'spouse', ...body.spouseTaxDetails },
  ].filter((item) => item && (typeof item.isUnemployed === 'boolean' || Array.isArray(item.employmentItems)));

  await Promise.all(
    payloads.map((payload) =>
      EmploymentProfile.findOneAndUpdate(
        { user: userId, profileType: payload.profileType },
        {
          user: userId,
          profileType: payload.profileType,
          isUnemployed: !!payload.isUnemployed,
          employmentItems: Array.isArray(payload.employmentItems) ? payload.employmentItems : [],
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    )
  );
};

const replaceMany = async (Model, userId, data = []) => {
  await Model.deleteMany({ user: userId });
  if (!Array.isArray(data) || data.length === 0) return;
  await Model.insertMany(data.map((item) => ({ ...item, user: userId })));
};

const saveOnboarding = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (req.body.personalDetails) await savePersonalDetails(req.user.id, req.body.personalDetails);
    if (req.body.employment) await saveEmployment(req.user.id, req.body.employment);
    if (req.body.additionalIncomes) await replaceMany(AdditionalIncome, req.user.id, req.body.additionalIncomes);
    if (req.body.deductions) await replaceMany(Deduction, req.user.id, req.body.deductions);
    if (req.body.receiptTypes) await replaceMany(ReceiptType, req.user.id, req.body.receiptTypes);
    if (req.body.vehicles) await replaceMany(Vehicle, req.user.id, req.body.vehicles);

    await UserProfile.findOneAndUpdate(
      { user: req.user.id },
      {
        termsAccepted: !!req.body.agreeToTerms,
        privacyAccepted: !!req.body.agreeToPrivacy,
        infoConfirmed: !!req.body.confirmAccuracy,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    user.onboardingCompleted = true;
    user.onboardingCompletedAt = new Date();
    await user.save();

    return res.json({
      success: true,
      message: 'Onboarding data saved successfully',
      onboarding: await getCurrentOnboarding(req.user.id),
    });
  } catch (error) {
    console.error('Save onboarding error:', error);
    return res.status(500).json({ success: false, message: 'Error saving onboarding data' });
  }
};

const getOnboarding = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('onboardingCompleted onboardingCompletedAt');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    return res.json({
      success: true,
      onboardingCompleted: user.onboardingCompleted,
      onboardingCompletedAt: user.onboardingCompletedAt,
      onboarding: await getCurrentOnboarding(req.user.id),
    });
  } catch (error) {
    console.error('Get onboarding error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching onboarding data' });
  }
};

const savePersonalDetailsHandler = async (req, res) => {
  try {
    await savePersonalDetails(req.user.id, req.body);
    return res.json({ success: true, message: 'Personal details saved' });
  } catch (error) {
    console.error('Save personal details error:', error);
    return res.status(500).json({ success: false, message: 'Error saving personal details' });
  }
};

const saveEmploymentHandler = async (req, res) => {
  try {
    await saveEmployment(req.user.id, req.body);
    return res.json({ success: true, message: 'Employment details saved' });
  } catch (error) {
    console.error('Save employment details error:', error);
    return res.status(500).json({ success: false, message: 'Error saving employment details' });
  }
};

const saveAdditionalIncomeHandler = async (req, res) => {
  try {
    await replaceMany(AdditionalIncome, req.user.id, req.body.additionalIncomes || []);
    return res.json({ success: true, message: 'Additional incomes saved' });
  } catch (error) {
    console.error('Save additional income error:', error);
    return res.status(500).json({ success: false, message: 'Error saving additional incomes' });
  }
};

const saveDeductionsHandler = async (req, res) => {
  try {
    await replaceMany(Deduction, req.user.id, req.body.deductions || []);
    await replaceMany(ReceiptType, req.user.id, req.body.receiptTypes || []);
    return res.json({ success: true, message: 'Deductions and receipt types saved' });
  } catch (error) {
    console.error('Save deductions error:', error);
    return res.status(500).json({ success: false, message: 'Error saving deductions and receipts' });
  }
};

const saveVehiclesHandler = async (req, res) => {
  try {
    await replaceMany(Vehicle, req.user.id, req.body.vehicles || []);
    return res.json({ success: true, message: 'Vehicle details saved' });
  } catch (error) {
    console.error('Save vehicles error:', error);
    return res.status(500).json({ success: false, message: 'Error saving vehicles' });
  }
};

const saveConsentsHandler = async (req, res) => {
  try {
    await UserProfile.findOneAndUpdate(
      { user: req.user.id },
      {
        user: req.user.id,
        termsAccepted: !!req.body.agreeToTerms,
        privacyAccepted: !!req.body.agreeToPrivacy,
        infoConfirmed: !!req.body.confirmAccuracy,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({ success: true, message: 'Consents saved' });
  } catch (error) {
    console.error('Save consent error:', error);
    return res.status(500).json({ success: false, message: 'Error saving consents' });
  }
};

module.exports = {
  saveOnboarding,
  getOnboarding,
  savePersonalDetailsHandler,
  saveEmploymentHandler,
  saveAdditionalIncomeHandler,
  saveDeductionsHandler,
  saveVehiclesHandler,
  saveConsentsHandler,
};
