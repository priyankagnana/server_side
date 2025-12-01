const Room = require('../models/Room');
const Message = require('../models/Message');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');
const { emitToRoom, emitToUser, usersOnChatPage } = require('../config/socket');
const cloudinary = require('../config/cloudinary');

// @desc    Get all conversations (direct + groups)
// @route   GET /api/chat/conversations
// @access  Private
const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get current user with friends
    const currentUser = await User.findById(userId).populate({
      path: 'friends',
      select: 'username profilePicture email'
    });
    
    // Check if user exists
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get friends array - handle both populated and unpopulated cases
    const friends = Array.isArray(currentUser.friends) ? currentUser.friends : [];
    console.log(`User ${userId} has ${friends.length} friends`);
    
    // Log friend details for debugging
    if (friends.length > 0) {
      console.log('Friends:', friends.map(f => ({ id: f._id, username: f.username || f.email })));
    }

    // Find all rooms where user is a participant
    const rooms = await Room.find({ participants: userId })
      .populate('participants', 'username profilePicture email')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'username profilePicture email'
        }
      })
      .populate('createdBy', 'username profilePicture')
      .populate('admins', 'username profilePicture')
      .sort({ lastMessageAt: -1, updatedAt: -1 });

    // Get friend IDs who already have a direct chat room
    const existingDirectChatFriendIds = new Set();
    rooms.forEach(room => {
      if (room.type === 'direct') {
        const otherUser = room.participants.find(
          p => p._id.toString() !== userId.toString()
        );
        if (otherUser) {
          existingDirectChatFriendIds.add(otherUser._id.toString());
        }
      }
    });

    // Format existing conversations
    const existingConversations = await Promise.all(rooms.map(async (room) => {
      let conversationName = room.name;
      let conversationAvatar = '';

      // For direct chats, get the other user's info
      if (room.type === 'direct') {
        const otherUser = room.participants.find(
          p => p._id.toString() !== userId.toString()
        );
        if (otherUser) {
          conversationName = otherUser.username || otherUser.email?.split('@')[0] || 'User';
          conversationAvatar = otherUser.profilePicture || '';
        }
      } else {
        // For groups, use group name or generate from participants
        if (!conversationName) {
          const participantNames = room.participants
            .slice(0, 3)
            .map(p => p.username || p.email?.split('@')[0] || 'User')
            .join(', ');
          conversationName = participantNames;
        }
      }

      // Get unread count
      const unreadCount = await Message.countDocuments({
        room: room._id,
        sender: { $ne: userId },
        readBy: { $ne: userId }
      });

      return {
        id: room._id,
        name: conversationName,
        type: room.type,
        avatar: conversationAvatar,
        profilePicture: room.type === 'group' ? (room.profilePicture || '') : '', // Add profilePicture for groups
        participants: room.participants.map(p => ({
          id: p._id,
          username: p.username || p.email?.split('@')[0] || 'User',
          profilePicture: p.profilePicture || '',
          email: p.email
        })),
        lastMessage: room.lastMessage ? {
          id: room.lastMessage._id,
          content: room.lastMessage.content,
          sender: room.lastMessage.sender ? {
            id: room.lastMessage.sender._id,
            username: room.lastMessage.sender.username || room.lastMessage.sender.email?.split('@')[0] || 'User',
            profilePicture: room.lastMessage.sender.profilePicture || '',
            email: room.lastMessage.sender.email
          } : room.lastMessage.sender, // Fallback to ID if not populated
          createdAt: room.lastMessage.createdAt
        } : null,
        lastMessageAt: room.lastMessageAt || room.updatedAt,
        unreadCount,
        isAdmin: room.admins?.some(admin => admin._id.toString() === userId.toString()) || false,
        createdBy: room.createdBy?._id.toString() === userId.toString()
      };
    }));

    // Create placeholder conversations for friends who don't have a chat yet
    const friendConversations = friends
      .filter(friend => {
        if (!friend || !friend._id) return false;
        return !existingDirectChatFriendIds.has(friend._id.toString());
      })
      .map(friend => ({
        id: null, // No room ID yet
        name: friend.username || friend.email?.split('@')[0] || 'User',
        type: 'direct',
        avatar: friend.profilePicture || '',
        participants: [{
          id: friend._id,
          username: friend.username || friend.email?.split('@')[0] || 'User',
          profilePicture: friend.profilePicture || '',
          email: friend.email
        }],
        lastMessage: null,
        lastMessageAt: null,
        unreadCount: 0,
        isAdmin: false,
        createdBy: false,
        isPlaceholder: true // Flag to indicate this is a placeholder
      }));
    
    console.log(`Created ${friendConversations.length} placeholder conversations for friends`);

    // Combine existing conversations and friend placeholders
    // Sort: existing conversations first (by lastMessageAt), then friend placeholders (by name)
    const allConversations = [
      ...existingConversations,
      ...friendConversations.sort((a, b) => a.name.localeCompare(b.name))
    ];

    res.status(200).json({
      success: true,
      conversations: allConversations
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Get messages for a room
// @route   GET /api/chat/conversations/:roomId/messages
// @access  Private
const getMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { roomId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Verify user is a participant
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (!room.participants.some(p => p.toString() === userId.toString())) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant of this room'
      });
    }

    // Get messages
    const messages = await Message.find({ room: roomId, deleted: false })
      .populate('sender', 'username profilePicture email')
      .populate('readBy', 'username')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    // Reverse to get chronological order
    messages.reverse();

    // Get other participant for direct chats (to check if they read the message)
    const otherParticipant = room.type === 'direct' 
      ? room.participants.find(p => p.toString() !== userId.toString())
      : null;

    // Format messages
    const formattedMessages = messages.map(msg => {
      // System messages are always considered "read" and don't have a sender
      if (msg.messageType === 'system') {
        return {
          id: msg._id,
          content: msg.content,
          messageType: 'system',
          fileUrl: msg.fileUrl || '',
          sender: null,
          isRead: true,
          readBy: [],
          createdAt: msg.createdAt
        };
      }

      // For direct chats: isRead means the other participant has read messages sent by current user
      // For groups: isRead means current user has read messages sent by others
      let isRead = false;
      if (room.type === 'direct') {
        // If message is from current user, check if other participant read it
        if (msg.sender && msg.sender._id.toString() === userId.toString()) {
          isRead = otherParticipant && msg.readBy.some(r => r._id.toString() === otherParticipant.toString());
        } else {
          // If message is from other user, check if current user read it
          isRead = msg.readBy.some(r => r._id.toString() === userId.toString());
        }
      } else {
        // For groups, check if current user read it
        isRead = msg.readBy.some(r => r._id.toString() === userId.toString());
      }

      return {
        id: msg._id,
        content: msg.content,
        messageType: msg.messageType,
        fileUrl: msg.fileUrl,
        sender: msg.sender ? {
          id: msg.sender._id,
          username: msg.sender.username || msg.sender.email?.split('@')[0] || 'User',
          profilePicture: msg.sender.profilePicture || '',
          email: msg.sender.email
        } : null,
        isRead,
        readBy: msg.readBy.map(r => ({
          id: r._id,
          username: r.username
        })),
        createdAt: msg.createdAt
      };
    });

    res.status(200).json({
      success: true,
      messages: formattedMessages,
      page,
      limit,
      hasMore: messages.length === limit
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Create or get direct chat
// @route   POST /api/chat/direct
// @access  Private
const createDirectChat = async (req, res) => {
  try {
    const userId = req.user._id;
    const { otherUserId } = req.body;

    if (!otherUserId) {
      return res.status(400).json({
        success: false,
        message: 'Other user ID is required'
      });
    }

    if (otherUserId === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create chat with yourself'
      });
    }

    // Check if direct chat already exists
    let room = await Room.findOne({
      type: 'direct',
      participants: { $all: [userId, otherUserId], $size: 2 }
    }).populate('participants', 'username profilePicture email');

    if (!room) {
      // Create new direct chat
      room = await Room.create({
        type: 'direct',
        participants: [userId, otherUserId]
      });
      room = await Room.findById(room._id)
        .populate('participants', 'username profilePicture email');
    }

    const otherUser = room.participants.find(
      p => p._id.toString() !== userId.toString()
    );

    // Emit socket event to notify both participants about the new/updated direct chat
    const io = req.app.get('io');
    room.participants.forEach(participant => {
      const otherParticipant = room.participants.find(
        p => p._id.toString() !== participant._id.toString()
      );
      emitToUser(io, participant._id.toString(), 'conversation_updated', {
        id: room._id,
        type: room.type,
        name: otherParticipant?.username || otherParticipant?.email?.split('@')[0] || 'User',
        avatar: otherParticipant?.profilePicture || '',
        participants: room.participants.map(p => ({
          id: p._id,
          username: p.username || p.email?.split('@')[0] || 'User',
          profilePicture: p.profilePicture || '',
          email: p.email
        }))
      });
    });

    res.status(200).json({
      success: true,
      room: {
        id: room._id,
        type: room.type,
        name: otherUser?.username || otherUser?.email?.split('@')[0] || 'User',
        avatar: otherUser?.profilePicture || '',
        participants: room.participants.map(p => ({
          id: p._id,
          username: p.username || p.email?.split('@')[0] || 'User',
          profilePicture: p.profilePicture || '',
          email: p.email
        }))
      }
    });
  } catch (error) {
    console.error('Create direct chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Create group chat
// @route   POST /api/chat/groups
// @access  Private
const createGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, participantIds } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Group name is required'
      });
    }

    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one participant is required'
      });
    }

    // Add creator to participants if not included
    const allParticipants = [...new Set([userId.toString(), ...participantIds])];

    // Create group
    const room = await Room.create({
      name: name.trim(),
      type: 'group',
      participants: allParticipants,
      admins: [userId],
      createdBy: userId
    });

    const populatedRoom = await Room.findById(room._id)
      .populate('participants', 'username profilePicture email')
      .populate('admins', 'username profilePicture')
      .populate('createdBy', 'username profilePicture');

    // Emit socket event to notify all participants about the new group
    const io = req.app.get('io');
    populatedRoom.participants.forEach(participant => {
      emitToUser(io, participant._id.toString(), 'new_conversation', {
        id: populatedRoom._id,
        name: populatedRoom.name,
        type: populatedRoom.type,
        profilePicture: populatedRoom.profilePicture || '',
        participants: populatedRoom.participants.map(p => ({
          id: p._id,
          username: p.username || p.email?.split('@')[0] || 'User',
          profilePicture: p.profilePicture || '',
          email: p.email
        })),
        lastMessage: null,
        lastMessageAt: populatedRoom.createdAt,
        unreadCount: 0,
        isAdmin: populatedRoom.admins.some(a => a._id.toString() === participant._id.toString()),
        createdBy: populatedRoom.createdBy?._id.toString() === participant._id.toString()
      });
    });

    res.status(201).json({
      success: true,
      room: {
        id: populatedRoom._id,
        name: populatedRoom.name,
        type: populatedRoom.type,
        participants: populatedRoom.participants.map(p => ({
          id: p._id,
          username: p.username || p.email?.split('@')[0] || 'User',
          profilePicture: p.profilePicture || '',
          email: p.email
        })),
        admins: populatedRoom.admins.map(a => ({
          id: a._id,
          username: a.username || a.email?.split('@')[0] || 'User',
          profilePicture: a.profilePicture || ''
        })),
        createdBy: populatedRoom.createdBy?._id.toString() === userId.toString()
      }
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Get group details
// @route   GET /api/chat/groups/:groupId
// @access  Private
const getGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    const room = await Room.findById(groupId)
      .populate('participants', 'username profilePicture email')
      .populate('admins', 'username profilePicture')
      .populate('createdBy', 'username profilePicture');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (room.type !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'This is not a group chat'
      });
    }

    if (!room.participants.some(p => p._id.toString() === userId.toString())) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    res.status(200).json({
      success: true,
      room: {
        id: room._id,
        name: room.name,
        description: room.description || '',
        profilePicture: room.profilePicture || '',
        type: room.type,
        participants: room.participants.map(p => ({
          id: p._id,
          username: p.username || p.email?.split('@')[0] || 'User',
          profilePicture: p.profilePicture || '',
          email: p.email
        })),
        admins: room.admins.map(a => ({
          id: a._id,
          username: a.username || a.email?.split('@')[0] || 'User',
          profilePicture: a.profilePicture || ''
        })),
        inviteLink: room.inviteLink,
        isPublic: room.isPublic,
        createdBy: room.createdBy?._id.toString() === userId.toString(),
        isAdmin: room.admins.some(a => a._id.toString() === userId.toString())
      }
    });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Update group
