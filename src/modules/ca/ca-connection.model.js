const mongoose = require('mongoose');

const caConnectionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ca: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'disconnected'],
    default: 'pending'
  },
  initiatedBy: {
    type: String,
    enum: ['user', 'ca'],
    default: 'user'
  },
  message: String,
  
  // Document sharing permissions
  documentAccess: {
    type: Boolean,
    default: false
  },
  accessGrantedAt: Date,
  accessRevokedAt: Date,
  
  // Connection metadata
  viewedByCA: {
    type: Boolean,
    default: false
  },
  viewedAt: Date,
  
  // Review after connection
  review: {
    rating: Number,
    comment: String,
    date: Date
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure one connection per user-CA pair
caConnectionSchema.index({ user: 1, ca: 1 }, { unique: true });

module.exports = mongoose.model('CAConnection', caConnectionSchema);














