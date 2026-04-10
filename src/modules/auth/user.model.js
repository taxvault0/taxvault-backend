const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Function to generate unique client ID
const generateClientId = () => {
  const year = new Date().getFullYear();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TV-${year}-${random}`;
};

// Tax rates matching frontend taxUtils.js
const TAX_RATES = {
  federal: { gst: 0.05 },
  provincial: {
    AB: { type: 'GST', rate: 0 },
    BC: { type: 'PST', rate: 0.07 },
    MB: { type: 'RST', rate: 0.07 },
    NB: { type: 'HST', rate: 0.1 },
    NL: { type: 'HST', rate: 0.1 },
    NS: { type: 'HST', rate: 0.1 },
    ON: { type: 'HST', rate: 0.08 },
    PE: { type: 'HST', rate: 0.1 },
    NT: { type: 'GST', rate: 0 },
    NU: { type: 'GST', rate: 0 },
    QC: { type: 'QST', rate: 0.09975 },
    SK: { type: 'PST', rate: 0.06 },
    YT: { type: 'GST', rate: 0 }
  }
};

// Business number formats by province
const BUSINESS_NUMBER_FORMAT = {
  default: { prefix: 'RT', length: 15, pattern: '123456789RT0001' },
  QC: {
    prefix: 'RQ',
    length: 15,
    pattern: '123456789RQ0001',
    agency: 'Revenu Québec'
  }
};

// Provincial filing deadlines
const FILING_DEADLINES = {
  default: {
    monthly: '15th of following month',
    quarterly: '1 month after quarter end',
    annual: 'June 15'
  },
  QC: {
    monthly: '15th of following month',
    quarterly: '1 month after quarter end',
    annual: 'June 15',
    note: 'File separately with Revenu Québec'
  }
};

const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const normalizePhoneNumber = (value) => {
  if (!value) return value;
  const digits = String(value).replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith('1')) return digits;
  return digits;
};

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters']
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\S+@\S+\.\S+$/,
        'Please enter a valid email'
      ]
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      match: [
        STRONG_PASSWORD_REGEX,
        'Password must include uppercase, lowercase, number, and special character'
      ],
      select: false
    },

    clientId: {
      type: String,
      unique: true,
      sparse: true,
      default: function () {
        if (this.role === 'user') {
          return generateClientId();
        }
        return undefined;
      }
    },

    clientIdQR: {
      type: String
    },

    encrypted_sin: {
      type: String,
      select: false
    },

    role: {
      type: String,
      enum: ['user', 'ca', 'admin'],
      default: 'user'
    },

    userType: {
      type: String,
      enum: [
        'gig-worker',
        'contractor',
        'trades',
        'business-owner',
        'student',
        'employee',
        'other'
      ],
      required: true
    },

    profileImage: {
      type: String,
      default: 'default-avatar.png'
    },

    phoneNumber: {
      type: String,
      set: normalizePhoneNumber,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^(1)?\d{10}$/.test(v);
        },
        message: 'Please enter a valid phone number'
      }
    },

    province: {
      type: String,
      enum: [
        'AB',
        'BC',
        'MB',
        'NB',
        'NL',
        'NS',
        'NT',
        'NU',
        'ON',
        'PE',
        'QC',
        'SK',
        'YT'
      ],
      required: [true, 'Province is required for tax calculations'],
      default: 'ON',
      uppercase: true,
      trim: true
    },

    provincialTaxRegistered: {
      type: Boolean,
      default: false
    },

    provincialTaxNumber: {
      type: String,
      validate: {
        validator: function (v) {
          if (!v) return true;
          if (this.province === 'QC') {
            return /^NR\d{10}$|^\d{9}RQ\d{4}$/.test(v);
          }
          if (this.province === 'BC') {
            return /^\d{5}-\d{4}$|^\d{9}$/.test(v);
          }
          if (this.province === 'MB') {
            return /^\d{7}$|^RST-\d{6}$/.test(v);
          }
          if (this.province === 'SK') {
            return /^\d{7}$|^PST-\d{6}$/.test(v);
          }
          return true;
        },
        message: () => 'Invalid provincial tax number format'
      }
    },

    businessNumber: {
      type: String,
      validate: {
        validator: function (v) {
          if (!v) return true;
          const regex =
            this.province === 'QC'
              ? /^\d{9}RQ\d{4}$/
              : /^\d{9}RT\d{4}$/;
          return regex.test(v);
        },
        message: () => 'Invalid business number format'
      }
    },

    filingFrequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual', 'unknown'],
      default: 'unknown'
    },

    taxRegistrationDate: {
      type: Date
    },

    exceededProvincialThreshold: {
      type: Boolean,
      default: false
    },

    subscription: {
      plan: {
        type: String,
        enum: ['free', 'individual', 'self-employed', 'corporate'],
        default: 'free'
      },
      startDate: Date,
      endDate: Date,
      status: {
        type: String,
        enum: ['active', 'expired', 'cancelled', 'trial'],
        default: 'trial'
      },
      stripeCustomerId: String,
      stripeSubscriptionId: String
    },

    taxYears: [
      {
        year: {
          type: Number,
          required: true
        },
        status: {
          type: String,
          enum: ['in-progress', 'ready', 'filed', 'review'],
          default: 'in-progress'
        },
        filedDate: Date,
        filedWith: String
      }
    ],

    mfaEnabled: {
      type: Boolean,
      default: false
    },

    mfaSecret: {
      type: String,
      select: false
    },

    mfaBackupCodes: [
      {
        code: String,
        used: { type: Boolean, default: false }
      }
    ],

    lastLogin: Date,

    loginAttempts: {
      type: Number,
      default: 0
    },

    lockUntil: Date,

    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    emailVerificationToken: String,

    emailVerified: {
      type: Boolean,
      default: false
    },

    notificationPreferences: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      reminders: { type: Boolean, default: true }
    },

    createdAt: {
      type: Date,
      default: Date.now
    },

    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

userSchema.index({ role: 1 });

userSchema.virtual('profile', {
  ref: 'UserProfile',
  localField: '_id',
  foreignField: 'user',
  justOne: true
});

userSchema.virtual('taxType').get(function () {
  const provincial = TAX_RATES.provincial[this.province];
  return provincial ? provincial.type : 'GST';
});

userSchema.virtual('taxRate').get(function () {
  const provincial = TAX_RATES.provincial[this.province];
  if (!provincial) return 0.05;

  switch (provincial.type) {
    case 'HST':
      return 0.05 + provincial.rate;
    case 'PST':
    case 'RST':
    case 'QST':
      return 0.05 + provincial.rate;
    default:
      return 0.05;
  }
});

userSchema.virtual('taxRateDisplay').get(function () {
  const provincial = TAX_RATES.provincial[this.province];
  if (!provincial) return '5% GST';

  switch (provincial.type) {
    case 'HST':
      return `${((0.05 + provincial.rate) * 100).toFixed(0)}% HST`;
    case 'PST':
      return `5% GST + ${(provincial.rate * 100).toFixed(0)}% PST`;
    case 'RST':
      return `5% GST + ${(provincial.rate * 100).toFixed(0)}% RST`;
    case 'QST':
      return `5% GST + ${(provincial.rate * 100).toFixed(2)}% QST`;
    default:
      return '5% GST';
  }
});

userSchema.virtual('taxAgency').get(function () {
  const separateProvinces = ['BC', 'SK', 'MB', 'QC'];
  if (separateProvinces.includes(this.province)) {
    const agencies = {
      QC: 'Revenu Québec',
      BC: 'BC Ministry of Finance',
      MB: 'Manitoba Finance',
      SK: 'Saskatchewan Finance'
    };
    return `${agencies[this.province]} + CRA`;
  }
  return 'CRA';
});

userSchema.virtual('businessNumberFormat').get(function () {
  const format =
    this.province === 'QC'
      ? BUSINESS_NUMBER_FORMAT.QC
      : BUSINESS_NUMBER_FORMAT.default;
  return format.pattern;
});

userSchema.virtual('filingDeadline').get(function () {
  const deadlines =
    FILING_DEADLINES[this.province] || FILING_DEADLINES.default;

  const frequency = ['monthly', 'quarterly', 'annual'].includes(
    this.filingFrequency
  )
    ? this.filingFrequency
    : 'quarterly';

  return {
    deadline: deadlines[frequency],
    note: deadlines.note || null
  };
});

userSchema.virtual('requiresSeparateProvincialFiling').get(function () {
  const separateProvinces = ['BC', 'SK', 'MB', 'QC'];
  return separateProvinces.includes(this.province);
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

userSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

userSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

userSchema.methods.createEmailVerificationToken = function () {
  const verificationToken = crypto.randomBytes(32).toString('hex');

  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  return verificationToken;
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.needsProvincialTaxRegistration = function () {
  const requiresSeparateRegistration = ['BC', 'SK', 'MB', 'QC'];
  return requiresSeparateRegistration.includes(this.province);
};

userSchema.methods.getFilingRequirements = function () {
  const separateProvinces = ['BC', 'SK', 'MB', 'QC'];

  const frequency = ['monthly', 'quarterly', 'annual'].includes(
    this.filingFrequency
  )
    ? this.filingFrequency
    : 'quarterly';

  if (separateProvinces.includes(this.province)) {
    const agencies = {
      QC: 'Revenu Québec',
      BC: 'BC Ministry of Finance',
      MB: 'Manitoba Finance',
      SK: 'Saskatchewan Finance'
    };
    const notes = {
      QC: 'File separate QST return',
      BC: 'File separate PST return',
      MB: 'File separate RST return',
      SK: 'File separate PST return'
    };
    return {
      agency: agencies[this.province],
      separateReturn: true,
      frequency,
      notes: notes[this.province]
    };
  }

  return {
    agency: 'CRA',
    separateReturn: false,
    frequency,
    notes: 'File GST/HST with CRA'
  };
};

module.exports = mongoose.model('User', userSchema);