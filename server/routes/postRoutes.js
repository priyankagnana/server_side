const express = require('express');
const router = express.Router();
const { createPost, getPosts, deletePost, likePost, pinPost, addComment, voteComment, deleteComment, getComments, getPostLikes } = require('../controllers/postController');
const { authenticate } = require('../middleware/authMiddleware');

// All post routes require authentication
router.use(authenticate);

// Create a new post
router.post('/', createPost);

// Get all posts
router.get('/', getPosts);

// Delete a post
router.delete('/:id', deletePost);

// Like/Unlike a post
router.put('/:id/like', likePost);

// Pin/Unpin a post to profile
router.put('/:id/pin', pinPost);

// Get users who liked a post
router.get('/:id/likes', getPostLikes);

// Get comments for a post
router.get('/:id/comments', getComments);

// Add comment to post
router.post('/:id/comments', addComment);

// Vote on comment
router.put('/:postId/comments/:commentId/vote', voteComment);

// Delete comment
router.delete('/:postId/comments/:commentId', deleteComment);

module.exports = router;

