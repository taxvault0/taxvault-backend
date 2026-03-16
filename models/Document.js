const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    documentType: {
        type: String,
        enum: [
            't4',
            't4a',
            't5',
            't3',
            't5008',
            'business-income',
            'gst-return',
            'notice-of-assessment',
            'rental-income',
            'capital-gains',
            'rrsp-contribution',
            'medical-expense',
            'charitable-donation',
            'child-care-expense',
            'tuition-slip',
            'other'
        ],
        required: true,
        index: true
    },
    taxYear: {
        type: Number,
        required: true,
        index: true
    },
    fileName: {
        type: String,
        required: true
    },
    fileUrl: {
        type: String,
        required: true
    },
    fileKey: {
        type: String,
        required: true
    },
    thumbnailUrl: String,
    fileSize: Number,
    mimeType: String,
    description: String,
    issuer: {
        name: String,
        businessNumber: String,
        address: String
    },
    amount: Number,
    taxWithheld: Number,
    metadata: {
        pages: Number,
        isEncrypted: Boolean,
        hasSignature: Boolean,
        extractedText: String
    },
    status: {
        type: String,
        enum: ['uploaded', 'processed', 'verified', 'rejected'],
        default: 'uploaded',
        index: true
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verifiedAt: Date,
    notes: [{
        text: String,
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        createdAt: Date
    }],
    tags: [String],
    uploadedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes
documentSchema.index({ user: 1, taxYear: 1, documentType: 1 });

// Pre-save middleware
documentSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Static method to get documents summary
documentSchema.statics.getDocumentsSummary = async function(userId, taxYear) {
    return this.aggregate([
        { $match: { user: userId, taxYear: taxYear } },
        { $group: {
            _id: '$documentType',
            count: { $sum: 1 },
            status: { $addToSet: '$status' }
        }},
        { $sort: { count: -1 } }
    ]);
};

module.exports = mongoose.model('Document', documentSchema);