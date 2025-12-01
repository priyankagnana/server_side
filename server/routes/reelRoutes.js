const express = require('express');
const router = express.Router();
const { getUploadSignature, createReel, getReels, likeReel, addView, deleteReel, addComment, getComments, voteComment, deleteComment } = require('../controllers/reelController');
const { authenticate } = require('../middleware/authMiddleware');

// All reel routes require authentication
router.use(authenticate);

// Get upload signature for direct Cloudinary upload
router.get('/upload-signature', getUploadSignature);

// Create a new reel
router.post('/', createReel);

// Get all reels
router.get('/', getReels);

// Like/Unlike a reel
router.put('/:id/like', likeReel);

// Add view to reel
router.put('/:id/view', addView);

// Delete a reel
router.delete('/:id', deleteReel);

// Get comments for a reel
router.get('/:id/comments', getComments);

// Add comment to reel
router.post('/:id/comments', addComment);

// Vote on comment
router.put('/:reelId/comments/:commentId/vote', voteComment);

// Delete comment
router.delete('/:reelId/comments/:commentId', deleteComment);

module.exports = router;

