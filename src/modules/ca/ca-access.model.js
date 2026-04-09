const mongoose = require('mongoose');

const caAccessSchema = new mongoose.Schema({
    user: {
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
    permissionLevel: {
        type: String,
        enum: ['read-only', 'full'],
        required: true
    },
    taxYears: [{
        type: Number,
        required: true
    }],
    status: {
        type: String,
        enum: ['pending', 'active', 'revoked', 'expired'],
        default: 'pending',
        index: true
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    invitedEmail: {
        type: String,
        required: true
    },
    invitationToken: String,
    invitationExpires: Date,
    accessGrantedAt: Date,
    lastAccessedAt: Date,
    accessHistory: [{
        action: {
            type: String,
            enum: ['view', 'download', 'comment', 'request', 'verify']
        },
        timestamp: Date,
        ipAddress: String,
        userAgent: String,
        details: String
    }],
    restrictions: {
        canDownload: { type: Boolean, default: true },
        canComment: { type: Boolean, default: true },
        canVerify: { type: Boolean, default: false },
        canExport: { type: Boolean, default: true },
        requireMfa: { type: Boolean, default: false }
    },
    expiresAt: Date,
    notes: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index to ensure unique access per user-CA pair
caAccessSchema.index({ user: 1, ca: 1 }, { unique: true });

// Pre-save middleware
caAccessSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Method to log access activity
caAccessSchema.methods.logActivity = function(action, req) {
    this.accessHistory.push({
        action,
        timestamp: new Date(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: `${action} performed by ${this.ca}`
    });
    
    this.lastAccessedAt = new Date();
    return this.save();
};

// Method to check if access is valid
caAccessSchema.methods.isValid = function() {
    if (this.status !== 'active') return false;
    if (this.expiresAt && this.expiresAt < new Date()) {
        this.status = 'expired';
        return false;
    }
    return true;
};

// Static method to get accessible clients for a CA
caAccessSchema.statics.getAccessibleClients = async function(caId, taxYear) {
    const query = { ca: caId, status: 'active' };
    
    if (taxYear) {
        query.taxYears = taxYear;
    }
    
    return this.find(query)
        .populate('user', 'name email userType profileImage')
        .sort({ 'user.name': 1 });
};

module.exports = mongoose.model('CaAccess', caAccessSchema);














