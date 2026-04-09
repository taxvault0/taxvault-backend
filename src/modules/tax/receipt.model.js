const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    taxYear: {
        type: Number,
        required: true,
        index: true
    },
    category: {
        type: String,
        enum: [
            'fuel',
            'vehicle-maintenance',
            'insurance',
            'office-supplies',
            'internet',
            'rent',
            'utilities',
            'meals',
            'software',
            'advertising',
            'professional-fees',
            'tools',
            'training',
            'telephone',
            'home-office',
            'other'
        ],
        required: true,
        index: true
    },
    vendor: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    amount: {
        type: Number,
        required: true,
        min: [0, 'Amount cannot be negative']
    },
    
    // Individual tax components (keep these for backward compatibility)
    gst: {
        type: Number,
        default: 0,
        min: 0
    },
    pst: {
        type: Number,
        default: 0,
        min: 0
    },
    hst: {
        type: Number,
        default: 0,
        min: 0
    },
    qst: {
        type: Number,
        default: 0,
        min: 0
    },
    
    // NEW: Comprehensive tax breakdown by province
    taxBreakdown: {
        gst: { type: Number, default: 0 },
        pst: { type: Number, default: 0 },
        hst: { type: Number, default: 0 },
        qst: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        taxType: { 
            type: String,
            enum: ['GST', 'HST', 'PST', 'RST', 'QST', 'GST+PST', 'GST+RST', 'GST+QST']
        },
        provinceRate: Number,
        calculationMethod: {
            type: String,
            enum: ['automatic', 'manual'],
            default: 'automatic'
        }
    },
    
    // NEW: Business use percentage for deductions
    businessUsePercentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 100,
        validate: {
            validator: function(v) {
                return v >= 0 && v <= 100;
            },
            message: 'Business use percentage must be between 0 and 100'
        }
    },
    
    // NEW: Deductible amount after business use
    deductibleAmount: {
        type: Number,
        default: function() {
            return this.amount * (this.businessUsePercentage / 100);
        }
    },
    
    // NEW: Province where receipt was claimed (may differ from user's province for travel)
    claimProvince: {
        type: String,
        enum: ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'],
        required: true,
        default: 'ON'
    },
    
    // NEW: For multi-province claims (e.g., travel expenses)
    isInterProvincial: {
        type: Boolean,
        default: false
    },
    
    date: {
        type: Date,
        required: true,
        index: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: [200, 'Description cannot exceed 200 characters']
    },
    imageUrl: {
        type: String,
        required: true
    },
    imageKey: {
        type: String,
        required: true
    },
    thumbnailUrl: String,
    ocrData: {
        extracted: {
            type: Boolean,
            default: false
        },
        confidence: {
            vendor: Number,
            date: Number,
            amount: Number,
            tax: Number,
            overall: Number
        },
        rawText: String,
        processedAt: Date,
        manualCorrection: {
            corrected: { type: Boolean, default: false },
            correctedBy: String,
            correctedAt: Date,
            originalValues: mongoose.Schema.Types.Mixed
        }
    },
    metadata: {
        fileSize: Number,
        fileType: String,
        originalName: String,
        width: Number,
        height: Number,
        duration: Number
    },
    status: {
        type: String,
        enum: ['pending', 'processed', 'verified', 'rejected', 'duplicate'],
        default: 'pending',
        index: true
    },
    duplicateOf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Receipt'
    },
    notes: [{
        text: String,
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    tags: [String],
    isPersonal: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
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

// Compound indexes for faster queries
receiptSchema.index({ user: 1, taxYear: 1, date: -1 });
receiptSchema.index({ user: 1, category: 1, taxYear: 1 });
receiptSchema.index({ user: 1, status: 1, taxYear: 1 });
receiptSchema.index({ vendor: 1, user: 1 });
receiptSchema.index({ claimProvince: 1, taxYear: 1 }); // For provincial reporting

// Virtual for total tax amount (from individual fields)
receiptSchema.virtual('totalTax').get(function() {
    return (this.gst || 0) + (this.pst || 0) + (this.hst || 0) + (this.qst || 0);
});

// Virtual for total tax from breakdown (preferred)
receiptSchema.virtual('taxBreakdownTotal').get(function() {
    return this.taxBreakdown?.total || this.totalTax;
});

// Virtual for net amount (excluding tax)
receiptSchema.virtual('netAmount').get(function() {
    return this.amount - (this.taxBreakdown?.total || this.totalTax);
});

// Virtual for final deductible amount after business use
receiptSchema.virtual('finalDeductibleAmount').get(function() {
    return (this.amount - (this.taxBreakdown?.total || this.totalTax)) * (this.businessUsePercentage / 100);
});

// Pre-save middleware to update timestamps and calculate values
receiptSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    
    // Update deductible amount based on business use
    this.deductibleAmount = this.amount * (this.businessUsePercentage / 100);
    
    // If taxBreakdown exists but individual fields are empty, populate them
    if (this.taxBreakdown && !this.gst && !this.pst && !this.hst && !this.qst) {
        this.gst = this.taxBreakdown.gst || 0;
        this.pst = this.taxBreakdown.pst || 0;
        this.hst = this.taxBreakdown.hst || 0;
        this.qst = this.taxBreakdown.qst || 0;
    }
    
    next();
});