// @route   PUT /api/chat/groups/:groupId
// @access  Private
const updateGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;
    const { name, description, profilePicture } = req.body;

    const room = await Room.findById(groupId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (room.type !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'This is not a group chat'
      });
    }

    // Only admins can update
    if (!room.admins.some(a => a.toString() === userId.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update the group'
      });
    }

    if (name !== undefined && name.trim()) {
      room.name = name.trim();
    }

    if (description !== undefined) {
      room.description = description.trim();
    }

    if (profilePicture !== undefined) {
      room.profilePicture = profilePicture;
    }

    await room.save();

    const populatedRoom = await Room.findById(room._id)
      .populate('participants', 'username profilePicture email')
      .populate('admins', 'username profilePicture');

    // Emit room update
    const io = req.app.get('io');
    emitToRoom(io, groupId, 'room_updated', {
      roomId: groupId,
      name: populatedRoom.name,
      description: populatedRoom.description,
      profilePicture: populatedRoom.profilePicture
    });

    res.status(200).json({
      success: true,
      room: {
        id: populatedRoom._id,
        name: populatedRoom.name,
        description: populatedRoom.description || '',
        profilePicture: populatedRoom.profilePicture || '',
        participants: populatedRoom.participants.map(p => ({
          id: p._id,
          username: p.username || p.email?.split('@')[0] || 'User',
          profilePicture: p.profilePicture || '',
          email: p.email
        }))
      }
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Delete group
// @route   DELETE /api/chat/groups/:groupId
// @access  Private
const deleteGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    const room = await Room.findById(groupId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Only creator can delete
    if (room.createdBy?.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator can delete the group'
      });
    }

    // Delete all messages
    await Message.deleteMany({ room: groupId });

    // Delete room
    await Room.findByIdAndDelete(groupId);

    // Emit room deleted
    const io = req.app.get('io');
    emitToRoom(io, groupId, 'room_deleted', { roomId: groupId });

    res.status(200).json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Generate invite link
// @route   POST /api/chat/groups/:groupId/invite-link
// @access  Private
const generateInviteLink = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;
    const { isPublic = false, expiryDays } = req.body;

    const room = await Room.findById(groupId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (room.type !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'This is not a group chat'
      });
    }

    // Only admins can generate invite links
    if (!room.admins.some(a => a.toString() === userId.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can generate invite links'
      });
    }

    // Generate unique invite link
    const inviteLink = uuidv4();

    room.inviteLink = inviteLink;
    room.isPublic = isPublic;
    if (expiryDays) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays);
      room.inviteLinkExpiry = expiryDate;
    } else {
      room.inviteLinkExpiry = null;
    }

    await room.save();

    res.status(200).json({
      success: true,
      inviteLink,
      isPublic,
      expiryDate: room.inviteLinkExpiry
    });
  } catch (error) {
    console.error('Generate invite link error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Join group via invite link
// @route   GET /api/chat/groups/join/:inviteLink
// @access  Private
const joinGroupByLink = async (req, res) => {
  try {
    const userId = req.user._id;
    const { inviteLink } = req.params;

    const room = await Room.findOne({ inviteLink });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Invalid invite link'
      });
    }

    // Check expiry
    if (room.inviteLinkExpiry && new Date() > room.inviteLinkExpiry) {
      return res.status(400).json({
        success: false,
        message: 'Invite link has expired'
      });
    }

    // Check if already a member
    if (room.participants.some(p => p.toString() === userId.toString())) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this group'
      });
    }

    // Add user to participants
    room.participants.push(userId);
    await room.save();

    const populatedRoom = await Room.findById(room._id)
      .populate('participants', 'username profilePicture email')
      .populate('admins', 'username profilePicture');

    const username = req.user.username || req.user.email?.split('@')[0] || 'User';

    // Create system message for member joined
    const systemMessage = await Message.create({
      room: room._id,
      content: `${username} joined the group`,
      messageType: 'system',
      sender: null
    });

    // Update room's last message
    room.lastMessage = systemMessage._id;
    room.lastMessageAt = new Date();
    await room.save();

    // Emit member joined
    const io = req.app.get('io');
    emitToRoom(io, room._id.toString(), 'member_joined', {
      roomId: room._id,
      userId,
      username: username
    });

    // Emit system message to room
    emitToRoom(io, room._id.toString(), 'message_received', {
      id: systemMessage._id,
      content: systemMessage.content,
      messageType: 'system',
      sender: null,
      roomId: room._id,
      createdAt: systemMessage.createdAt
    });

    // Notify the new member about the group
    emitToUser(io, userId.toString(), 'new_conversation', {
      id: populatedRoom._id,
      name: populatedRoom.name,
      type: populatedRoom.type,
      profilePicture: populatedRoom.profilePicture || '',
      participants: populatedRoom.participants.map(p => ({
        id: p._id,
        username: p.username || p.email?.split('@')[0] || 'User',
        profilePicture: p.profilePicture || '',
        email: p.email
      })),
      lastMessage: null,
      lastMessageAt: populatedRoom.updatedAt,
      unreadCount: 0,
      isAdmin: populatedRoom.admins.some(a => a._id.toString() === userId.toString()),
      createdBy: populatedRoom.createdBy?.toString() === userId.toString()
    });

    res.status(200).json({
      success: true,
      room: {
        id: populatedRoom._id,
        name: populatedRoom.name,
        type: populatedRoom.type,
        participants: populatedRoom.participants.map(p => ({
          id: p._id,
          username: p.username || p.email?.split('@')[0] || 'User',
          profilePicture: p.profilePicture || '',
          email: p.email
        }))
      }
    });
  } catch (error) {
    console.error('Join group by link error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Add member to group (admin only)
// @route   POST /api/chat/groups/:groupId/members
// @access  Private
const addMemberToGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;
    const { memberId } = req.body;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: 'Member ID is required'
      });
    }

    const room = await Room.findById(groupId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (room.type !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'This is not a group chat'
      });
    }

    // Only admins can add members
    if (!room.admins.some(a => a.toString() === userId.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can add members'
      });
    }

    // Check if already a member
    if (room.participants.some(p => p.toString() === memberId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this group'
      });
    }

    // Add member
    room.participants.push(memberId);
    await room.save();

    const populatedRoom = await Room.findById(room._id)
      .populate('participants', 'username profilePicture email')
      .populate('admins', 'username profilePicture');

    const newMember = await User.findById(memberId).select('username email');
    const username = newMember?.username || newMember?.email?.split('@')[0] || 'User';

    // Create system message for member joined
    const systemMessage = await Message.create({
      room: groupId,
      content: `${username} joined the group`,
      messageType: 'system',
      sender: null
    });

    // Update room's last message
    room.lastMessage = systemMessage._id;
    room.lastMessageAt = new Date();
    await room.save();

    // Emit member joined
    const io = req.app.get('io');
    emitToRoom(io, groupId, 'member_joined', {
      roomId: groupId,
      userId: memberId,
      username: username
    });

    // Emit system message to room
    emitToRoom(io, groupId, 'message_received', {
      id: systemMessage._id,
      content: systemMessage.content,
      messageType: 'system',
      sender: null,
      roomId: groupId,
      createdAt: systemMessage.createdAt
    });

    // Notify the new member about the group (if they weren't already a member)
    emitToUser(io, memberId, 'new_conversation', {
      id: populatedRoom._id,
      name: populatedRoom.name,
      type: populatedRoom.type,
      profilePicture: populatedRoom.profilePicture || '',
      participants: populatedRoom.participants.map(p => ({
        id: p._id,
        username: p.username || p.email?.split('@')[0] || 'User',
        profilePicture: p.profilePicture || '',
        email: p.email
      })),
      lastMessage: null,
      lastMessageAt: populatedRoom.updatedAt,
      unreadCount: 0,
      isAdmin: populatedRoom.admins.some(a => a._id.toString() === memberId),
      createdBy: populatedRoom.createdBy?.toString() === memberId
    });

    res.status(200).json({
      success: true,
      room: {
        id: populatedRoom._id,
        name: populatedRoom.name,
        participants: populatedRoom.participants.map(p => ({
          id: p._id,
          username: p.username || p.email?.split('@')[0] || 'User',
          profilePicture: p.profilePicture || '',
          email: p.email
        }))
      }
    });
  } catch (error) {
    console.error('Add member to group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Remove member from group (admin only)
// @route   DELETE /api/chat/groups/:groupId/members/:memberId
// @access  Private
const removeMemberFromGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId, memberId } = req.params;

    const room = await Room.findById(groupId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (room.type !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'This is not a group chat'
      });
    }

    // Only admins can remove members
    if (!room.admins.some(a => a.toString() === userId.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can remove members'
      });
    }

    // Cannot remove yourself
    if (memberId === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot remove yourself. Leave the group instead.'
      });
    }

    // Remove member
    room.participants = room.participants.filter(
      p => p.toString() !== memberId
    );
    await room.save();

    const populatedRoom = await Room.findById(room._id)
      .populate('participants', 'username profilePicture email');

    const removedMember = await User.findById(memberId).select('username email');
    const username = removedMember?.username || removedMember?.email?.split('@')[0] || 'User';

    // Create system message for member removed
    const systemMessage = await Message.create({
      room: groupId,
      content: `${username} was removed from the group`,
      messageType: 'system',
      sender: null
    });

    // Update room's last message
    room.lastMessage = systemMessage._id;
    room.lastMessageAt = new Date();
    await room.save();

    // Emit member removed
    const io = req.app.get('io');
    emitToRoom(io, groupId, 'member_removed', {
      roomId: groupId,
      userId: memberId,
      username: username
    });

    // Emit system message to room
    emitToRoom(io, groupId, 'message_received', {
      id: systemMessage._id,
      content: systemMessage.content,
      messageType: 'system',
      sender: null,
      roomId: groupId,
      createdAt: systemMessage.createdAt
    });

    res.status(200).json({
      success: true,
      room: {
        id: populatedRoom._id,
        name: populatedRoom.name,
        participants: populatedRoom.participants.map(p => ({
          id: p._id,
          username: p.username || p.email?.split('@')[0] || 'User',
          profilePicture: p.profilePicture || '',
          email: p.email
        }))
      }
    });
  } catch (error) {
    console.error('Remove member from group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/chat/messages/:messageId/read
// @access  Private
const markMessageAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is participant
    const room = await Room.findById(message.room);
    if (!room.participants.some(p => p.toString() === userId.toString())) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant of this room'
      });
    }

    // Add user to readBy if not already
    if (!message.readBy.some(r => r.toString() === userId.toString())) {
      message.readBy.push(userId);
      await message.save();
    }

    res.status(200).json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Delete message
