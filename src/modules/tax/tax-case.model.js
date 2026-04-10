const mongoose = require('mongoose');

const taxCaseSchema = new mongoose.Schema(
  {
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
      required: true,
      index: true
    },
    caseType: {
      type: String,
      enum: ['individual', 'joint', 'business-support'],
      default: 'individual'
    },

    status: {
      type: String,
      enum: [
        'draft',
        'documents-pending',
        'documents-uploaded',
        'under-review',
        'action-required',
        'completed',
        'cancelled'
      ],
      default: 'draft',
      index: true
    },

    clientSnapshot: {
      userType: String,
      province: String,
      maritalStatus: String,
      hasSpouse: { type: Boolean, default: false },
      spouseName: String,
      hasBusiness: { type: Boolean, default: false },
      hasGigIncome: { type: Boolean, default: false },
      hasRentalIncome: { type: Boolean, default: false },
      hasInvestments: { type: Boolean, default: false }
    },

    assignedAt: {
      type: Date,
      default: Date.now
    },

    dueDate: Date,
    submittedAt: Date,
    completedAt: Date,
    cancelledAt: Date,

    lastClientActivityAt: Date,
    lastCAActivityAt: Date,
    lastActivityAt: {
      type: Date,
      default: Date.now
    },

    notes: [
      {
        text: { type: String, required: true },
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
    ],

    checklistSummary: {
      totalRequested: { type: Number, default: 0 },
      totalReceived: { type: Number, default: 0 },
      totalVerified: { type: Number, default: 0 },
      totalPending: { type: Number, default: 0 }
    },

    documentProgress: {
      total: { type: Number, default: 0 },
      verified: { type: Number, default: 0 },
      uploaded: { type: Number, default: 0 },
      rejected: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      completionPercentage: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true
  }
);

taxCaseSchema.index({ client: 1, ca: 1, taxYear: 1 }, { unique: true });

taxCaseSchema.methods.addNote = function (userId, text) {
  this.notes.push({
    text,
    createdBy: userId
  });

  this.lastActivityAt = new Date();
  return this.save();
};

taxCaseSchema.methods.recalculateChecklistSummary = async function () {
  const DocumentRequest = mongoose.model('DocumentRequest');

  const requests = await DocumentRequest.find({ taxCase: this._id });

  let totalRequested = 0;
  let totalReceived = 0;
  let totalVerified = 0;
  let totalPending = 0;
  let uploaded = 0;
  let rejected = 0;

  for (const req of requests) {
    totalRequested += 1;

    if (req.status === 'fulfilled') totalReceived += 1;
    if (req.reviewStatus === 'verified') totalVerified += 1;

    if (['open', 'uploaded', 'needs-info'].includes(req.status)) {
      totalPending += 1;
    }

    if (req.status === 'uploaded') uploaded += 1;
    if (req.reviewStatus === 'rejected') rejected += 1;
  }

  const completionPercentage =
    totalRequested > 0 ? Math.round((totalVerified / totalRequested) * 100) : 0;

  this.checklistSummary = {
    totalRequested,
    totalReceived,
    totalVerified,
    totalPending
  };

  this.documentProgress = {
    total: totalRequested,
    verified: totalVerified,
    uploaded,
    rejected,
    pending: totalPending,
    completionPercentage
  };

  this.lastActivityAt = new Date();

  return this.save();
};

module.exports = mongoose.model('TaxCase', taxCaseSchema);












