const mongoose = require('mongoose');

const caProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    firmName: { type: String, default: '' },
    firmLogo: { type: String, default: '' },

    yearsOfExperience: { type: Number, default: 0 },
    otherLanguage: { type: String, default: '' },

    licenseNumber: { type: String, default: '' },
    policyNumber: { type: String, default: '' },

    yearAdmitted: { type: Number },
    peerReviewDate: { type: Date },

    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      province: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      country: { type: String, default: 'Canada' },
    },

    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },

    serviceRadius: { type: Number, default: 50 },

    specializations: { type: [String], default: [] },
    services: { type: [String], default: [] },
    languages: { type: [String], default: [] },

    phone: { type: String, default: '' },
    alternatePhone: { type: String, default: '' },
    firmPhone: { type: String, default: '' },

    website: { type: String, default: '' },

    hoursOfOperation: { type: Object, default: {} },

    acceptingNewClients: { type: Boolean, default: true },
    availabilityStatus: {
      type: String,
      enum: ['active', 'not-accepting'],
      default: 'active',
    },

    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date },

    profileViews: { type: Number, default: 0 },
    connectionRequests: { type: Number, default: 0 },

    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.CAProfile ||
  mongoose.model('CAProfile', caProfileSchema);