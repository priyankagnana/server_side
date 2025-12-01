const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/chatController');
const { authenticate } = require('../middleware/authMiddleware');

// All chat routes require authentication
router.use(authenticate);

// Online status (polling)
router.get('/online-users', getOnlineUsers);

// File upload signature
router.get('/upload-signature', getChatUploadSignature);

// Conversations
router.get('/conversations', getConversations);
router.get('/conversations/:roomId/messages', getMessages);
router.post('/conversations/:roomId/messages', sendMessage);

// Direct chat
router.post('/direct', createDirectChat);

// Groups
router.post('/groups', createGroup);
router.get('/groups/:groupId', getGroup);
router.put('/groups/:groupId', updateGroup);
router.delete('/groups/:groupId', deleteGroup);
router.post('/groups/:groupId/invite-link', generateInviteLink);
router.get('/groups/join/:inviteLink', joinGroupByLink);
router.post('/groups/:groupId/members', addMemberToGroup);
router.delete('/groups/:groupId/members/:memberId', removeMemberFromGroup);

// Messages
router.put('/messages/:messageId/read', markMessageAsRead);
router.delete('/messages/:messageId', deleteMessage);
router.delete('/conversations/:roomId/messages', clearChat);

// User blocking
router.put('/users/:userId/block', blockUser);
router.get('/users/:userId/block-status', getBlockStatus);

// Group management
router.post('/groups/:groupId/admins', makeMemberAdmin);
router.post('/groups/:groupId/leave', leaveGroup);

module.exports = router;

