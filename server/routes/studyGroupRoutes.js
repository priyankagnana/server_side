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
    sendChannelMessage
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

// Channel routes
router.post('/:groupId/channels', createChannel);
router.delete('/:groupId/channels/:channelId', deleteChannel);

// Message routes
router.get('/:groupId/channels/:channelId/messages', getChannelMessages);
router.post('/:groupId/channels/:channelId/messages', sendChannelMessage);

module.exports = router;
