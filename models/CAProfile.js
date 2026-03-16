const mongoose = require('mongoose');

const caProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Professional Information
  firmName: {
    type: String,
    required: true
  },
  firmLogo: String,
  bio: {
    type: String,
    maxlength: 500
  },
  yearsOfExperience: Number,
  
  // Location
  address: {
    street: String,
    city: String,
    province: {
      type: String,
      enum: ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'ON', 'PE', 'QC', 'SK', 'NT', 'NU', 'YT']
    },
    postalCode: String,
    country: { type: String, default: 'Canada' }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  serviceRadius: {
    type: Number, // in km
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
  availableFor: [{
    type: String,
    enum: ['gig-worker', 'shop-owner', 'employee', 'contractor', 'all']
  }],
  
  // Specializations
  specializations: [{
    type: String,
    enum: [
      'gig-economy', 'rideshare', 'delivery', 
      'retail', 'franchise', 'restaurant',
      'construction', 'real-estate', 'technology',
      'healthcare', 'professional-services'
    ]
  }],
  
  // Services Offered
  services: [{
    type: String,
    enum: [
      'personal-tax', 'corporate-tax', 'gst-hst',
      'payroll', 'bookkeeping', 'audit',
      'financial-planning', 'estate-planning',
      'business-valuation', 'cra-representation'
    ]
  }],
  
  // Languages
  languages: [{
    type: String,
    enum: ['english', 'french', 'spanish', 'mandarin', 'cantonese', 'punjabi', 'arabic']
  }],
  
  // Contact Information
  phone: String,
  website: String,
  
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
  reviews: [{
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
    comment: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Verification
  verified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  
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

// Geospatial index for location-based queries
caProfileSchema.index({ location: '2dsphere' });

// Text index for search
caProfileSchema.index({ 
  firmName: 'text', 
  bio: 'text',
  'specializations': 'text'
});

module.exports = mongoose.model('CAProfile', caProfileSchema);