const mongoose = require('mongoose');

const deductionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    profileType: { type: String, enum: ['primary', 'spouse', 'household'], required: true },
    deductionType: { type: String, required: true, trim: true },
    amount: { type: Number, default: null },
    description: { type: String, default: null, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Deduction', deductionSchema);
