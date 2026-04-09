const mongoose = require('mongoose');

const employmentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    employerName: {
      type: String,
      trim: true,
      default: '',
    },
    t4Income: {
      type: String,
      default: '',
    },
    gigPlatforms: {
      type: [String],
      default: [],
    },
    gigPlatformOther: {
      type: String,
      trim: true,
      default: '',
    },
    gigIncome: {
      type: String,
      default: '',
    },
    selfEmploymentIncome: {
      type: String,
      default: '',
    },
    businessIncome: {
      type: String,
      default: '',
    },
    additionalIncomeSources: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('EmploymentProfile', employmentProfileSchema);












