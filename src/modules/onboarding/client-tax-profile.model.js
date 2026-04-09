const mongoose = require('mongoose');

const spouseSchema = new mongoose.Schema(
  {
    fullName: String,
    email: String,
    phoneNumber: String,
    sinLast4: String,
    dateOfBirth: Date,
    incomeType: {
      type: String,
      enum: ['employee', 'self-employed', 'gig-worker', 'business-owner', 'student', 'other'],
      default: 'employee'
    },
    hasPortalAccess: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const dependentSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    relationship: { type: String, default: 'child' },
    dateOfBirth: Date,
    disabilityEligible: { type: Boolean, default: false },
    childcareExpenses: { type: Boolean, default: false }
  },
  { _id: false }
);

const clientTaxProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    taxYear: {
      type: Number,
      required: true,
      index: true
    },

    filingStatus: {
      type: String,
      enum: ['single', 'married', 'common-law', 'separated', 'divorced', 'widowed'],
      default: 'single'
    },

    residencyStatus: {
      type: String,
      enum: ['resident', 'non-resident', 'deemed-resident', 'new-immigrant', 'emigrant'],
      default: 'resident'
    },

    incomeSources: {
      employment: { type: Boolean, default: false },
      gigWork: { type: Boolean, default: false },
      selfEmployment: { type: Boolean, default: false },
      businessOwner: { type: Boolean, default: false },
      rentalIncome: { type: Boolean, default: false },
      investments: { type: Boolean, default: false },
      foreignIncome: { type: Boolean, default: false },
      studentIncome: { type: Boolean, default: false }
    },

    taxSituations: {
      workFromHome: { type: Boolean, default: false },
      homeOffice: { type: Boolean, default: false },
      vehicleExpenses: { type: Boolean, default: false },
      gstHstRegistered: { type: Boolean, default: false },
      payrollObligations: { type: Boolean, default: false },
      capitalGains: { type: Boolean, default: false },
      rrspContributions: { type: Boolean, default: false },
      tuitionCredits: { type: Boolean, default: false },
      medicalExpenses: { type: Boolean, default: false },
      charitableDonations: { type: Boolean, default: false }
    },

    spouse: {
      hasSpouse: { type: Boolean, default: false },
      details: spouseSchema
    },

    dependents: [dependentSchema],

    businessDetails: {
      legalName: String,
      operatingName: String,
      businessNumber: String,
      industry: String,
      gstHstNumber: String,
      payrollNumber: String,
      incorporated: { type: Boolean, default: false },
      employeeCount: { type: Number, default: 0 }
    },

    gigPlatforms: [
      {
        type: String,
        enum: [
          'uber',
          'ubereats',
          'doordash',
          'skip',
          'instacart',
          'lyft',
          'amazon',
          'etsy',
          'shopify',
          'other'
        ]
      }
    ],

    notes: String,

    completion: {
      basicsComplete: { type: Boolean, default: false },
      incomeComplete: { type: Boolean, default: false },
      familyComplete: { type: Boolean, default: false },
      businessComplete: { type: Boolean, default: false }
    }
  },
  {
    timestamps: true
  }
);

clientTaxProfileSchema.index({ user: 1, taxYear: 1 }, { unique: true });

module.exports = mongoose.model('ClientTaxProfile', clientTaxProfileSchema);












