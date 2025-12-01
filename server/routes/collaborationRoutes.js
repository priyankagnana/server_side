const express = require('express');
const router = express.Router();
const { getApprovedCollaborationBoardPosts, createCollaborationBoardRequest } = require('../controllers/collaborationController');
const { authenticate } = require('../middleware/authMiddleware');

// Get approved collaboration board posts (public, but requires auth for consistency)
router.get('/posts', authenticate, getApprovedCollaborationBoardPosts);

// Create collaboration board request (requires auth)
router.post('/request', authenticate, createCollaborationBoardRequest);

module.exports = router;

