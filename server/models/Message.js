const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function () {
      return this.messageType !== 'system';
    }
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: function () {
      return !this.studyGroup;
    }
  },
  studyGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudyGroup'
  },
  channelId: {
    type: mongoose.Schema.Types.ObjectId,
    required: function () {
      return !!this.studyGroup;
    }
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  fileUrl: {
    type: String,
    default: ''
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Validation: Ensure room and studyGroup are mutually exclusive
messageSchema.pre('validate', function(next) {
  // Ensure room and studyGroup are mutually exclusive
  // (The required() functions already handle the case where neither is set)
  if (this.room && this.studyGroup) {
    return next(new Error('Message cannot have both room and studyGroup. It must belong to either a Room (one-to-one/group chat) or a StudyGroup channel, but not both.'));
  }
  next();
});

// Index for efficient message queries
messageSchema.index({ room: 1, createdAt: -1 });
messageSchema.index({ studyGroup: 1, channelId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);

