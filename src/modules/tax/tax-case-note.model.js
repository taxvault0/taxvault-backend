const mongoose = require('mongoose');

const taxCaseNoteSchema = new mongoose.Schema(
  {
    taxCase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaxCase',
      required: true,
      index: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    authorRole: {
      type: String,
      enum: ['client', 'ca', 'admin'],
      required: true
    },
    type: {
      type: String,
      enum: ['internal-note', 'client-message'],
      required: true,
      index: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        fileType: String,
        uploadedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    isReadBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        readAt: {
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

taxCaseNoteSchema.index({ taxCase: 1, createdAt: -1 });

module.exports = mongoose.model('TaxCaseNote', taxCaseNoteSchema);












