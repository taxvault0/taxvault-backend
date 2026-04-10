// backend/models/Consultation.js
const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
  // Participants
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ca: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Consultation Details
  type: {
    type: String,
    enum: [
      'tax-planning',
      'audit-support',
      'business-structure',
      'gst-hst-advice',
      'payroll-support',
      'investment-tax',
      'estate-planning',
      'cross-border',
      'general-advice'
    ],
    required: true
  },
  duration: {
    type: Number,
    enum: [15, 30, 60, 90],
    required: true
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  topic: {
    type: String,
    required: true
  },
  description: String,
  
  // Attachments from vault
  attachments: [{
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document'
    },
    fileName: String,
    fileUrl: String
  }],
  
  // Scheduling
  preferredDates: [Date],
  selectedDateTime: Date,
  durationMinutes: Number,
  timezone: String,
  
  // Pricing
  caRate: {
    type: Number,
    required: true
  },
  platformFee: Number,
  totalAmount: Number,
  currency: {
    type: String,
    default: 'CAD'
  },
  
  // Status Flow
  status: {
    type: String,
    enum: [
      'pending',           // Client submitted, waiting for CA response
      'awaiting-payment',   // CA accepted, waiting for client payment
      'scheduled',         // Payment confirmed, meeting scheduled
      'completed',         // Consultation done
      'cancelled',         // Cancelled by either party
      'declined',          // CA declined
      'refunded',          // Refund issued
      'no-show'            // Client didn't attend
    ],
    default: 'pending'
  },
  
  // Payment
  paymentIntentId: String,
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'failed'],
    default: 'pending'
  },
  paidAt: Date,
  refundedAt: Date,
  
  // Meeting Details
  meetingProvider: {
    type: String,
    enum: ['google-meet', 'zoom', 'microsoft-teams', 'in-person'],
    default: 'google-meet'
  },
  meetingLink: String,
  meetingId: String,
  meetingPassword: String,
  
  // CA Response
  caResponse: {
    accepted: Boolean,
    message: String,
    counterOffer: {
      suggestedDates: [Date],
      suggestedRate: Number,
      suggestedDuration: Number
    },
    respondedAt: Date
  },
  
  // After Consultation
  clientNotes: String,
  caNotes: String,
  actionItems: [{
    description: String,
    dueDate: Date,
    completed: Boolean
  }],
  summaryDocument: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  },
  
  // Ratings & Reviews
  clientRating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    review: String,
    categories: {
      expertise: Number,
      communication: Number,
      value: Number,
      punctuality: Number
    },
    createdAt: Date
  },
  caRating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    review: String,
    createdAt: Date
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for faster queries
consultationSchema.index({ client: 1, status: 1 });
consultationSchema.index({ ca: 1, status: 1 });
consultationSchema.index({ selectedDateTime: 1 });












