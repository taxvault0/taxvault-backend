const mongoose = require('mongoose');

const FAMILY_STATUS = ['single', 'married', 'common_law', 'separated', 'divorced', 'widowed'];

const userProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    dob: {
      type: Date,
      required: true,
    },
    sinNumberEncrypted: {
      type: String,
      default: null,
      select: false,
    },
    numberOfDependents: {
      type: Number,
      default: 0,
      min: 0,
    },
    familyStatus: {
      type: String,
      enum: FAMILY_STATUS,
      default: 'single',
    },
    termsAccepted: {
      type: Boolean,
      default: false,
    },
    privacyAccepted: {
      type: Boolean,
      default: false,
    },
    infoConfirmed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserProfile', userProfileSchema);
