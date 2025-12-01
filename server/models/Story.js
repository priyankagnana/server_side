const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mediaUrl: {
    type: String,
    required: true
  },
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    required: true
  },
  thumbnailUrl: {
    type: String,
    default: ''
  },
  privacy: {
    type: String,
    enum: ['public', 'friends'],
    default: 'public'
  },
  caption: {
    type: String,
    trim: true,
    default: ''
  },
  views: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // Auto-delete after expiration
  },
  cloudinaryPublicId: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Set expiration to 24 hours from creation
storySchema.pre('save', function(next) {
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  }
  next();
});

module.exports = mongoose.model('Story', storySchema);

