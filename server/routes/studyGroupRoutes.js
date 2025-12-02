const express = require('express');
const router = express.Router();

// Import controllers
const {
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
} = require('../controllers/studyGroupController');

// Import authenticated middleware correctly
const { authenticate } = require('../middleware/authMiddleware');

// Apply authentication middleware correctly
router.use(authenticate);

// Study Group routes
router.post('/', createStudyGroup);
router.get('/', getStudyGroups);
router.post('/join', joinStudyGroup);
router.get('/:groupId', getStudyGroup);
router.post('/:groupId/leave', leaveStudyGroup);
router.delete('/:groupId', deleteStudyGroup);

// Join request routes
router.post('/:groupId/request', requestToJoin);
router.get('/:groupId/requests', getJoinRequests);
router.post('/:groupId/requests/:requestId/approve', approveRequest);
router.post('/:groupId/requests/:requestId/reject', rejectRequest);

// Member management routes
router.post('/:groupId/invite', inviteMember);
router.post('/:groupId/members/:memberId/make-admin', makeAdmin);
router.delete('/:groupId/members/:memberId', removeMember);

// Channel routes
router.post('/:groupId/channels', createChannel);
router.delete('/:groupId/channels/:channelId', deleteChannel);

// Message routes
router.get('/:groupId/channels/:channelId/messages', getChannelMessages);
router.post('/:groupId/channels/:channelId/messages', sendChannelMessage);

module.exports = router;
