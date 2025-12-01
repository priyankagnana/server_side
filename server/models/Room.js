const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    default: ''
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  profilePicture: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['direct', 'group'],
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  inviteLink: {
    type: String,
    unique: true,
    sparse: true
  },
  inviteLinkExpiry: {
    type: Date
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastMessageAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for finding user's rooms
roomSchema.index({ participants: 1 });
roomSchema.index({ inviteLink: 1 });

module.exports = mongoose.model('Room', roomSchema);

