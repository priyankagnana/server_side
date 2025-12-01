const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportType: {
    type: String,
    enum: ['post', 'reel', 'chat', 'user'],
    required: true
  },
  reportedItem: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'reportTypeModel'
  },
  reportTypeModel: {
    type: String,
    enum: ['Post', 'Reel', 'Message', 'User'],
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  actionTaken: {
    type: String,
    enum: ['none', 'deleted', 'user_banned', 'user_warned', 'dismissed'],
    default: 'none'
  },
  adminNotes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);

