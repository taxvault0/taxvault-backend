const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    senderRole: {
      type: String,
      enum: ['client', 'ca', 'admin', 'system'],
      default: 'system'
    },

    taxCase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaxCase',
      default: null,
      index: true
    },

    type: {
      type: String,
      enum: [
        'ca-connection-request',
        'ca-connection-accepted',
        'ca-connection-rejected',
        'tax-case-created',
        'document-request-created',
        'document-uploaded',
        'document-verified',
        'document-rejected',
        'case-status-updated',
        'case-completed',
        'case-cancelled',
        'new-message',
        'general'
      ],
      required: true,
      index: true
    },

    title: {
      type: String,
      required: true,
      trim: true
    },

    message: {
      type: String,
      required: true,
      trim: true
    },

    read: {
      type: Boolean,
      default: false,
      index: true
    },

    readAt: {
      type: Date,
      default: null
    },

    channels: {
      inApp: {
        type: Boolean,
        default: true
      },
      email: {
        type: Boolean,
        default: false
      }
    },

    emailSent: {
      type: Boolean,
      default: false
    },

    emailSentAt: {
      type: Date,
      default: null
    },

    data: {
      taxCaseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TaxCase',
        default: null
      },
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
      connectionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CAConnection',
        default: null
      },
      noteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TaxCaseNote',
        default: null
      },
      status: {
        type: String,
        default: null
      },
      route: {
        type: String,
        default: ''
      }
    }
  },
  {
    timestamps: true
  }
);

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);












