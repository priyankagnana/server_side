const mongoose = require('mongoose');

const joinRequestSchema = new mongoose.Schema({
  studyGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudyGroup',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  message: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

// Index for efficient queries
joinRequestSchema.index({ studyGroup: 1, status: 1 });
joinRequestSchema.index({ user: 1, status: 1 });
joinRequestSchema.index({ studyGroup: 1, user: 1 }); // Prevent duplicate requests

module.exports = mongoose.model('JoinRequest', joinRequestSchema);

