const StudyGroup = require('../models/StudyGroup');
const Message = require('../models/Message');
const User = require('../models/User');
const JoinRequest = require('../models/JoinRequest');
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
    let { name, description, icon, category, tags, isPublic, maxMembers, joinType } = req.body;

    // Validate and sanitize input
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Group name is required'
      });
    }

    // Sanitize name (remove extra whitespace, limit length)
    name = name.trim().substring(0, 100);
    
    // Validate maxMembers if provided
    if (maxMembers !== undefined) {
      maxMembers = parseInt(maxMembers);
      if (isNaN(maxMembers) || maxMembers < 1 || maxMembers > 10000) {
        return res.status(400).json({
          success: false,
          message: 'maxMembers must be between 1 and 10000'
        });
      }
    }

    // Sanitize description
    if (description) {
      description = description.trim().substring(0, 1000);
    }

    // Sanitize category
    if (category) {
      category = category.trim().substring(0, 50);
    }

    // Sanitize tags
    if (tags && Array.isArray(tags)) {
      tags = tags
        .map(tag => typeof tag === 'string' ? tag.trim().substring(0, 30) : null)
        .filter(tag => tag && tag.length > 0)
        .slice(0, 10); // Limit to 10 tags
    } else {
      tags = [];
    }

    // Validate joinType
    if (joinType && !['public', 'invite-only', 'request-to-join'].includes(joinType)) {
      return res.status(400).json({
        success: false,
        message: 'joinType must be "public", "invite-only", or "request-to-join"'
      });
    }

    // Create study group - the pre-save hook will create default roles and channels
    const studyGroup = await StudyGroup.create({
      name,
      description: description || '',
      icon: icon || '',
      category: category || 'General',
      tags,
      isPublic: isPublic === true,
      joinType: joinType || 'public',
      maxMembers: maxMembers || 100,
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

    // Build base query for access control
    if (publicOnly === 'true') {
      // Only return public groups
      query.isPublic = true;
    } else {
      // Return groups user is a member of OR public groups
      query.$or = [
        { 'members.user': userId },
        { isPublic: true }
      ];
    }

    // Add category filter
    if (category) {
      query.category = category;
    }

    // Add search filter - combine with existing $or using $and
    if (search) {
      const searchConditions = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ]
      };

      // If we already have an $or clause, combine with $and
      if (query.$or) {
        query = {
          $and: [
            { $or: query.$or },
            searchConditions
          ]
        };
        delete query.$or; // Remove from root level
      } else {
        // No existing $or, just add search conditions
        query.$or = searchConditions.$or;
      }
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

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid group ID format'
      });
    }

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

    // Access control based on joinType
    if (!isMember) {
      if (studyGroup.joinType === 'invite-only' && !studyGroup.isPublic) {
        // Invite-only groups: only members can see
        return res.status(403).json({
          success: false,
          message: 'This is an invite-only group. You need an invite code to join.'
        });
      } else if (studyGroup.joinType === 'request-to-join' && !studyGroup.isPublic) {
        // Request-to-join groups: can see but need to request
        // Allow viewing for now, but they'll need to request to join
      } else if (!studyGroup.isPublic) {
        // Private groups (old behavior)
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this study group'
        });
      }
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

    // Check joinType and validate access
    if (studyGroup.joinType === 'public') {
      // Public groups: can join directly without invite code
      if (!inviteCode && !groupId) {
        return res.status(400).json({
          success: false,
          message: 'Group ID is required'
        });
      }
    } else if (studyGroup.joinType === 'invite-only') {
      // Invite-only: require invite code
      if (!inviteCode) {
        return res.status(400).json({
          success: false,
          message: 'This group is invite-only. An invite code is required to join.'
        });
      }
    } else if (studyGroup.joinType === 'request-to-join') {
      // Request-to-join: should use request endpoint, not join directly
      return res.status(400).json({
        success: false,
        message: 'This group requires approval. Please use the request to join feature.'
      });
    }

    // Check if invite code is expired
    if (inviteCode && studyGroup.inviteCodeExpiry && new Date() > studyGroup.inviteCodeExpiry) {
      return res.status(400).json({
        success: false,
        message: 'Invite code has expired'
      });
    }

    // Use atomic operation to prevent race conditions
    // Check if user is already a member and add atomically
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

    // Get member role before atomic operation
    const memberRole = studyGroup.roles.find(r => r.name === 'Member');
    if (!memberRole) {
      return res.status(500).json({
        success: false,
        message: 'Study group configuration error: Member role not found'
      });
    }

    // Use findOneAndUpdate for atomic operation to prevent duplicate joins
    const updatedGroup = await StudyGroup.findOneAndUpdate(
      {
        _id: studyGroup._id,
        'members.user': { $ne: userId }, // Ensure user is not already a member
        $expr: { $lt: [{ $size: '$members' }, '$maxMembers'] } // Ensure not at capacity
      },
      {
        $push: {
          members: {
            user: userId,
            roles: [memberRole._id],
            joinedAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!updatedGroup) {
      // Race condition: user was added between check and update, or group is now full
      const recheckGroup = await StudyGroup.findById(studyGroup._id);
      const isNowMember = recheckGroup.members.some(
        m => m.user.toString() === userId.toString()
      );
      
      if (isNowMember) {
        return res.status(400).json({
          success: false,
          message: 'You are already a member of this group'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'Study group is full or could not join at this time'
      });
    }

    studyGroup = updatedGroup;

    const populatedGroup = await StudyGroup.findById(studyGroup._id)
      .populate('owner', 'username profilePicture email')
      .populate('members.user', 'username profilePicture email');

    // Emit socket event with error handling
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`group-${studyGroup._id}`).emit('member_joined', {
          userId: userId.toString(),
          studyGroup: populatedGroup
        });
      }
    } catch (socketError) {
      console.error('Error emitting socket event for member_joined:', socketError);
      // Don't fail the request if socket fails
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

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid group ID format'
      });
    }

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

    // Emit socket event with error handling
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`group-${studyGroup._id}`).emit('member_left', {
          userId: userId.toString(),
          studyGroup
        });
      }
    } catch (socketError) {
      console.error('Error emitting socket event for member_left:', socketError);
      // Don't fail the request if socket fails
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
    let { name, type, description, isPrivate } = req.body;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid group ID format'
      });
    }

    // Validate and sanitize input
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Channel name is required'
      });
    }

    // Sanitize name (lowercase, remove special chars, limit length)
    name = name.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '').substring(0, 50);
    
    if (name.length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Channel name must contain at least one alphanumeric character'
      });
    }

    // Validate type
    if (type && !['text', 'voice'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Channel type must be "text" or "voice"'
      });
    }

    // Sanitize description
    if (description) {
      description = description.trim().substring(0, 500);
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
      name,
      type: type || 'text',
      description: description || '',
      position: studyGroup.channels.length,
      isPrivate: isPrivate === true,
      createdBy: userId
    };

    studyGroup.channels.push(newChannel);
    await studyGroup.save();

    const populatedGroup = await StudyGroup.findById(studyGroup._id)
      .populate('channels.createdBy', 'username profilePicture');

    // Emit socket event with error handling
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`group-${studyGroup._id}`).emit('channel_created', {
          channel: populatedGroup.channels[populatedGroup.channels.length - 1],
          studyGroup: populatedGroup
        });
      }
    } catch (socketError) {
      console.error('Error emitting socket event for channel_created:', socketError);
      // Don't fail the request if socket fails
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

    // Validate ObjectId formats
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid group ID format'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(channelId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid channel ID format'
      });
    }

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

    // Emit socket event with error handling
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`group-${studyGroup._id}`).emit('channel_deleted', {
          channelId,
          studyGroup
        });
      }
    } catch (socketError) {
      console.error('Error emitting socket event for channel_deleted:', socketError);
      // Don't fail the request if socket fails
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

    // Check if channel is private and user has access
    if (channel.isPrivate) {
      // Check if user has a role that allows access to this private channel
      const memberRoleIds = member.roles.map(r => r.toString());
      const hasAccess = channel.allowedRoles && channel.allowedRoles.some(
        roleId => memberRoleIds.includes(roleId.toString())
      );
      
      if (!hasAccess) {
        // Also check if user is owner (owners should have access to all channels)
        const isOwner = studyGroup.owner.toString() === userId.toString();
        if (!isOwner) {
          return res.status(403).json({
            success: false,
            message: 'You do not have access to this private channel'
          });
        }
      }
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
    let { content, image } = req.body;

    // Validate ObjectId formats
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid group ID format'
      });
    }

    // Validate and sanitize content
    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    // Sanitize content (limit length)
    content = content.trim().substring(0, 5000);
    
    // Validate image URL if provided
    if (image && typeof image === 'string') {
      // Basic URL validation
      if (image.length > 2000) {
        return res.status(400).json({
          success: false,
          message: 'Image URL is too long'
        });
      }
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

    // Check if channel is private and user has access
    if (channel.isPrivate) {
      // Check if user has a role that allows access to this private channel
      const memberRoleIds = member.roles.map(r => r.toString());
      const hasAccess = channel.allowedRoles && channel.allowedRoles.some(
        roleId => memberRoleIds.includes(roleId.toString())
      );
      
      if (!hasAccess) {
        // Also check if user is owner (owners should have access to all channels)
        const isOwner = studyGroup.owner.toString() === userId.toString();
        if (!isOwner) {
          return res.status(403).json({
            success: false,
            message: 'You do not have access to this private channel'
          });
        }
      }
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

    // Emit socket event to channel room with error handling
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`channel-${channel._id.toString()}`).emit('new_message', populatedMessage);
      }
    } catch (socketError) {
      console.error('Error emitting socket event for new_message:', socketError);
      // Don't fail the request if socket fails
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

// @desc    Request to join a study group
// @route   POST /api/study-groups/:groupId/request
// @access  Private
const requestToJoin = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;
    const { message } = req.body;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid group ID format'
      });
    }

    const studyGroup = await StudyGroup.findById(groupId);

    if (!studyGroup) {
      return res.status(404).json({
        success: false,
        message: 'Study group not found'
      });
    }

    // Check if group accepts requests
    if (studyGroup.joinType !== 'request-to-join') {
      return res.status(400).json({
        success: false,
        message: 'This group does not accept join requests'
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

    // Check if there's already a pending request
    const existingRequest = await JoinRequest.findOne({
      studyGroup: groupId,
      user: userId,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending request for this group'
      });
    }

    // Create join request
    const joinRequest = await JoinRequest.create({
      studyGroup: groupId,
      user: userId,
      status: 'pending',
      message: message || ''
    });

    const populatedRequest = await JoinRequest.findById(joinRequest._id)
      .populate('user', 'username profilePicture email')
      .populate('studyGroup', 'name');

    // Notify group owner/admins via socket
    try {
      const io = req.app.get('io');
      if (io) {
        // Notify owner
        io.to(`user_${studyGroup.owner.toString()}`).emit('join_request_received', {
          requestId: joinRequest._id,
          studyGroup: {
            id: studyGroup._id,
            name: studyGroup.name
          },
          user: {
            id: userId,
            username: req.user.username || req.user.email?.split('@')[0] || 'User'
          }
        });
      }
    } catch (socketError) {
      console.error('Error emitting socket event for join_request_received:', socketError);
    }

    res.status(201).json({
      success: true,
      message: 'Join request sent successfully',
      request: populatedRequest
    });
  } catch (error) {
    console.error('Request to join error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Get join requests for a study group
// @route   GET /api/study-groups/:groupId/requests
// @access  Private (Owner/Admin only)
const getJoinRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;
    const { status } = req.query; // 'pending', 'approved', 'rejected', or all

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid group ID format'
      });
    }

    const studyGroup = await StudyGroup.findById(groupId);

    if (!studyGroup) {
      return res.status(404).json({
        success: false,
        message: 'Study group not found'
      });
    }

    // Check if user is owner or admin
    const isOwner = studyGroup.owner.toString() === userId.toString();
    const member = studyGroup.members.find(
      m => m.user.toString() === userId.toString()
    );
    const isAdmin = member && checkPermission(member, studyGroup.roles, 'manageGroup');

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only group owners and admins can view join requests'
      });
    }

    // Build query
    let query = { studyGroup: groupId };
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    }

    const requests = await JoinRequest.find(query)
      .populate('user', 'username profilePicture email')
      .populate('reviewedBy', 'username')
      .sort({ requestedAt: -1 });

    res.json({
      success: true,
      requests
    });
  } catch (error) {
    console.error('Get join requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Approve a join request
// @route   POST /api/study-groups/:groupId/requests/:requestId/approve
// @access  Private (Owner/Admin only)
const approveRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId, requestId } = req.params;

    // Validate ObjectId formats
    if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format'
      });
    }

    const studyGroup = await StudyGroup.findById(groupId);

    if (!studyGroup) {
      return res.status(404).json({
        success: false,
        message: 'Study group not found'
      });
    }

    // Check if user is owner or admin
    const isOwner = studyGroup.owner.toString() === userId.toString();
    const member = studyGroup.members.find(
      m => m.user.toString() === userId.toString()
    );
    const isAdmin = member && checkPermission(member, studyGroup.roles, 'manageGroup');

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only group owners and admins can approve requests'
      });
    }

    const joinRequest = await JoinRequest.findById(requestId)
      .populate('user', 'username profilePicture email');

    if (!joinRequest) {
      return res.status(404).json({
        success: false,
        message: 'Join request not found'
      });
    }

    if (joinRequest.studyGroup.toString() !== groupId) {
      return res.status(400).json({
        success: false,
        message: 'Request does not belong to this group'
      });
    }

    if (joinRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This request has already been processed'
      });
    }

    // Check if user is already a member
    const isAlreadyMember = studyGroup.members.some(
      m => m.user.toString() === joinRequest.user._id.toString()
    );

    if (isAlreadyMember) {
      // Update request status anyway
      joinRequest.status = 'approved';
      joinRequest.reviewedAt = new Date();
      joinRequest.reviewedBy = userId;
      await joinRequest.save();

      return res.status(400).json({
        success: false,
        message: 'User is already a member of this group'
      });
    }

    // Check member limit
    if (studyGroup.members.length >= studyGroup.maxMembers) {
      return res.status(400).json({
        success: false,
        message: 'Study group is full'
      });
    }

    // Get member role
    const memberRole = studyGroup.roles.find(r => r.name === 'Member');
    if (!memberRole) {
      return res.status(500).json({
        success: false,
        message: 'Study group configuration error: Member role not found'
      });
    }

    // Add user to group
    const updatedGroup = await StudyGroup.findOneAndUpdate(
      {
        _id: studyGroup._id,
        'members.user': { $ne: joinRequest.user._id },
        $expr: { $lt: [{ $size: '$members' }, '$maxMembers'] }
      },
      {
        $push: {
          members: {
            user: joinRequest.user._id,
            roles: [memberRole._id],
            joinedAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!updatedGroup) {
      return res.status(400).json({
        success: false,
        message: 'Could not add user to group. Group may be full.'
      });
    }

    // Update request status
    joinRequest.status = 'approved';
    joinRequest.reviewedAt = new Date();
    joinRequest.reviewedBy = userId;
    await joinRequest.save();

    const populatedGroup = await StudyGroup.findById(updatedGroup._id)
      .populate('owner', 'username profilePicture email')
      .populate('members.user', 'username profilePicture email');

    // Notify user via socket
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${joinRequest.user._id.toString()}`).emit('join_request_approved', {
          studyGroup: {
            id: studyGroup._id,
            name: studyGroup.name
          }
        });

        io.to(`group-${studyGroup._id}`).emit('member_joined', {
          userId: joinRequest.user._id.toString(),
          studyGroup: populatedGroup
        });
      }
    } catch (socketError) {
      console.error('Error emitting socket event:', socketError);
    }

    res.json({
      success: true,
      message: 'Join request approved successfully',
      studyGroup: populatedGroup
    });
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Reject a join request
// @route   POST /api/study-groups/:groupId/requests/:requestId/reject
// @access  Private (Owner/Admin only)
const rejectRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId, requestId } = req.params;

    // Validate ObjectId formats
    if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format'
      });
    }

    const studyGroup = await StudyGroup.findById(groupId);

    if (!studyGroup) {
      return res.status(404).json({
        success: false,
        message: 'Study group not found'
      });
    }

    // Check if user is owner or admin
    const isOwner = studyGroup.owner.toString() === userId.toString();
    const member = studyGroup.members.find(
      m => m.user.toString() === userId.toString()
    );
    const isAdmin = member && checkPermission(member, studyGroup.roles, 'manageGroup');

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only group owners and admins can reject requests'
      });
    }

    const joinRequest = await JoinRequest.findById(requestId)
      .populate('user', 'username profilePicture email');

    if (!joinRequest) {
      return res.status(404).json({
        success: false,
        message: 'Join request not found'
      });
    }

    if (joinRequest.studyGroup.toString() !== groupId) {
      return res.status(400).json({
        success: false,
        message: 'Request does not belong to this group'
      });
    }

    if (joinRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This request has already been processed'
      });
    }

    // Update request status
    joinRequest.status = 'rejected';
    joinRequest.reviewedAt = new Date();
    joinRequest.reviewedBy = userId;
    await joinRequest.save();

    // Notify user via socket
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${joinRequest.user._id.toString()}`).emit('join_request_rejected', {
          studyGroup: {
            id: studyGroup._id,
            name: studyGroup.name
          }
        });
      }
    } catch (socketError) {
      console.error('Error emitting socket event:', socketError);
    }

    res.json({
      success: true,
      message: 'Join request rejected'
    });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Invite a user to join study group
