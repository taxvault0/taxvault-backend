const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    address: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address',
      default: null,
    },

    spouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Spouse',
      default: null,
    },

    employmentProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmploymentProfile',
      default: null,
    },

    additionalIncomes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdditionalIncome',
      },
    ],

    deductions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Deduction',
      },
    ],

    receiptTypes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ReceiptType',
      },
    ],

    vehicles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
      },
    ],

    employmentProfiles: {
      type: [String],
      default: [],
    },

    familyStatus: {
      type: String,
      default: '',
    },

    numberOfDependents: {
      type: Number,
      default: 0,
      min: 0,
    },

    vehiclePurchasedForWork: {
      type: Boolean,
      default: false,
    },

    agreeToTerms: {
      type: Boolean,
      default: false,
    },

    agreeToPrivacy: {
      type: Boolean,
      default: false,
    },

    confirmAccuracy: {
      type: Boolean,
      default: false,
    },

    onboardingCompleted: {
      type: Boolean,
      default: false,
    },

    onboardingCompletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('UserProfile', userProfileSchema);












