const mongoose = require('mongoose');

const documentRequestSchema = new mongoose.Schema(
  {
    taxCase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaxCase',
      required: true,
      index: true
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    ca: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    taxYear: {
      type: Number,
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
      default: 'other'
    },

    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      trim: true,
      default: ''
    },

    required: {
      type: Boolean,
      default: true
    },

    requiredFor: {
      type: String,
      enum: ['client', 'spouse', 'business', 'household'],
      default: 'client'
    },

    category: {
      type: String,
      enum: [
        'identity',
        'income-proof',
        'banking',
        'investment',
        'business',
        'property',
        'tax-proof',
        'other'
      ],
      default: 'other'
    },

    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },

    dueDate: Date,

    status: {
      type: String,
      enum: [
        'open',
        'pending',
        'uploaded',
        'needs-info',
        'fulfilled',
        'verified',
        'rejected',
        'cancelled'
      ],
      default: 'open',
      index: true
    },

    reviewStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
      index: true
    },

    submittedDocument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null
    },

    uploadedDocument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null
    },

    noteToClient: {
      type: String,
      trim: true,
      default: ''
    },

    caReviewNote: {
      type: String,
      trim: true,
      default: ''
    },

    requestedAt: {
      type: Date,
      default: Date.now
    },

    fulfilledAt: Date,
    verifiedAt: Date,
    rejectedAt: Date,

    comments: [
      {
        text: {
          type: String,
          required: true,
          trim: true
        },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

documentRequestSchema.index(
  { taxCase: 1, documentType: 1, requiredFor: 1 },
  { unique: false }
);

documentRequestSchema.index({ taxCase: 1, status: 1, createdAt: -1 });

documentRequestSchema.methods.addComment = function (userId, text) {
  this.comments.push({
    text,
    createdBy: userId
  });
  return this.save();
};

module.exports = mongoose.model('DocumentRequest', documentRequestSchema);












