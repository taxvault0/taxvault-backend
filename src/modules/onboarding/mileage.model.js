const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        index: true
    },
    startLocation: {
        latitude: Number,
        longitude: Number,
        address: String,
        timestamp: Date
    },
    endLocation: {
        latitude: Number,
        longitude: Number,
        address: String,
        timestamp: Date
    },
    distance: {
        type: Number,
        required: true,
        min: [0, 'Distance cannot be negative']
    },
    duration: Number, // in seconds
    purpose: {
        type: String,
        enum: ['business', 'commute', 'personal'],
        default: 'business',
        required: true
    },
    tripType: {
        type: String,
        enum: ['client-visit', 'supplier', 'work-commute', 'other-business'],
        default: 'other-business'
    },
    clientName: String,
    notes: String,
    route: [{
        latitude: Number,
        longitude: Number,
        timestamp: Date
    }],
    isManual: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'completed'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const mileageSchema = new mongoose.Schema({
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
    trips: [tripSchema],
    totalBusinessKm: {
        type: Number,
        default: 0
    },
    totalPersonalKm: {
        type: Number,
        default: 0
    },
    totalCommuteKm: {
        type: Number,
        default: 0
    },
    lastTripDate: Date,
    settings: {
        autoTrack: {
            type: Boolean,
            default: true
        },
        detectCommute: {
            type: Boolean,
            default: true
        },
        homeAddress: {
            street: String,
            city: String,
            province: String,
            postalCode: String,
            latitude: Number,
            longitude: Number
        },
        workAddress: {
            street: String,
            city: String,
            province: String,
            postalCode: String,
            latitude: Number,
            longitude: Number
        },
        defaultPurpose: {
            type: String,
            enum: ['business', 'commute', 'personal'],
            default: 'business'
        }
    },
    monthlySummaries: [{
        month: {
            type: Number, // 1-12
            required: true
        },
        year: {
            type: Number,
            required: true
        },
        businessKm: Number,
        personalKm: Number,
        commuteKm: Number,
        totalTrips: Number
    }],
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

// Indexes
mileageSchema.index({ user: 1, taxYear: 1, 'trips.date': -1 });

// Pre-save middleware
mileageSchema.pre('save', async function(next) {
    this.updatedAt = Date.now();
    
    // Recalculate totals
    if (this.trips && this.trips.length > 0) {
        const trips = this.trips.filter(t => t.status === 'completed');
        
        this.totalBusinessKm = trips
            .filter(t => t.purpose === 'business')
            .reduce((sum, t) => sum + t.distance, 0);
            
        this.totalPersonalKm = trips
            .filter(t => t.purpose === 'personal')
            .reduce((sum, t) => sum + t.distance, 0);
            
        this.totalCommuteKm = trips
            .filter(t => t.purpose === 'commute')
            .reduce((sum, t) => sum + t.distance, 0);
        
        if (trips.length > 0) {
            this.lastTripDate = trips[trips.length - 1].date;
        }
    }
    
    next();
});

// Method to add a trip
mileageSchema.methods.addTrip = function(tripData) {
    const trip = {
        ...tripData,
        createdAt: new Date(),
        status: 'completed'
    };
    
    this.trips.push(trip);
    
    // Update monthly summary
    const tripDate = new Date(tripData.date);
    const month = tripDate.getMonth() + 1;
    const year = tripDate.getFullYear();
    
    let monthlySummary = this.monthlySummaries.find(
        s => s.month === month && s.year === year
    );
    
    if (!monthlySummary) {
        monthlySummary = {
            month,
            year,
            businessKm: 0,
            personalKm: 0,
            commuteKm: 0,
            totalTrips: 0
        };
        this.monthlySummaries.push(monthlySummary);
    }
    
    monthlySummary.totalTrips++;
    if (tripData.purpose === 'business') monthlySummary.businessKm += tripData.distance;
    else if (tripData.purpose === 'personal') monthlySummary.personalKm += tripData.distance;
    else if (tripData.purpose === 'commute') monthlySummary.commuteKm += tripData.distance;
    
    return this.save();
};

// Static method to get mileage summary
mileageSchema.statics.getMileageSummary = async function(userId, taxYear) {
    const mileage = await this.findOne({ user: userId, taxYear });
    
    if (!mileage) {
        return {
            totalBusinessKm: 0,
            totalPersonalKm: 0,
            totalCommuteKm: 0,
            totalTrips: 0,
            monthlyBreakdown: []
        };
    }
    
    return {
        totalBusinessKm: mileage.totalBusinessKm,
        totalPersonalKm: mileage.totalPersonalKm,
        totalCommuteKm: mileage.totalCommuteKm,
        totalTrips: mileage.trips.filter(t => t.status === 'completed').length,
        monthlyBreakdown: mileage.monthlySummaries.sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        })
    };
};

module.exports = mongoose.model('Mileage', mileageSchema);