// @route   POST /api/study-groups/:groupId/invite
// @access  Private (Owner/Admin only)
const inviteMember = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;
    const { userEmail, userId: inviteUserId } = req.body;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid group ID format'
      });
    }

    if (!userEmail && !inviteUserId) {
      return res.status(400).json({
        success: false,
        message: 'User email or user ID is required'
      });
    }

    const studyGroup = await StudyGroup.findById(groupId);

    if (!studyGroup) {
      return res.status(404).json({
        success: false,
        message: 'Study group not found'
      });
    }

    // Check if user is owner or admin
    const isOwner = studyGroup.owner.toString() === userId.toString();
    const member = studyGroup.members.find(
      m => m.user.toString() === userId.toString()
    );
    const isAdmin = member && checkPermission(member, studyGroup.roles, 'manageGroup');

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only group owners and admins can invite members'
      });
    }

    // Find user to invite
    let userToInvite;
    if (inviteUserId) {
      if (!mongoose.Types.ObjectId.isValid(inviteUserId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID format'
        });
      }
      userToInvite = await User.findById(inviteUserId);
    } else {
      userToInvite = await User.findOne({ email: userEmail });
    }

    if (!userToInvite) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already a member
    const isMember = studyGroup.members.some(
      m => m.user.toString() === userToInvite._id.toString()
    );

    if (isMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this group'
      });
    }

    // Check member limit
    if (studyGroup.members.length >= studyGroup.maxMembers) {
      return res.status(400).json({
        success: false,
        message: 'Study group is full'
      });
    }

    // Get member role
    const memberRole = studyGroup.roles.find(r => r.name === 'Member');
    if (!memberRole) {
      return res.status(500).json({
        success: false,
        message: 'Study group configuration error: Member role not found'
      });
    }

    // Add user to group
    const updatedGroup = await StudyGroup.findOneAndUpdate(
      {
        _id: studyGroup._id,
        'members.user': { $ne: userToInvite._id },
        $expr: { $lt: [{ $size: '$members' }, '$maxMembers'] }
      },
      {
        $push: {
          members: {
            user: userToInvite._id,
            roles: [memberRole._id],
            joinedAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!updatedGroup) {
      return res.status(400).json({
        success: false,
        message: 'Could not add user to group. Group may be full.'
      });
    }

    const populatedGroup = await StudyGroup.findById(updatedGroup._id)
      .populate('owner', 'username profilePicture email')
      .populate('members.user', 'username profilePicture email');

    // Create notification for invited user
    const { createNotification } = require('./notificationController');
    const notification = await createNotification(
      userToInvite._id,
      'study_group_invite',
      'Study Group Invitation',
      `${req.user.username || req.user.email?.split('@')[0] || 'Someone'} invited you to join "${studyGroup.name}"`,
      userId,
      studyGroup._id,
      'StudyGroup'
    );

    // Notify invited user via socket
    try {
      const io = req.app.get('io');
      if (io) {
        // Emit notification
        if (notification) {
          io.to(`user_${userToInvite._id.toString()}`).emit('new_notification', notification);
        }

        // Emit study group invitation (for backward compatibility)
        io.to(`user_${userToInvite._id.toString()}`).emit('study_group_invitation', {
          studyGroup: {
            id: studyGroup._id,
            name: studyGroup.name,
            description: studyGroup.description
          },
          invitedBy: {
            id: userId,
            username: req.user.username || req.user.email?.split('@')[0] || 'User'
          }
        });

        io.to(`group-${studyGroup._id}`).emit('member_joined', {
          userId: userToInvite._id.toString(),
          studyGroup: populatedGroup
        });
      }
    } catch (socketError) {
      console.error('Error emitting socket event:', socketError);
    }

    res.json({
      success: true,
      message: 'User invited successfully',
      studyGroup: populatedGroup
    });
  } catch (error) {
    console.error('Invite member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Make a member an admin
// @route   POST /api/study-groups/:groupId/members/:memberId/make-admin
// @access  Private (Owner only)
const makeAdmin = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId, memberId } = req.params;

    // Validate ObjectId formats
    if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format'
      });
    }

    const studyGroup = await StudyGroup.findById(groupId);

    if (!studyGroup) {
      return res.status(404).json({
        success: false,
        message: 'Study group not found'
      });
    }

    // Check if user is owner
    if (studyGroup.owner.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the group owner can make members admin'
      });
    }

    // Find member
    const member = studyGroup.members.find(
      m => m.user.toString() === memberId
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found in this group'
      });
    }

    // Get admin role
    const adminRole = studyGroup.roles.find(r => r.name === 'Admin');
    if (!adminRole) {
      return res.status(500).json({
        success: false,
        message: 'Admin role not found'
      });
    }

    // Check if already admin
    if (member.roles.some(r => r.toString() === adminRole._id.toString())) {
      return res.status(400).json({
        success: false,
        message: 'User is already an admin'
      });
    }

    // Add admin role
    member.roles.push(adminRole._id);
    await studyGroup.save();

    const populatedGroup = await StudyGroup.findById(studyGroup._id)
      .populate('owner', 'username profilePicture email')
      .populate('members.user', 'username profilePicture email');

    // Notify via socket
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`group-${studyGroup._id}`).emit('member_promoted', {
          userId: memberId,
          studyGroup: populatedGroup
        });
      }
    } catch (socketError) {
      console.error('Error emitting socket event:', socketError);
    }

    res.json({
      success: true,
      message: 'Member promoted to admin successfully',
      studyGroup: populatedGroup
    });
  } catch (error) {
    console.error('Make admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Remove a member from study group
// @route   DELETE /api/study-groups/:groupId/members/:memberId
// @access  Private (Owner/Admin only)
const removeMember = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId, memberId } = req.params;

    // Validate ObjectId formats
    if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format'
      });
    }

    const studyGroup = await StudyGroup.findById(groupId);

    if (!studyGroup) {
      return res.status(404).json({
        success: false,
        message: 'Study group not found'
      });
    }

    // Check if trying to remove owner
    if (studyGroup.owner.toString() === memberId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the group owner'
      });
    }

    // Check if user is owner or admin
    const isOwner = studyGroup.owner.toString() === userId.toString();
    const member = studyGroup.members.find(
      m => m.user.toString() === userId.toString()
    );
    const isAdmin = member && checkPermission(member, studyGroup.roles, 'kickMembers');

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only group owners and admins can remove members'
      });
    }

    // Check if member exists
    const memberToRemove = studyGroup.members.find(
      m => m.user.toString() === memberId
    );

    if (!memberToRemove) {
      return res.status(404).json({
        success: false,
        message: 'Member not found in this group'
      });
    }

    // Remove member
    studyGroup.members = studyGroup.members.filter(
      m => m.user.toString() !== memberId
    );
    await studyGroup.save();

    const populatedGroup = await StudyGroup.findById(studyGroup._id)
      .populate('owner', 'username profilePicture email')
      .populate('members.user', 'username profilePicture email');

    // Notify via socket
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${memberId}`).emit('removed_from_study_group', {
          studyGroup: {
            id: studyGroup._id,
            name: studyGroup.name
          }
        });

        io.to(`group-${studyGroup._id}`).emit('member_removed', {
          userId: memberId,
          studyGroup: populatedGroup
        });
      }
    } catch (socketError) {
      console.error('Error emitting socket event:', socketError);
    }

    res.json({
      success: true,
      message: 'Member removed successfully',
      studyGroup: populatedGroup
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Delete a study group
// @route   DELETE /api/study-groups/:groupId
// @access  Private (Owner only)
const deleteStudyGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid group ID format'
      });
    }

    const studyGroup = await StudyGroup.findById(groupId);

    if (!studyGroup) {
      return res.status(404).json({
        success: false,
        message: 'Study group not found'
      });
    }

    // Check if user is the owner
    if (studyGroup.owner.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the group owner can delete the group'
      });
    }

    // Delete all messages in this study group
    await Message.deleteMany({ studyGroup: groupId });

    // Delete the study group
    await StudyGroup.findByIdAndDelete(groupId);

    // Emit socket event with error handling
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`group-${groupId}`).emit('study_group_deleted', {
          groupId: groupId.toString(),
          message: 'Study group has been deleted'
        });
      }
    } catch (socketError) {
      console.error('Error emitting socket event for study_group_deleted:', socketError);
      // Don't fail the request if socket fails
    }

    res.json({
      success: true,
      message: 'Study group deleted successfully'
    });
  } catch (error) {
    console.error('Delete study group error:', error);
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
  sendChannelMessage,
  requestToJoin,
  getJoinRequests,
  approveRequest,
  rejectRequest,
  inviteMember,
  makeAdmin,
  removeMember,
  deleteStudyGroup
};