// @route   DELETE /api/chat/messages/:messageId
// @access  Private
const deleteMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Only sender can delete
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages'
      });
    }

    // Soft delete
    message.deleted = true;
    message.deletedAt = new Date();
    await message.save();

    // Emit message deleted
    const io = req.app.get('io');
    emitToRoom(io, message.room.toString(), 'message_deleted', {
      messageId: message._id,
      roomId: message.room
    });

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Send message (REST fallback)
// @route   POST /api/chat/conversations/:roomId/messages
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { roomId } = req.params;
    const { content, messageType = 'text', fileUrl = '' } = req.body;

    // Allow empty content if there's a file
    if (!content || !content.trim()) {
      if (!fileUrl) {
        return res.status(400).json({
          success: false,
          message: 'Message content or file is required'
        });
      }
    }

    // Verify user is a participant
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (!room.participants.some(p => p.toString() === userId.toString())) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant of this room'
      });
    }

    // Create message
    const message = await Message.create({
      sender: userId,
      room: roomId,
      content: content.trim(),
      messageType,
      fileUrl
    });

    // Update room's last message
    room.lastMessage = message._id;
    room.lastMessageAt = new Date();
    await room.save();

    // Populate message
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username profilePicture email');

    // Emit to room via socket
    const io = req.app.get('io');
    emitToRoom(io, roomId, 'message_received', {
      id: populatedMessage._id,
      content: populatedMessage.content,
      messageType: populatedMessage.messageType,
      fileUrl: populatedMessage.fileUrl,
      sender: {
        id: populatedMessage.sender._id,
        username: populatedMessage.sender.username || populatedMessage.sender.email?.split('@')[0] || 'User',
        profilePicture: populatedMessage.sender.profilePicture || '',
        email: populatedMessage.sender.email
      },
      roomId,
      createdAt: populatedMessage.createdAt
    });

    res.status(201).json({
      success: true,
      message: {
        id: populatedMessage._id,
        content: populatedMessage.content,
        messageType: populatedMessage.messageType,
        fileUrl: populatedMessage.fileUrl,
        sender: {
          id: populatedMessage.sender._id,
          username: populatedMessage.sender.username || populatedMessage.sender.email?.split('@')[0] || 'User',
          profilePicture: populatedMessage.sender.profilePicture || '',
          email: populatedMessage.sender.email
        },
        createdAt: populatedMessage.createdAt
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Get upload signature for chat file uploads
// @route   GET /api/chat/upload-signature
// @access  Private
const getChatUploadSignature = async (req, res) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    // Get folder from query parameter, default to 'chat'
    const folder = req.query.folder || 'chat';
    
    // Parameters for the upload (supports both images and files)
    const params = {
      folder: folder,
      timestamp: timestamp
    };

    // Generate signature
    const signature = cloudinary.utils.api_sign_request(
      params,
      process.env.CLOUDINARY_API_SECRET
    );

    res.status(200).json({
      success: true,
      signature: signature,
      timestamp: timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder: folder
    });
  } catch (error) {
    console.error('Get chat upload signature error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate upload signature'
    });
  }
};

