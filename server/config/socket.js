const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Store user socket mappings
const userSockets = new Map(); // userId -> socketId
const socketUsers = new Map(); // socketId -> userId
const usersOnChatPage = new Set(); // userId -> track who is on chat page

// Authenticate socket connection
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    // Attach user to socket
    socket.userId = user._id.toString();
    socket.user = user;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error'));
  }
};

// Initialize socket.io
const initializeSocket = (io) => {
  // Socket authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const userId = socket.userId;
    const socketId = socket.id;

    console.log(`[Socket] User ${userId} connected with socket ${socketId}`);

    // Store socket mapping (ensure userId is string)
    const userIdStr = userId.toString();
    userSockets.set(userIdStr, socketId);
    socketUsers.set(socketId, userIdStr);
    console.log(`[Socket] Stored mapping: userId=${userIdStr}, socketId=${socketId}`);
    console.log(`[Socket] Total connected users: ${userSockets.size}`);

    // Notify user is online (general connection)
    socket.broadcast.emit('user_online', { userId: userIdStr });

    // Join user's personal room for notifications
    socket.join(`user_${userIdStr}`);

    // Study Group Channel handlers
    socket.on('join_channel', (channelRoom) => {
      socket.join(channelRoom);
      console.log(`[Socket] User ${userIdStr} joined channel ${channelRoom}`);
    });

    socket.on('leave_channel', (channelRoom) => {
      socket.leave(channelRoom);
      console.log(`[Socket] User ${userIdStr} left channel ${channelRoom}`);
    });

    socket.on('join_group', (groupId) => {
      socket.join(`group-${groupId}`);
      console.log(`[Socket] User ${userIdStr} joined group ${groupId}`);
    });

    socket.on('leave_group', (groupId) => {
      socket.leave(`group-${groupId}`);
      console.log(`[Socket] User ${userIdStr} left group ${groupId}`);
    });

    // Handle chat page presence
    socket.on('chat_page_enter', () => {
      const userIdStr = userId.toString();

      // Add user to chat page set (only if not already there)
      if (!usersOnChatPage.has(userIdStr)) {
        usersOnChatPage.add(userIdStr);
        console.log(`[Backend] User ${userIdStr} entered chat page. Total on chat: ${usersOnChatPage.size}`);

        // Get list of other users BEFORE adding current user (to send to current user)
        const otherUsersOnChatPage = Array.from(usersOnChatPage).filter(id => id !== userIdStr);

        // Notify all other users on chat page that this user is now on chat page
        usersOnChatPage.forEach(otherUserId => {
          if (otherUserId !== userIdStr) {
            const otherSocketId = userSockets.get(otherUserId);
            if (otherSocketId) {
              io.to(otherSocketId).emit('user_on_chat_page', { userId: userIdStr });
            }
          }
        });

        // Notify this user about all other users currently on chat page
        if (otherUsersOnChatPage.length > 0) {
          otherUsersOnChatPage.forEach(otherUserId => {
            socket.emit('user_on_chat_page', { userId: otherUserId });
          });
        }
      } else {
        console.log(`[Backend] User ${userIdStr} already on chat page (duplicate enter event - ignoring)`);
      }
    });

    socket.on('chat_page_leave', () => {
      const userIdStr = userId.toString();

      // Remove user from chat page set
      if (usersOnChatPage.has(userIdStr)) {
        usersOnChatPage.delete(userIdStr);
        console.log(`[Backend] User ${userIdStr} left chat page. Total on chat: ${usersOnChatPage.size}`);

        // Notify all other users on chat page that this user left chat page
        usersOnChatPage.forEach(otherUserId => {
          const otherSocketId = userSockets.get(otherUserId);
          if (otherSocketId) {
            console.log(`[Backend] Notifying ${otherUserId} that ${userIdStr} left chat page`);
            io.to(otherSocketId).emit('user_left_chat_page', { userId: userIdStr });
          } else {
            console.warn(`[Backend] Could not find socket for user ${otherUserId}`);
          }
        });
      } else {
        console.log(`[Backend] User ${userIdStr} not on chat page (duplicate leave event - ignoring)`);
      }
    });

    // Join all rooms user is part of
    socket.on('join_rooms', async (roomIds) => {
      if (Array.isArray(roomIds)) {
        roomIds.forEach(roomId => {
          socket.join(`room_${roomId}`);
        });
      }
    });

    // Join a specific room
    socket.on('join_room', (roomId) => {
      socket.join(`room_${roomId}`);
      socket.to(`room_${roomId}`).emit('user_joined_room', { userId, roomId });
    });

    // Leave a room
    socket.on('leave_room', (roomId) => {
      socket.leave(`room_${roomId}`);
      socket.to(`room_${roomId}`).emit('user_left_room', { userId, roomId });
    });

    // Typing indicators
    socket.on('typing_start', ({ roomId }) => {
      socket.to(`room_${roomId}`).emit('user_typing', { userId, roomId });
    });

    socket.on('typing_stop', ({ roomId }) => {
      socket.to(`room_${roomId}`).emit('user_stopped_typing', { userId, roomId });
    });

    // Send message
    socket.on('send_message', async ({ roomId, content, messageType = 'text', fileUrl = '' }) => {
      try {
        // Verify user is a participant
        const room = await Room.findById(roomId);
        if (!room || !room.participants.some(p => p.toString() === userId)) {
          socket.emit('message_error', { error: 'You are not a participant of this room' });
          return;
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

        // Get room to determine if it's direct chat
        const messageRoom = await Room.findById(roomId);
        const otherParticipant = messageRoom.type === 'direct'
          ? messageRoom.participants.find(p => p.toString() !== userId)
          : null;

        // For direct chats: isRead is false initially (receiver hasn't read it yet)
        // For groups: isRead means current user has read it (which they just sent, so false)
        const isRead = false;

        // Emit to room
        io.to(`room_${roomId}`).emit('message_received', {
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
          isRead,
          createdAt: populatedMessage.createdAt
        });

        // Confirm to sender
        socket.emit('message_sent', {
          id: populatedMessage._id,
          roomId
        });
      } catch (error) {
        console.error('Send message via socket error:', error);
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    // Mark messages as read
    socket.on('mark_read', async ({ roomId, messageIds }) => {
      try {
        const room = await Room.findById(roomId);
        if (!room || !room.participants.some(p => p.toString() === userId)) {
          return;
        }

        // Filter out invalid message IDs (like system messages)
        const validMessageIds = messageIds.filter(id => {
          try {
            // Check if it's a valid ObjectId
            return mongoose.Types.ObjectId.isValid(id) && id.toString().length === 24;
          } catch (error) {
            return false;
          }
        });

        if (validMessageIds.length === 0) {
          return;
        }

        // Update messages to mark as read
        await Message.updateMany(
          { _id: { $in: validMessageIds }, room: roomId },
          { $addToSet: { readBy: userId } }
        );

        // For direct chats, notify the sender that their messages were read
        // For groups, notify all participants
        if (room.type === 'direct') {
          // Find the other participant (the sender of the messages)
          const otherParticipant = room.participants.find(p => p.toString() !== userId);
          if (otherParticipant) {
            // Notify the sender that their messages were read
            io.to(`user_${otherParticipant}`).emit('messages_read', {
              roomId,
              userId,
              messageIds
            });
          }
        } else {
          // For groups, notify all participants
          socket.to(`room_${roomId}`).emit('messages_read', {
            roomId,
            userId,
            messageIds
          });
        }
      } catch (error) {
        console.error('Mark read via socket error:', error);
      }
    });

    // Handle call events
    socket.on('call_accepted', ({ meetingId, callerId }) => {
      // Notify caller that call was accepted
      console.log(`[Socket] Call accepted event received: meetingId=${meetingId}, callerId=${callerId}`);
      const callerIdStr = callerId?.toString();
      if (!callerIdStr) {
        console.error('[Socket] No callerId provided in call_accepted event');
        return;
      }

      console.log(`[Socket] Looking up socket for caller: ${callerIdStr}`);
      console.log(`[Socket] Available sockets: ${Array.from(userSockets.keys()).join(', ')}`);

      const callerSocketId = userSockets.get(callerIdStr);
      if (callerSocketId) {
        console.log(`[Socket] Found caller socket: ${callerSocketId}, emitting call_accepted`);
        io.to(callerSocketId).emit('call_accepted', { meetingId });
      } else {
        // Fallback: emit to user's personal room
        console.log(`[Socket] Caller socket not found, using fallback room: user_${callerIdStr}`);
        io.to(`user_${callerIdStr}`).emit('call_accepted', { meetingId });
      }
    });

    socket.on('call_rejected', ({ callerId }) => {
      // Notify caller that call was rejected
      console.log(`Call rejected: callerId=${callerId}`);
      const callerIdStr = callerId?.toString();
      if (callerIdStr) {
        const callerSocketId = userSockets.get(callerIdStr);
        if (callerSocketId) {
          io.to(callerSocketId).emit('call_rejected', {});
        } else {
          // Fallback: emit to user's personal room
          io.to(`user_${callerIdStr}`).emit('call_rejected', {});
        }
      }
    });

    socket.on('call_ended', ({ callerId, receiverId }) => {
      // Notify both users that call ended
      console.log(`Call ended: callerId=${callerId}, receiverId=${receiverId}`);
      if (callerId) {
        const callerIdStr = callerId?.toString();
        if (callerIdStr) {
          const callerSocketId = userSockets.get(callerIdStr);
          if (callerSocketId) {
            io.to(callerSocketId).emit('call_ended', {});
          } else {
            io.to(`user_${callerIdStr}`).emit('call_ended', {});
          }
        }
      }
      if (receiverId) {
        const receiverIdStr = receiverId?.toString();
        if (receiverIdStr) {
          const receiverSocketId = userSockets.get(receiverIdStr);
          if (receiverSocketId) {
            io.to(receiverSocketId).emit('call_ended', {});
          } else {
            io.to(`user_${receiverIdStr}`).emit('call_ended', {});
          }
        }
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      const userIdStr = userId.toString();
      console.log(`User ${userIdStr} disconnected`);

      // Update lastSeen timestamp in database
      try {
        const User = require('../models/User');
        await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
      } catch (error) {
        console.error('Error updating lastSeen:', error);
      }

      // Remove from all tracking
      userSockets.delete(userIdStr);
      socketUsers.delete(socketId);

      // Remove from chat page and notify others
      if (usersOnChatPage.has(userIdStr)) {
        usersOnChatPage.delete(userIdStr);
        // Notify users on chat page that this user left
        usersOnChatPage.forEach(otherUserId => {
          const otherSocketId = userSockets.get(otherUserId);
          if (otherSocketId) {
            io.to(otherSocketId).emit('user_left_chat_page', { userId: userIdStr });
          }
        });
      }

      // Notify general offline status
      socket.broadcast.emit('user_offline', { userId: userIdStr });
    });
  });

  return { userSockets, socketUsers };
};

// Helper to get socket ID for a user
const getSocketId = (userId) => {
  return userSockets.get(userId);
};

// Helper to emit to a specific user
const emitToUser = (io, userId, event, data) => {
  // Ensure userId is a string
  const userIdStr = userId?.toString();
  if (!userIdStr) {
    console.warn(`emitToUser: Invalid userId provided: ${userId}`);
    return;
  }

  // Try to find socket by direct lookup
  const socketId = getSocketId(userIdStr);
  if (socketId) {
    console.log(`Emitting ${event} to user ${userIdStr} via socket ${socketId}`);
    io.to(socketId).emit(event, data);
    return;
  }

  // Fallback: emit to user's personal room (in case socket mapping is stale)
  console.log(`Socket not found for user ${userIdStr}, trying personal room`);
  io.to(`user_${userIdStr}`).emit(event, data);
};

// Helper to emit to a room
const emitToRoom = (io, roomId, event, data) => {
  io.to(`room_${roomId}`).emit(event, data);
};

module.exports = {
  initializeSocket,
  getSocketId,
  emitToUser,
  emitToRoom,
  userSockets,
  socketUsers,
  usersOnChatPage
};