// Static method to get expenses by category with tax breakdown
receiptSchema.statics.getExpensesByCategory = async function(userId, taxYear, province) {
    const match = { 
        user: userId, 
        taxYear: taxYear, 
        status: { $ne: 'rejected' } 
    };
    
    // Add province filter if specified
    if (province) {
        match.claimProvince = province;
    }
    
    return this.aggregate([
        { $match: match },
        { $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
            totalGST: { $sum: { $ifNull: ['$taxBreakdown.gst', '$gst'] } },
            totalPST: { $sum: { $ifNull: ['$taxBreakdown.pst', '$pst'] } },
            totalHST: { $sum: { $ifNull: ['$taxBreakdown.hst', '$hst'] } },
            totalQST: { $sum: { $ifNull: ['$taxBreakdown.qst', '$qst'] } },
            totalDeductible: { $sum: '$deductibleAmount' },
            totalTaxPaid: { $sum: { $ifNull: ['$taxBreakdown.total', '$totalTax'] } }
        }},
        { $sort: { total: -1 } }
    ]);
};

// Static method to get tax summary by province
receiptSchema.statics.getTaxSummaryByProvince = async function(userId, taxYear) {
    return this.aggregate([
        { $match: { user: userId, taxYear: taxYear, status: { $ne: 'rejected' } } },
        { $group: {
            _id: '$claimProvince',
            totalExpenses: { $sum: '$amount' },
            totalDeductible: { $sum: '$deductibleAmount' },
            totalGST: { $sum: { $ifNull: ['$taxBreakdown.gst', '$gst'] } },
            totalPST: { $sum: { $ifNull: ['$taxBreakdown.pst', '$pst'] } },
            totalHST: { $sum: { $ifNull: ['$taxBreakdown.hst', '$hst'] } },
            totalQST: { $sum: { $ifNull: ['$taxBreakdown.qst', '$qst'] } },
            count: { $sum: 1 }
        }},
        { $sort: { totalExpenses: -1 } }
    ]);
};

// Static method to get monthly expenses for charting
receiptSchema.statics.getMonthlyExpenses = async function(userId, taxYear, province) {
    const match = { 
        user: userId, 
        taxYear: taxYear, 
        status: { $ne: 'rejected' } 
    };
    
    if (province) {
        match.claimProvince = province;
    }
    
    return this.aggregate([
        { $match: match },
        { $group: {
            _id: { $month: '$date' },
            total: { $sum: '$amount' },
            deductible: { $sum: '$deductibleAmount' },
            count: { $sum: 1 }
        }},
        { $sort: { '_id': 1 } }
    ]);
};

// Static method to calculate ITCs (Input Tax Credits)
receiptSchema.statics.calculateITCs = async function(userId, taxYear, province) {
    const match = { 
        user: userId, 
        taxYear: taxYear, 
        status: { $ne: 'rejected' },
        businessUsePercentage: { $gt: 0 }
    };
    
    if (province) {
        match.claimProvince = province;
    }
    
    const result = await this.aggregate([
        { $match: match },
        { $group: {
            _id: null,
            totalGST: { $sum: { $multiply: [
                { $ifNull: ['$taxBreakdown.gst', '$gst'] },
                { $divide: ['$businessUsePercentage', 100] }
            ]}},
            totalPST: { $sum: { $multiply: [
                { $ifNull: ['$taxBreakdown.pst', '$pst'] },
                { $divide: ['$businessUsePercentage', 100] }
            ]}},
            totalHST: { $sum: { $multiply: [
                { $ifNull: ['$taxBreakdown.hst', '$hst'] },
                { $divide: ['$businessUsePercentage', 100] }
            ]}},
            totalQST: { $sum: { $multiply: [
                { $ifNull: ['$taxBreakdown.qst', '$qst'] },
                { $divide: ['$businessUsePercentage', 100] }
            ]}}
        }}
    ]);
    
    return result.length > 0 ? result[0] : {
        totalGST: 0,
        totalPST: 0,
        totalHST: 0,
        totalQST: 0
    };
};

// Static method to validate receipt tax calculation against user's province
receiptSchema.statics.validateTaxForUserProvince = async function(receiptId, userProvince) {
    const receipt = await this.findById(receiptId);
    if (!receipt) return false;
    
    // Check if tax breakdown matches expected taxes for province
    const expectedTaxTypes = {
        'AB': ['gst'],
        'BC': ['gst', 'pst'],
        'MB': ['gst', 'pst'], // Actually RST but we'll use pst field
        'NB': ['hst'],
        'NL': ['hst'],
        'NS': ['hst'],
        'NT': ['gst'],
        'NU': ['gst'],
        'ON': ['hst'],
        'PE': ['hst'],
        'QC': ['gst', 'qst'],
        'SK': ['gst', 'pst'],
        'YT': ['gst']
    };
    
    const expected = expectedTaxTypes[userProvince] || ['gst'];
    const actual = [];
    
    if (receipt.gst > 0) actual.push('gst');
    if (receipt.pst > 0) actual.push('pst');
    if (receipt.hst > 0) actual.push('hst');
    if (receipt.qst > 0) actual.push('qst');
    
    // Check if actual taxes match expected (order doesn't matter)
    const hasAllExpected = expected.every(tax => actual.includes(tax));
    const hasNoExtra = actual.every(tax => expected.includes(tax));
    
    return hasAllExpected && hasNoExtra;
};

module.exports = mongoose.model('Receipt', receiptSchema);












