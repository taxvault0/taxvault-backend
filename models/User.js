const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Function to generate unique client ID
const generateClientId = () => {
  // Format: TV-YYYY-XXXXX
  // TV = TaxVault, YYYY = Year, XXXXX = Random alphanumeric
  const year = new Date().getFullYear();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TV-${year}-${random}`;
};

// Tax rates matching frontend taxUtils.js
const TAX_RATES = {
    federal: { gst: 0.05 },
    provincial: {
        'AB': { type: 'GST', rate: 0 },
        'BC': { type: 'PST', rate: 0.07 },
        'MB': { type: 'RST', rate: 0.07 },
        'NB': { type: 'HST', rate: 0.15 },
        'NL': { type: 'HST', rate: 0.15 },
        'NS': { type: 'HST', rate: 0.15 },
        'NT': { type: 'GST', rate: 0 },
        'NU': { type: 'GST', rate: 0 },
        'ON': { type: 'HST', rate: 0.13 },
        'PE': { type: 'HST', rate: 0.15 },
        'QC': { type: 'QST', rate: 0.09975 },
        'SK': { type: 'PST', rate: 0.06 },
        'YT': { type: 'GST', rate: 0 },
    },
};

// Business number formats by province (matching frontend)
const BUSINESS_NUMBER_FORMAT = {
    default: { prefix: 'RT', length: 15, pattern: '123456789RT0001' },
    'QC': { prefix: 'RQ', length: 15, pattern: '123456789RQ0001', agency: 'Revenu Québec' },
};

// Provincial filing deadlines (matching frontend)
const FILING_DEADLINES = {
    default: {
        monthly: '15th of following month',
        quarterly: '1 month after quarter end',
        annual: 'June 15',
    },
    'QC': {
        monthly: '15th of following month',
        quarterly: '1 month after quarter end',
        annual: 'June 15',
        note: 'File separately with Revenu Québec',
    },
};

const userSchema = new mongoose.Schema({
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
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please enter a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false
    },
    
    // NEW: Client ID field for CA portal
    clientId: {
        type: String,
        unique: true,
        sparse: true, // Allows null/undefined values
        default: function() {
            // Only generate clientId for regular users, not for CAs
            if (this.role === 'user') {
                return generateClientId();
            }
            return undefined;
        }
    },
    
    // Optional: QR code for client ID
    clientIdQR: {
        type: String // Store QR code as base64 or URL
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
        enum: ['gig-worker', 'contractor', 'trades', 'shop-owner', 'student', 'employee', 'other'],
        required: true
    },
    profileImage: {
        type: String,
        default: 'default-avatar.png'
    },
    phoneNumber: {
        type: String,
        match: [/^\+?1?\d{10,14}$/, 'Please enter a valid phone number']
    },
    address: {
        street: String,
        city: String,
        province: String,
        postalCode: String,
        country: { type: String, default: 'Canada' }
    },
    
    // Province for tax calculations (matching frontend PROVINCES)
    province: {
        type: String,
        enum: [
            'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'
        ],
        required: [true, 'Province is required for tax calculations'],
        default: 'ON'
    },
    
    // Provincial tax registration status
    provincialTaxRegistered: {
        type: Boolean,
        default: false
    },
    provincialTaxNumber: {
        type: String,
        validate: {
            validator: function(v) {
                if (!v) return true;
                // Quebec QST format
                if (this.province === 'QC') {
                    return /^NR\d{10}$|^\d{9}RQ\d{4}$/.test(v);
                }
                // BC PST format
                if (this.province === 'BC') {
                    return /^\d{5}-\d{4}$|^\d{9}$/.test(v);
                }
                // Manitoba RST format
                if (this.province === 'MB') {
                    return /^\d{7}$|^RST-\d{6}$/.test(v);
                }
                // Saskatchewan PST format
                if (this.province === 'SK') {
                    return /^\d{7}$|^PST-\d{6}$/.test(v);
                }
                return true;
            },
            message: props => `Invalid provincial tax number format`
        }
    },
    
    // Federal business number (matching frontend BUSINESS_NUMBER_FORMAT)
    businessNumber: {
        type: String,
        validate: {
            validator: function(v) {
                if (!v) return true;
                const format = this.province === 'QC' 
                    ? BUSINESS_NUMBER_FORMAT.QC.pattern 
                    : BUSINESS_NUMBER_FORMAT.default.pattern;
                // Convert pattern to regex (simplified check)
                const regex = this.province === 'QC' 
                    ? /^\d{9}RQ\d{4}$/ 
                    : /^\d{9}RT\d{4}$/;
                return regex.test(v);
            },
            message: props => `Invalid business number format`
        }
    },
    
    // Filing frequency (matching frontend FILING_DEADLINES)
    filingFrequency: {
        type: String,
        enum: ['monthly', 'quarterly', 'annual'],
        default: function() {
            // HST provinces typically file monthly
            const hstProvinces = ['ON', 'NB', 'NL', 'NS', 'PE'];
            return hstProvinces.includes(this.province) ? 'monthly' : 'quarterly';
        }
    },
    
    // Tax registration date
    taxRegistrationDate: {
        type: Date
    },
    
    // Threshold exceeded (for PST provinces)
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
    taxYears: [{
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
    }],
    mfaEnabled: {
        type: Boolean,
        default: false
    },
    mfaSecret: {
        type: String,
        select: false
    },
    mfaBackupCodes: [{
        code: String,
        used: { type: Boolean, default: false }
    }],
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
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Create index for faster client ID searches
userSchema.index({ clientId: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

// Virtual for full address
userSchema.virtual('fullAddress').get(function() {
    if (!this.address) return '';
    return `${this.address.street}, ${this.address.city}, ${this.address.province} ${this.address.postalCode}`;
});

// Virtual for tax type (matching frontend TAX_RATES)
userSchema.virtual('taxType').get(function() {
    const provincial = TAX_RATES.provincial[this.province];
    return provincial ? provincial.type : 'GST';
});

// Virtual for tax rate (matching frontend calculateTaxes)
userSchema.virtual('taxRate').get(function() {
    const provincial = TAX_RATES.provincial[this.province];
    if (!provincial) return 0.05;
    
    switch (provincial.type) {
        case 'HST':
            return provincial.rate;
        case 'PST':
        case 'RST':
        case 'QST':
            return 0.05 + provincial.rate;
        default:
            return 0.05;
    }
});

// Virtual for tax rate display (matching frontend)
userSchema.virtual('taxRateDisplay').get(function() {
    const provincial = TAX_RATES.provincial[this.province];
    if (!provincial) return '5% GST';
    
    switch (provincial.type) {
        case 'HST':
            return `${(provincial.rate * 100).toFixed(0)}% HST`;
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

// Virtual for tax agency (matching frontend getTaxAgency)
userSchema.virtual('taxAgency').get(function() {
    const separateProvinces = ['BC', 'SK', 'MB', 'QC'];
    if (separateProvinces.includes(this.province)) {
        const agencies = {
            'QC': 'Revenu Québec',
            'BC': 'BC Ministry of Finance',
            'MB': 'Manitoba Finance',
            'SK': 'Saskatchewan Finance',
        };
        return `${agencies[this.province]} + CRA`;
    }
    return 'CRA';
});

// Virtual for business number format (matching frontend getBusinessNumberFormat)
userSchema.virtual('businessNumberFormat').get(function() {
    const format = this.province === 'QC' 
        ? BUSINESS_NUMBER_FORMAT.QC 
        : BUSINESS_NUMBER_FORMAT.default;
    return format.pattern;
});

// Virtual for filing deadline info (matching frontend getFilingDeadline)
userSchema.virtual('filingDeadline').get(function() {
    const deadlines = FILING_DEADLINES[this.province] || FILING_DEADLINES.default;
    return {
        deadline: deadlines[this.filingFrequency || 'quarterly'],
        note: deadlines.note || null,
    };
});

// Virtual to check if separate provincial filing required
userSchema.virtual('requiresSeparateProvincialFiling').get(function() {
    const separateProvinces = ['BC', 'SK', 'MB', 'QC'];
    return separateProvinces.includes(this.province);
});

// Encrypt password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    this.passwordChangedAt = Date.now() - 1000;
    next();
});

// Update timestamp
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Check if account is locked
userSchema.methods.isLocked = function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Generate password reset token
userSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    return resetToken;
};

// Generate email verification token
userSchema.methods.createEmailVerificationToken = function() {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    this.emailVerificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');
    
    return verificationToken;
};

// Check if password was changed after JWT issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10
        );
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};

// Method to check if user needs to register for provincial tax
userSchema.methods.needsProvincialTaxRegistration = function() {
    const requiresSeparateRegistration = ['BC', 'SK', 'MB', 'QC'];
    return requiresSeparateRegistration.includes(this.province);
};

// Method to get filing requirements (matching frontend getFilingRequirements)
userSchema.methods.getFilingRequirements = function() {
    const separateProvinces = ['BC', 'SK', 'MB', 'QC'];
    
    if (separateProvinces.includes(this.province)) {
        const agencies = {
            'QC': 'Revenu Québec',
            'BC': 'BC Ministry of Finance',
            'MB': 'Manitoba Finance',
            'SK': 'Saskatchewan Finance',
        };
        const notes = {
            'QC': 'File separate QST return',
            'BC': 'File separate PST return',
            'MB': 'File separate RST return',
            'SK': 'File separate PST return',
        };
        return {
            agency: agencies[this.province],
            separateReturn: true,
            frequency: this.filingFrequency || 'quarterly',
            notes: notes[this.province],
        };
    }
    
    return {
        agency: 'CRA',
        separateReturn: false,
        frequency: this.filingFrequency || 'quarterly',
        notes: 'File GST/HST with CRA',
    };
};

module.exports = mongoose.model('User', userSchema);