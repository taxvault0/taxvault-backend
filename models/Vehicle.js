const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vehicleOwner: { type: String, enum: ['primary', 'spouse', 'joint'], required: true },
    ownershipType: { type: String, required: true, trim: true },
    mainUse: { type: String, required: true, trim: true },
    purchaseDate: { type: Date, required: true },
    purchasePrice: { type: Number, required: true },
    gstHstPaid: { type: Number, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vehicle', vehicleSchema);
