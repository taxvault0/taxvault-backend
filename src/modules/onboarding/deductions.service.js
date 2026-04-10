const Deduction = require('./deduction.model');
const ReceiptType = require('./receipt-type.model');
const UserProfile = require('./user-profile.model');

async function replaceDeductions(userId, deductions = {}, receiptTypes = {}) {
  let profile = await UserProfile.findOne({ user: userId });

  if (!profile) {
    profile = await UserProfile.create({ user: userId });
  }

  if (profile.deductions?.length) {
    await Deduction.deleteMany({ _id: { $in: profile.deductions } });
  }

  if (profile.receiptTypes?.length) {
    await ReceiptType.deleteMany({ _id: { $in: profile.receiptTypes } });
  }

  const deductionDocs = await Deduction.insertMany(
    Object.entries(deductions || {}).map(([category, value]) => ({
      user: userId,
      category,
      value,
    }))
  );

  const receiptTypeDocs = await ReceiptType.insertMany(
    Object.entries(receiptTypes || {}).map(([category, value]) => ({
      user: userId,
      category,
      value,
    }))
  );

  profile.deductions = deductionDocs.map((doc) => doc._id);
  profile.receiptTypes = receiptTypeDocs.map((doc) => doc._id);

  await profile.save();

  return {
    deductions: deductionDocs,
    receiptTypes: receiptTypeDocs,
  };
}

module.exports = {
  replaceDeductions,
};












