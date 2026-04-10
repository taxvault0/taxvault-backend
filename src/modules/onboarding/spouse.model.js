const mongoose = require('mongoose');

const spouseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    dob: {
      type: String,
      default: '',
    },
    sin: {
      type: String,
      default: '',
      select: false,
    },
    phone: {
      type: String,
      default: '',
    },
    gigPlatforms: {
      type: [String],
      default: [],
    },
    additionalIncomeSources: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Spouse', spouseSchema);












