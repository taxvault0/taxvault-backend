const mongoose = require('mongoose');

const normalizePhone = (v) => (v ? String(v).replace(/\D/g, '') : v);

const fileObjectSchema = new mongoose.Schema(
  {
    originalName: { type: String, trim: true },
    fileName: { type: String, trim: true },
    filePath: { type: String, trim: true },
    fileUrl: { type: String, trim: true },
    mimeType: { type: String, trim: true },
    size: { type: Number, min: 0 },
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const referenceSchema = new mongoose.Schema(
  {
    referenceName: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    relationship: { type: String, trim: true, default: '' },
    yearsKnown: { type: Number, min: 0, default: 0 }
  },
  { _id: false }
);

const caRegistrationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },

    accountInformation: {
      firstName: { type: String, trim: true, default: '' },
      lastName: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, lowercase: true, default: '' },
      primaryPhone: { type: String, trim: true, default: '', set: normalizePhone },
      alternatePhone: { type: String, trim: true, default: '', set: normalizePhone }
    },

    professionalInformation: {
      caDesignation: {
        type: String,
        trim: true,
        enum: ['CPA', 'CA', 'CGA', 'CMA', 'Other'],
        default: 'Other'
      },
      caNumber: {
        type: String,
        trim: true,
        uppercase: true,
        default: '',
        validate: {
          validator: function (v) {
            if (!v) return true;
            return /^[A-Z0-9-]{5,15}$/.test(v);
          },
          message: 'Invalid CA number'
        }
      },
      provinceOfRegistration: {
        type: String,
        trim: true,
        enum: ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'],
        default: 'ON'
      },
      yearAdmitted: { type: Number, min: 1950, max: new Date().getFullYear() },
      yearsOfExperience: { type: Number, min: 0, default: 0 },
      firmName: { type: String, trim: true, default: '' },
      firmWebsite: { type: String, trim: true, default: '' },
      areasOfExpertise: [{ type: String, trim: true }],
      languagesSpoken: [{ type: String, trim: true }],
      otherLanguage: { type: String, trim: true, default: '' }
    },

    firmDetails: {
      firmAddress: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      province: {
        type: String,
        trim: true,
        enum: ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'],
        default: 'ON'
      },
      postalCode: { type: String, trim: true, default: '' },
      country: { type: String, trim: true, default: 'Canada' },
      firmPhone: { type: String, trim: true, default: '', set: normalizePhone },
      firmEmail: { type: String, trim: true, lowercase: true, default: '' },

      // updated to accept both simple and descriptive frontend values
      firmSize: {
        type: String,
        trim: true,
        enum: [
          'Solo',
          'Small',
          'Medium',
          'Large',
          'Small (2-5 professionals)',
          'Medium (6-20 professionals)',
          'Large (21+ professionals)'
        ],
        default: 'Solo'
      },

      numberOfPartners: { type: Number, min: 0, default: 0 },
      numberOfStaff: { type: Number, min: 0, default: 0 },
      yearEstablished: { type: Number, min: 1900, max: 2100 }
    },

    professionalCredentials: {
      professionalLiabilityInsurance: {
        hasInsurance: { type: Boolean, default: false },
        provider: { type: String, trim: true, default: '' },
        policyNumber: {
          type: String,
          trim: true,
          default: '',
          validate: {
            validator: function (v) {
              if (!v) return true;
              return /^[A-Za-z0-9/-]{6,20}$/.test(v);
            },
            message: 'Invalid policy number'
          }
        },
        coverageAmount: { type: Number, min: 0, default: 0 },
        expiryDate: { type: Date },
        certificateFile: fileObjectSchema
      },

      cpaMembership: {
        isMemberInGoodStanding: { type: Boolean, default: false },
        licenseVerificationNumber: { type: String, trim: true, default: '' }
      },

      peerReview: {
        completedWithinLast3Years: { type: Boolean, default: false },
        reviewDate: { type: Date },
        outcome: {
          type: String,
          trim: true,
          enum: ['', 'Pass', 'Pass with Conditions', 'Pending', 'Other'],
          default: ''
        },
        reportFile: fileObjectSchema
      },

      disciplinaryHistory: {
        hasHistory: { type: Boolean, default: false },
        details: { type: String, trim: true, default: '' }
      },

      criminalRecordCheck: {
        consentGiven: { type: Boolean, default: false },
        documentFile: fileObjectSchema
      }
    },

    practiceInformation: {
      practiceType: { type: String, trim: true, default: '' },
      acceptingNewClients: { type: Boolean, default: true },
      primaryClientTypes: [{ type: String, trim: true }],
      averageClientsPerYear: { type: Number, min: 0, default: 0 },
      minimumFee: { type: Number, min: 0, default: 0 },
      maximumFee: { type: Number, min: 0, default: 0 },
      serviceOfferings: [{ type: String, trim: true }],
      serviceRadiusKm: { type: Number, min: 0, default: 50 },
      hoursOfOperation: { type: Object, default: {} }
    },

    specialtiesAndTechnology: {
      taxSpecialties: [{ type: String, trim: true }],
      provincialSpecialties: [{ type: String, trim: true }],
      internationalSpecialties: [{ type: String, trim: true }],
      accountingSoftware: [{ type: String, trim: true }],
      taxSoftware: [{ type: String, trim: true }],
      practiceManagementSoftware: { type: String, trim: true, default: '' },
      clientPortalAccess: { type: Boolean, default: false },
      digitalDocumentSigning: { type: Boolean, default: false },
      endToEndEncryption: { type: Boolean, default: false },
      twoFactorAuthentication: { type: Boolean, default: false }
    },

    verificationAndDocuments: {
      caCertificateFile: fileObjectSchema,
      professionalHeadshotFile: fileObjectSchema,
      firmLogoFile: fileObjectSchema,
      professionalReferences: [referenceSchema],
      authorizeTaxVaultVerification: { type: Boolean, default: false },
      consentBackgroundCheck: { type: Boolean, default: false }
    },

    reviewAndSubmit: {
      agreedTermsAndConditions: { type: Boolean, default: false },
      agreedPrivacyPolicy: { type: Boolean, default: false },
      agreedProfessionalTerms: { type: Boolean, default: false },
      confirmAccuracy: { type: Boolean, default: false }
    },

    onboarding: {
      currentStep: {
        type: String,
        enum: [
          'account',
          'professional',
          'firm-details',
          'credentials',
          'practice',
          'specialties',
          'verification',
          'review'
        ],
        default: 'account'
      },
      completedSteps: [{ type: String, trim: true }],
      percentComplete: { type: Number, min: 0, max: 100, default: 0 }
    },

    status: {
      type: String,
      enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'changes_requested'],
      default: 'draft',
      index: true
    },

    reviewSummary: {
      submittedAt: { type: Date },
      reviewedAt: { type: Date },
      approvedAt: { type: Date },
      rejectedAt: { type: Date },
      rejectionReason: { type: String, trim: true, default: '' },
      internalNotes: { type: String, trim: true, default: '' },
      reviewErrors: [{ type: String, trim: true }]
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.models.CARegistration || mongoose.model('CARegistration', caRegistrationSchema);