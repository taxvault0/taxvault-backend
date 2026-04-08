const mongoose = require('mongoose');

const employmentItemSchema = new mongoose.Schema(
  {
    employmentType: {
      type: String,
      enum: ['employment', 'gig_work', 'self_employed', 'business_owner', 'corporation_active_business'],
      required: true,
    },
    businessName: { type: String, default: null, trim: true },
    employerName: { type: String, default: null, trim: true },
    notes: { type: String, default: null, trim: true },
  },
  { _id: false }
);

const employmentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    profileType: {
      type: String,
      enum: ['primary', 'spouse'],
      required: true,
    },
    isUnemployed: {
      type: Boolean,
      default: false,
    },
    employmentItems: {
      type: [employmentItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

employmentProfileSchema.index({ user: 1, profileType: 1 }, { unique: true });

module.exports = mongoose.model('EmploymentProfile', employmentProfileSchema);
