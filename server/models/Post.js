const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    trim: true,
    default: ''
  },
  image: {
    type: String,
    default: ''
  },
  privacy: {
    type: String,
    enum: ['public', 'friends', 'private'],
    default: 'public'
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    upvotes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    downvotes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    replies: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      content: {
        type: String,
        required: true,
        trim: true
      },
      upvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      downvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      createdAt: {
        type: Date,
        default: Date.now
      },
      deleted: {
        type: Boolean,
        default: false
      }
    }],
    createdAt: {
      type: Date,
      default: Date.now
    },
    deleted: {
      type: Boolean,
      default: false
    }
  }],
  tag: {
    type: String,
    enum: ['Achievement', 'Campus Post', ''],
    default: ''
  },
  pinnedToProfile: {
    type: Boolean,
    default: false
  },
  pinnedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Post', postSchema);

