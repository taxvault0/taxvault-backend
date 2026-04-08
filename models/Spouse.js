const mongoose = require('mongoose');

const spouseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    fullName: { type: String, required: true, trim: true },
    dob: { type: Date, required: true },
    sinNumberEncrypted: { type: String, default: null, select: false },
    phone: { type: String, default: null, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Spouse', spouseSchema);
