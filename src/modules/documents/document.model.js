const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    taxCase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaxCase',
      index: true
    },

    documentRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DocumentRequest',
      default: null,
      index: true
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    documentType: {
      type: String,
      enum: [
        't4',
        't4a',
        't5',
        't3',
        't5008',
        'business-income',
        'gst-return',
        'notice-of-assessment',
        'rental-income',
        'capital-gains',
        'rrsp-contribution',
        'medical-expense',
        'charitable-donation',
        'child-care-expense',
        'tuition-slip',
        'other'
      ],
      required: true,
      index: true
    },

    taxYear: {
      type: Number,
      required: true,
      index: true
    },

    title: {
      type: String,
      trim: true
    },

    fileName: {
      type: String,
      required: true
    },

    originalFileName: {
      type: String
    },

    fileUrl: {
      type: String,
      required: true
    },

    fileKey: {
      type: String,
      required: true
    },

    thumbnailUrl: String,
    fileSize: Number,
    mimeType: String,
    description: String,

    issuer: {
      name: String,
      businessNumber: String,
      address: String
    },

    amount: Number,
    taxWithheld: Number,

    metadata: {
      pages: Number,
      isEncrypted: Boolean,
      hasSignature: Boolean,
      extractedText: String,
      ocrStatus: {
        type: String,
        enum: ['not-started', 'processing', 'completed', 'failed'],
        default: 'not-started'
      }
    },

    status: {
      type: String,
      enum: ['uploaded', 'processed', 'verified', 'rejected'],
      default: 'uploaded',
      index: true
    },

    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
      index: true
    },

    verificationNote: {
      type: String,
      trim: true,
      default: ''
    },

    visibility: {
      type: String,
      enum: ['private', 'shared-with-ca'],
      default: 'shared-with-ca'
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    verifiedAt: Date,
    rejectedAt: Date,

    rejectionReason: String,

    notes: [
      {
        text: String,
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    tags: [String],

    uploadedAt: {
      type: Date,
      default: Date.now,
      index: true
    },

    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

documentSchema.index({ user: 1, taxYear: 1, documentType: 1 });
documentSchema.index({ taxCase: 1, taxYear: 1, status: 1 });
documentSchema.index({ documentRequest: 1 });
documentSchema.index({ verificationStatus: 1, verifiedAt: -1 });

documentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

documentSchema.statics.getDocumentsSummary = async function (userId, taxYear) {
  return this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        taxYear: Number(taxYear)
      }
    },
    {
      $group: {
        _id: '$documentType',
        count: { $sum: 1 },
        statuses: { $addToSet: '$status' },
        verificationStatuses: { $addToSet: '$verificationStatus' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('Document', documentSchema);












