const mongoose = require('mongoose');

const taxCaseTimelineSchema = new mongoose.Schema(
  {
    taxCase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaxCase',
      required: true,
      index: true
    },

    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    actorRole: {
      type: String,
      enum: ['client', 'ca', 'admin', 'system'],
      default: 'system'
    },

    eventType: {
      type: String,
      enum: [
        'tax-case-created',
        'status-updated',
        'document-request-created',
        'document-uploaded',
        'document-verified',
        'document-rejected',
        'note-added',
        'case-submitted',
        'case-completed',
        'case-cancelled'
      ],
      required: true,
      index: true
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

    meta: {
      documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        default: null
      },
      documentRequestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DocumentRequest',
        default: null
      },
      previousStatus: {
        type: String,
        default: null
      },
      newStatus: {
        type: String,
        default: null
      }
    }
  },
  {
    timestamps: true
  }
);

taxCaseTimelineSchema.index({ taxCase: 1, createdAt: -1 });

module.exports = mongoose.model('TaxCaseTimeline', taxCaseTimelineSchema);












