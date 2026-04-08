const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ownerPerson: {
      type: String,
      default: '',
      trim: true,
    },
    ownershipType: {
      type: String,
      default: '',
      trim: true,
    },
    mainUse: {
      type: String,
      default: '',
      trim: true,
    },
    purchaseDate: {
      type: String,
      default: '',
    },
    purchasePrice: {
      type: String,
      default: '',
    },
    gstHstPaid: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Vehicle', vehicleSchema);