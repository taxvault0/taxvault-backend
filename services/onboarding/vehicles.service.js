const Vehicle = require('../../models/Vehicle');
const UserProfile = require('../../models/UserProfile');

async function replaceVehicles(userId, vehicles = [], vehiclePurchasedForWork = false) {
  let profile = await UserProfile.findOne({ user: userId });

  if (!profile) {
    profile = await UserProfile.create({ user: userId });
  }

  if (profile.vehicles?.length) {
    await Vehicle.deleteMany({ _id: { $in: profile.vehicles } });
  }

  const created = await Vehicle.insertMany(
    (vehicles || []).map((vehicle) => ({
      user: userId,
      ownerPerson: vehicle.ownerPerson || '',
      ownershipType: vehicle.ownershipType || '',
      mainUse: vehicle.mainUse || '',
      purchaseDate: vehicle.purchaseDate || '',
      purchasePrice: vehicle.purchasePrice || '',
      gstHstPaid: vehicle.gstHstPaid || '',
    }))
  );

  profile.vehicles = created.map((doc) => doc._id);
  profile.vehiclePurchasedForWork = !!vehiclePurchasedForWork;

  await profile.save();

  return created;
}

module.exports = {
  replaceVehicles,
};