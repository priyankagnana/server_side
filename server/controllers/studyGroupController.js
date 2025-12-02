const StudyGroup = require('../models/StudyGroup');
const Message = require('../models/Message');
const User = require('../models/User');
const mongoose = require('mongoose');

// Helper function to check permissions
const checkPermission = (member, roles, permission) => {
  if (!member || !member.roles || member.roles.length === 0) {
    return false;
  }

  for (const roleId of member.roles) {
    const role = roles.find(r => r._id.toString() === roleId.toString());
    if (role && role.permissions[permission]) {
      return true;
    }
  }

  return false;
};

// Helper function to check if user can send messages
const canSendMessage = (member, studyGroup, channelId) => {
  if (!member) return false;

  const roleIds = member.roles.map(r => r.toString());
  const roles = studyGroup.roles.filter(r =>
    roleIds.includes(r._id.toString())
  );

  return roles.some(role => role.permissions.sendMessages === true);
};

// Helper function to check if user can read messages
const canReadMessage = (member, studyGroup, channelId) => {
  if (!member) return false;

  const roleIds = member.roles.map(r => r.toString());
  const roles = studyGroup.roles.filter(r =>
    roleIds.includes(r._id.toString())
  );

  return roles.some(role => role.permissions.readMessages === true);
};

// @desc    Create a new study group
// @route   POST /api/study-groups
// @access  Private
const createStudyGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, description, icon, category, tags, isPublic } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Group name is required'
      });
    }

    // Create study group - the pre-save hook will create default roles and channels
    const studyGroup = await StudyGroup.create({
      name: name.trim(),
      description: description || '',
      icon: icon || '',
      category: category || 'General',
      tags: tags || [],
      isPublic: isPublic || false,
      owner: userId,
      members: [{
        user: userId,
        roles: [] // Will be set to owner role after creation
      }]
    });

    // Reload to get the roles created by pre-save hook
    const reloadedGroup = await StudyGroup.findById(studyGroup._id);

    // Set owner role for the creator
    const ownerRole = reloadedGroup.roles.find(r => r.name === 'Owner');
    if (ownerRole && reloadedGroup.members.length > 0) {
      reloadedGroup.members[0].roles = [ownerRole._id];
      await reloadedGroup.save();
    }

    // Populate the group with user data
    const populatedGroup = await StudyGroup.findById(reloadedGroup._id)
      .populate('owner', 'username profilePicture email')
      .populate('members.user', 'username profilePicture email');

    res.status(201).json({
      success: true,
      studyGroup: populatedGroup
    });
  } catch (error) {
    console.error('Create study group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Get all study groups (public or user's groups)
// @route   GET /api/study-groups
// @access  Private
const getStudyGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    const { category, search, publicOnly } = req.query;

    let query = {};

    if (publicOnly === 'true') {
      // Only return public groups
      query = { isPublic: true };
    } else {
      // Return groups user is a member of OR public groups
      query = {
        $or: [
          { 'members.user': userId },
          { isPublic: true }
        ]
      };
    }

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const studyGroups = await StudyGroup.find(query)
      .populate('owner', 'username profilePicture email')
      .populate('members.user', 'username profilePicture email')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      studyGroups
    });
  } catch (error) {
    console.error('Get study groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Get a single study group
// @route   GET /api/study-groups/:groupId
// @access  Private
const getStudyGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    const studyGroup = await StudyGroup.findById(groupId)
      .populate('owner', 'username profilePicture email')
      .populate('members.user', 'username profilePicture email')
      .populate('channels.createdBy', 'username profilePicture');

    if (!studyGroup) {
      return res.status(404).json({
        success: false,
        message: 'Study group not found'
      });
    }

    // Check if user is a member
    const isMember = studyGroup.members.some(
      m => m.user._id.toString() === userId.toString()
    );

    if (!isMember && !studyGroup.isPublic) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this study group'
      });
    }

    res.json({
      success: true,
      studyGroup
    });
  } catch (error) {
    console.error('Get study group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Join a study group via invite code
// @route   POST /api/study-groups/join
// @access  Private
const joinStudyGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { inviteCode, groupId } = req.body;

    let studyGroup;
    if (inviteCode) {
      studyGroup = await StudyGroup.findOne({ inviteCode });
    } else if (groupId) {
      studyGroup = await StudyGroup.findById(groupId);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invite code or group ID is required'
      });
    }

    if (!studyGroup) {
      return res.status(404).json({
        success: false,
        message: 'Study group not found'
      });
    }

    // Check if invite code is expired
    if (studyGroup.inviteCodeExpiry && new Date() > studyGroup.inviteCodeExpiry) {
      return res.status(400).json({
        success: false,
        message: 'Invite code has expired'
      });
    }

    // Check if user is already a member
    const isMember = studyGroup.members.some(
      m => m.user.toString() === userId.toString()
    );

    if (isMember) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this group'
      });
    }

    // Check member limit
    if (studyGroup.members.length >= studyGroup.maxMembers) {
      return res.status(400).json({
        success: false,
        message: 'Study group is full'
      });
    }

    // Add member with default role
    const memberRole = studyGroup.roles.find(r => r.name === 'Member');
    studyGroup.members.push({
      user: userId,
      roles: memberRole ? [memberRole._id] : []
    });

    await studyGroup.save();

    const populatedGroup = await StudyGroup.findById(studyGroup._id)
      .populate('owner', 'username profilePicture email')
      .populate('members.user', 'username profilePicture email');

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`group-${studyGroup._id}`).emit('member_joined', {
        userId: userId.toString(),
        studyGroup: populatedGroup
      });
    }

    res.json({
      success: true,
      studyGroup: populatedGroup
    });
  } catch (error) {
    console.error('Join study group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Leave a study group
// @route   POST /api/study-groups/:groupId/leave
// @access  Private
const leaveStudyGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    const studyGroup = await StudyGroup.findById(groupId);

    if (!studyGroup) {
      return res.status(404).json({
        success: false,
        message: 'Study group not found'
      });
    }

    // Check if user is the owner
    if (studyGroup.owner.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Owner cannot leave the group. Transfer ownership first.'
      });
    }

    // Remove member
    studyGroup.members = studyGroup.members.filter(
      m => m.user.toString() !== userId.toString()
    );

    await studyGroup.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`group-${studyGroup._id}`).emit('member_left', {
        userId: userId.toString(),
        studyGroup
      });
    }

    res.json({
      success: true,
      message: 'Left study group successfully'
    });
  } catch (error) {
    console.error('Leave study group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Create a channel in study group
// @route   POST /api/study-groups/:groupId/channels
// @access  Private
const createChannel = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;
    const { name, type, description, isPrivate } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Channel name is required'
      });
    }

    const studyGroup = await StudyGroup.findById(groupId);

    if (!studyGroup) {
      return res.status(404).json({
        success: false,
        message: 'Study group not found'
      });
    }

    // Check permissions
    const member = studyGroup.members.find(
      m => m.user.toString() === userId.toString()
    );

    if (!member) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    // Check if user has permission to manage channels
    const hasPermission = checkPermission(member, studyGroup.roles, 'manageChannels');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create channels'
      });
    }

    // Check if channel name already exists
    const channelExists = studyGroup.channels.some(
      c => c.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (channelExists) {
      return res.status(400).json({
        success: false,
        message: 'Channel with this name already exists'
      });
    }

    // Create channel
    const newChannel = {
      name: name.trim().toLowerCase(),
      type: type || 'text',
      description: description || '',
      position: studyGroup.channels.length,
      isPrivate: isPrivate || false,
      createdBy: userId
    };

    studyGroup.channels.push(newChannel);
    await studyGroup.save();

    const populatedGroup = await StudyGroup.findById(studyGroup._id)
      .populate('channels.createdBy', 'username profilePicture');

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`group-${studyGroup._id}`).emit('channel_created', {
        channel: populatedGroup.channels[populatedGroup.channels.length - 1],
        studyGroup: populatedGroup
      });
    }

    res.status(201).json({
      success: true,
      channel: populatedGroup.channels[populatedGroup.channels.length - 1],
      studyGroup: populatedGroup
    });
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Delete a channel
// @route   DELETE /api/study-groups/:groupId/channels/:channelId
// @access  Private
const deleteChannel = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId, channelId } = req.params;

    const studyGroup = await StudyGroup.findById(groupId);

    if (!studyGroup) {
      return res.status(404).json({
        success: false,
        message: 'Study group not found'
      });
    }

    const member = studyGroup.members.find(
      m => m.user.toString() === userId.toString()
    );

    if (!member) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    const hasPermission = checkPermission(member, studyGroup.roles, 'manageChannels');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete channels'
      });
    }

    studyGroup.channels = studyGroup.channels.filter(
      c => c._id.toString() !== channelId
    );

    await studyGroup.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`group-${studyGroup._id}`).emit('channel_deleted', {
        channelId,
        studyGroup
      });
    }

    res.json({
      success: true,
      message: 'Channel deleted successfully'
    });
  } catch (error) {
    console.error('Delete channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Get messages for a channel
// @route   GET /api/study-groups/:groupId/channels/:channelId/messages
// @access  Private
const getChannelMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId, channelId } = req.params;
    const { limit = 50, before } = req.query;

    // Convert channelId to ObjectId
    let channelObjectId;
    try {
      channelObjectId = new mongoose.Types.ObjectId(channelId);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid channel ID'
      });
    }

    const studyGroup = await StudyGroup.findById(groupId);

    if (!studyGroup) {
      return res.status(404).json({
        success: false,
        message: 'Study group not found'
      });
    }

    const channel = studyGroup.channels.find(
      c => c._id.toString() === channelId
    );

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    // Check if user is member
    const member = studyGroup.members.find(
      m => m.user.toString() === userId.toString()
    );

    if (!member) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    // Check read permission
    if (!canReadMessage(member, studyGroup, channelObjectId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to read messages in this channel'
      });
    }

    // Build query with ObjectId
    let query = {
      studyGroup: studyGroup._id,
      channelId: channelObjectId,
      deleted: false
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('sender', 'username profilePicture email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      messages: messages.reverse()
    });
  } catch (error) {
    console.error('Get channel messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Send message to channel
// @route   POST /api/study-groups/:groupId/channels/:channelId/messages
// @access  Private
const sendChannelMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId, channelId } = req.params;
    const { content, image } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    // Convert channelId to ObjectId
    let channelObjectId;
    try {
      channelObjectId = new mongoose.Types.ObjectId(channelId);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid channel ID'
      });
    }

    const studyGroup = await StudyGroup.findById(groupId);

    if (!studyGroup) {
      return res.status(404).json({
        success: false,
        message: 'Study group not found'
      });
    }

    const channel = studyGroup.channels.find(
      c => c._id.toString() === channelId
    );

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    // Check if user is member
    const member = studyGroup.members.find(
      m => m.user.toString() === userId.toString()
    );

    if (!member) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    // Check send message permission using helper function
    if (!canSendMessage(member, studyGroup, channelObjectId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to send messages in this channel'
      });
    }

    // Create message with channel._id (ObjectId)
    const message = await Message.create({
      sender: userId,
      studyGroup: studyGroup._id,
      channelId: channel._id, // Use channel._id (ObjectId) not string
      content: content.trim(),
      fileUrl: image || '',
      messageType: image ? 'image' : 'text'
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username profilePicture email');

    // Emit socket event to channel room
    const io = req.app.get('io');
    if (io) {
      io.to(`channel-${channel._id.toString()}`).emit('new_message', populatedMessage);
    }

    res.status(201).json({
      success: true,
      message: populatedMessage
    });
  } catch (error) {
    console.error('Send channel message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

module.exports = {
  createStudyGroup,
  getStudyGroups,
  getStudyGroup,
  joinStudyGroup,
  leaveStudyGroup,
  createChannel,
  deleteChannel,
  getChannelMessages,
  sendChannelMessage
};

