const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['text', 'voice'],
    default: 'text'
  },
  description: {
    type: String,
    default: ''
  },
  position: {
    type: Number,
    default: 0
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  allowedRoles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  color: {
    type: String,
    default: '#99aab5'
  },
  permissions: {
    manageChannels: { type: Boolean, default: false },
    manageRoles: { type: Boolean, default: false },
    manageGroup: { type: Boolean, default: false },
    kickMembers: { type: Boolean, default: false },
    banMembers: { type: Boolean, default: false },
    sendMessages: { type: Boolean, default: true },
    readMessages: { type: Boolean, default: true }
  },
  position: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const memberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  }],
  nickname: {
    type: String,
    trim: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
});

const studyGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  },
  banner: {
    type: String,
    default: ''
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [memberSchema],
  channels: [channelSchema],
  roles: [roleSchema],
  inviteCode: {
    type: String,
    unique: true,
    sparse: true
  },
  inviteCodeExpiry: {
    type: Date
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  joinType: {
    type: String,
    enum: ['public', 'invite-only', 'request-to-join'],
    default: 'public'
  },
  category: {
    type: String,
    default: 'General'
  },
  tags: [{
    type: String,
    trim: true
  }],
  maxMembers: {
    type: Number,
    default: 100,
    min: 1,
    max: 10000,
    validate: {
      validator: Number.isInteger,
      message: 'maxMembers must be an integer'
    }
  }
}, {
  timestamps: true
});

// Create default roles when group is created
studyGroupSchema.pre('save', async function (next) {
  if (this.isNew) {
    // Create default roles
    const ownerRole = {
      name: 'Owner',
      color: '#ff0000',
      permissions: {
        manageChannels: true,
        manageRoles: true,
        manageGroup: true,
        kickMembers: true,
        banMembers: true,
        sendMessages: true,
        readMessages: true
      },
      position: 100
    };

    const adminRole = {
      name: 'Admin',
      color: '#ff9900',
      permissions: {
        manageChannels: true,
        manageRoles: false,
        manageGroup: false,
        kickMembers: true,
        banMembers: false,
        sendMessages: true,
        readMessages: true
      },
      position: 50
    };

    const memberRole = {
      name: 'Member',
      color: '#99aab5',
      permissions: {
        manageChannels: false,
        manageRoles: false,
        manageGroup: false,
        kickMembers: false,
        banMembers: false,
        sendMessages: true,
        readMessages: true
      },
      position: 0
    };

    this.roles = [ownerRole, adminRole, memberRole];

    // Create default channels
    const generalChannel = {
      name: 'general',
      type: 'text',
      description: 'General discussion channel',
      position: 0,
      createdBy: this.owner || null
    };

    const announcementsChannel = {
      name: 'announcements',
      type: 'text',
      description: 'Important announcements',
      position: 1,
      createdBy: this.owner || null
    };

    this.channels = [generalChannel, announcementsChannel];

    // Generate unique invite code if not already set
    if (!this.inviteCode) {
      let attempts = 0;
      let isUnique = false;
      const maxAttempts = 10;
      
      while (!isUnique && attempts < maxAttempts) {
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        // Check if code already exists using this.constructor to avoid circular dependency
        const existing = await this.constructor.findOne({ inviteCode: code });
        if (!existing) {
          this.inviteCode = code;
          this.inviteCodeExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
          isUnique = true;
        }
        attempts++;
      }
      
      if (!isUnique) {
        // Fallback: use timestamp + random for guaranteed uniqueness
        this.inviteCode = `${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        this.inviteCodeExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
    }
  }
  next();
});

// Indexes
studyGroupSchema.index({ owner: 1 });
studyGroupSchema.index({ 'members.user': 1 });
studyGroupSchema.index({ isPublic: 1 });

module.exports = mongoose.model('StudyGroup', studyGroupSchema);

