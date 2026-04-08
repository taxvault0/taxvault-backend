const mongoose = require('mongoose');

const receiptTypeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    profileType: { type: String, enum: ['primary', 'spouse', 'household'], required: true },
    receiptType: { type: String, required: true, trim: true },
    fileUrl: { type: String, default: null },
    notes: { type: String, default: null, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReceiptType', receiptTypeSchema);
