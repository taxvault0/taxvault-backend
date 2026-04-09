const mongoose = require('mongoose');

const normalizePhone = (v) => (v ? String(v).replace(/\D/g, '') : v);

const dayHoursSchema = new mongoose.Schema(
  {
    open: { type: String, trim: true, default: '' },
    close: { type: String, trim: true, default: '' },
    closed: { type: Boolean, default: false }
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    comment: {
      type: String,
      trim: true,
      default: ''
    },
    date: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const caProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },

  // Professional Information
  firmName: {
    type: String,
    required: true,
    trim: true
  },
  firmLogo: {
    type: String,
    trim: true,
    default: ''
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  yearsOfExperience: {
    type: Number,
    min: 0,
    max: 80,
    default: 0
  },

  // Additional Professional Fields
  otherLanguage: {
    type: String,
    trim: true,
    default: ''
  },
  licenseNumber: {
    type: String,
    trim: true,
    uppercase: true,
    default: ''
  },
  policyNumber: {
    type: String,
    trim: true,
    uppercase: true,
    default: ''
  },
  yearAdmitted: {
    type: Number,
    min: 1950,
    validate: {
      validator(value) {
        return value == null || value <= new Date().getFullYear();
      },
      message: 'yearAdmitted cannot be in the future'
    }
  },
  peerReviewDate: {
    type: Date,
    default: null
  },

  // Location
  address: {
    street: {
      type: String,
      trim: true,
      default: ''
    },
    city: {
      type: String,
      trim: true,
      default: ''
    },
    province: {
      type: String,
      enum: ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'ON', 'PE', 'QC', 'SK', 'NT', 'NU', 'YT'],
      uppercase: true,
      trim: true
    },
    postalCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: ''
    },
    country: {
      type: String,
      trim: true,
      default: 'Canada'
    }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: undefined,
      validate: {
        validator(value) {
          return (
            value == null ||
            (Array.isArray(value) &&
              value.length === 2 &&
              value.every((num) => typeof num === 'number' && !Number.isNaN(num)))
          );
        },
        message: 'location.coordinates must be [lng, lat]'
      }
    }
  },
  serviceRadius: {
    type: Number,
    min: 0,
    default: 50
  },

  // Availability
  acceptingNewClients: {
    type: Boolean,
    default: true
  },
  availabilityStatus: {
    type: String,
    enum: ['active', 'busy', 'not-accepting'],
    default: 'active'
  },
  availableFor: [
    {
      type: String,
      enum: ['gig-worker', 'shop-owner', 'employee', 'contractor', 'all']
    }
  ],

  // Specializations
  specializations: [
    {
      type: String,
      enum: [
        'gig-economy',
        'rideshare',
        'delivery',
        'retail',
        'franchise',
        'restaurant',
        'construction',
        'real-estate',
        'technology',
        'healthcare',
        'professional-services'
      ]
    }
  ],

  // Services Offered
  services: [
    {
      type: String,
      enum: [
        'personal-tax',
        'corporate-tax',
        'gst-hst',
        'payroll',
        'bookkeeping',
        'audit',
        'financial-planning',
        'estate-planning',
        'business-valuation',
        'cra-representation'
      ]
    }
  ],

  // Languages
  languages: [
    {
      type: String,
      enum: [
        'english',
        'french',
        'spanish',
        'mandarin',
        'cantonese',
        'punjabi',
        'arabic',
        'hindi',
        'persian',
        'tagalog',
        'other'
      ]
    }
  ],

  // Contact Information
  phone: {
    type: String,
    set: normalizePhone,
    trim: true,
    default: ''
  },
  alternatePhone: {
    type: String,
    set: normalizePhone,
    trim: true,
    default: ''
  },
  firmPhone: {
    type: String,
    set: normalizePhone,
    trim: true,
    default: ''
  },
  website: {
    type: String,
    trim: true,
    default: ''
  },

  // Hours of Operation
  hoursOfOperation: {
    monday: { type: dayHoursSchema, default: () => ({}) },
    tuesday: { type: dayHoursSchema, default: () => ({}) },
    wednesday: { type: dayHoursSchema, default: () => ({}) },
    thursday: { type: dayHoursSchema, default: () => ({}) },
    friday: { type: dayHoursSchema, default: () => ({}) },
    saturday: { type: dayHoursSchema, default: () => ({}) },
    sunday: { type: dayHoursSchema, default: () => ({}) }
  },

  // Social Proof
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  reviews: {
    type: [reviewSchema],
    default: []
  },

  // Verification
  verified: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: Date,
    default: null
  },

  // Stats
  profileViews: {
    type: Number,
    default: 0
  },
  connectionRequests: {
    type: Number,
    default: 0
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

caProfileSchema.pre('save', function saveHook(next) {
  this.updatedAt = new Date();
  next();
});

caProfileSchema.pre('findOneAndUpdate', function updateHook(next) {
  this.set({ updatedAt: new Date() });
  next();
});

caProfileSchema.path('otherLanguage').validate(function validateOtherLanguage(value) {
  if (Array.isArray(this.languages) && this.languages.includes('other')) {
    return Boolean(value && String(value).trim());
  }
  return true;
}, 'otherLanguage is required when languages includes "other"');

caProfileSchema.index({ location: '2dsphere' });

caProfileSchema.index({
  firmName: 'text',
  bio: 'text',
  specializations: 'text',
  services: 'text'
});

module.exports = mongoose.model('CAProfile', caProfileSchema);