// @desc    Get users currently on chat page with last seen info
// @route   GET /api/chat/online-users
// @access  Private
const getOnlineUsers = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get current user with friends
    const currentUser = await User.findById(userId).populate({
      path: 'friends',
      select: 'username profilePicture email lastSeen'
    });
    
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get the set of users currently on chat page from socket.js
    const onlineUserIds = Array.from(usersOnChatPage);
    
    // Build response with online status and lastSeen for friends
    const friendsStatus = currentUser.friends.map(friend => ({
      userId: friend._id.toString(),
      isOnline: onlineUserIds.includes(friend._id.toString()),
      lastSeen: friend.lastSeen
    }));
    
    res.json({
      success: true,
      onlineUsers: onlineUserIds,
      friendsStatus
    });
  } catch (error) {
    console.error('Error getting online users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get online users'
    });
  }
};

// @desc    Block/Unblock user
// @route   PUT /api/chat/users/:userId/block
// @access  Private
const blockUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const { userId: targetUserId } = req.params;

    if (userId.toString() === targetUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot block yourself'
      });
    }

    const currentUser = await User.findById(userId);
    const targetUser = await User.findById(targetUserId);

    if (!currentUser || !targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isBlocked = currentUser.blockedUsers.some(
      blockedId => blockedId.toString() === targetUserId.toString()
    );

    if (isBlocked) {
      // Unblock user
      currentUser.blockedUsers = currentUser.blockedUsers.filter(
        blockedId => blockedId.toString() !== targetUserId.toString()
      );
      await currentUser.save();

      res.status(200).json({
        success: true,
        message: 'User unblocked successfully',
        blocked: false
      });
    } else {
      // Block user
      currentUser.blockedUsers.push(targetUserId);
      await currentUser.save();

      res.status(200).json({
        success: true,
        message: 'User blocked successfully',
        blocked: true
      });
    }
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Check if user is blocked
// @route   GET /api/chat/users/:userId/block-status
// @access  Private
const getBlockStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const { userId: targetUserId } = req.params;

    const currentUser = await User.findById(userId);

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isBlocked = currentUser.blockedUsers.some(
      blockedId => blockedId.toString() === targetUserId.toString()
    );

    res.status(200).json({
      success: true,
      blocked: isBlocked
    });
  } catch (error) {
    console.error('Get block status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Make member admin
// @route   POST /api/chat/groups/:groupId/admins
// @access  Private
const makeMemberAdmin = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;
    const { memberId } = req.body;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: 'Member ID is required'
      });
    }

    const room = await Room.findById(groupId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (room.type !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'This is not a group chat'
      });
    }

    // Only admins can make other members admin
    if (!room.admins.some(a => a.toString() === userId.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can make other members admin'
      });
    }

    // Check if member is a participant
    if (!room.participants.some(p => p.toString() === memberId)) {
      return res.status(400).json({
        success: false,
        message: 'User is not a member of this group'
      });
    }

    // Check if already an admin
    if (room.admins.some(a => a.toString() === memberId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already an admin'
      });
    }

    // Add to admins
    room.admins.push(memberId);
    await room.save();

    const populatedRoom = await Room.findById(room._id)
      .populate('participants', 'username profilePicture email')
      .populate('admins', 'username profilePicture');

    // Emit admin added event
    const io = req.app.get('io');
    emitToRoom(io, groupId, 'admin_added', {
      roomId: groupId,
      userId: memberId
    });

    res.status(200).json({
      success: true,
      message: 'Member is now an admin',
      room: {
        id: populatedRoom._id,
        admins: populatedRoom.admins.map(a => ({
          id: a._id,
          username: a.username || a.email?.split('@')[0] || 'User',
          profilePicture: a.profilePicture || ''
        }))
      }
    });
  } catch (error) {
    console.error('Make member admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Leave group
// @route   POST /api/chat/groups/:groupId/leave
// @access  Private
const leaveGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    const room = await Room.findById(groupId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (room.type !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'This is not a group chat'
      });
    }

    // Check if user is a participant
    if (!room.participants.some(p => p.toString() === userId.toString())) {
      return res.status(400).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    const leavingUser = await User.findById(userId).select('username email');
    const username = leavingUser?.username || leavingUser?.email?.split('@')[0] || 'User';

    // Create system message BEFORE removing user (so they're still a participant)
    const systemMessage = await Message.create({
      room: groupId,
      content: `${username} left the group`,
      messageType: 'system',
      sender: null
    });

    // Remove from participants
    room.participants = room.participants.filter(p => p.toString() !== userId.toString());
    
    // Remove from admins if admin
    room.admins = room.admins.filter(a => a.toString() !== userId.toString());

    // Update room's last message
    room.lastMessage = systemMessage._id;
    room.lastMessageAt = new Date();
    await room.save();

    // Emit member left event
    const io = req.app.get('io');
    emitToRoom(io, groupId, 'member_left', {
      roomId: groupId,
      userId: userId.toString(),
      username: username
    });

    // Emit system message to room
    emitToRoom(io, groupId, 'message_received', {
      id: systemMessage._id,
      content: systemMessage.content,
      messageType: 'system',
      sender: null,
      roomId: groupId,
      createdAt: systemMessage.createdAt
    });

    res.status(200).json({
      success: true,
      message: 'You left the group'
    });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Clear all messages in a chat
// @route   DELETE /api/chat/conversations/:roomId/messages
// @access  Private
const clearChat = async (req, res) => {
  try {
    const userId = req.user._id;
    const { roomId } = req.params;

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Verify user is a participant
    if (!room.participants.some(p => p.toString() === userId.toString())) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant of this room'
      });
    }

    // Delete all messages in the room
    await Message.deleteMany({ room: roomId });

    // Update room's last message
    room.lastMessage = null;
    room.lastMessageAt = null;
    await room.save();

    // Emit clear chat event
    const io = req.app.get('io');
    emitToRoom(io, roomId, 'chat_cleared', { roomId });

    res.status(200).json({
      success: true,
      message: 'Chat cleared successfully'
    });
  } catch (error) {
    console.error('Clear chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  createDirectChat,
  createGroup,
  getGroup,
  updateGroup,
  deleteGroup,
  generateInviteLink,
  joinGroupByLink,
  addMemberToGroup,
  removeMemberFromGroup,
  markMessageAsRead,
  deleteMessage,
  getOnlineUsers,
  getChatUploadSignature,
  blockUser,
  getBlockStatus,
  clearChat,
  makeMemberAdmin,
  leaveGroup
};

