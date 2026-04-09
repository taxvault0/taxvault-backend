const AdditionalIncome = require('./additional-income.model');
const UserProfile = require('./user-profile.model');

async function replaceAdditionalIncomes(userId, items = []) {
  let profile = await UserProfile.findOne({ user: userId });

  if (!profile) {
    profile = await UserProfile.create({ user: userId });
  }

  if (profile.additionalIncomes?.length) {
    await AdditionalIncome.deleteMany({ _id: { $in: profile.additionalIncomes } });
  }

  const created = await AdditionalIncome.insertMany(
    (items || []).map((item) => ({
      user: userId,
      source: item.source || '',
      amount: item.amount || '',
      notes: item.notes || '',
    }))
  );

  profile.additionalIncomes = created.map((doc) => doc._id);
  await profile.save();

  return created;
}

module.exports = {
  replaceAdditionalIncomes,
};












