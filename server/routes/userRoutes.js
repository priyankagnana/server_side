const express = require('express');
const router = express.Router();
const { updateBio, getProfile, getUserById, sendFriendRequest, getFriendRequests, acceptFriendRequest, rejectFriendRequest, removeFriend, getUserFriends, savePost, saveReel, getSavedPosts, getSavedReels, getAllUsers } = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');

// All user routes require authentication
router.use(authenticate);

// Get user profile
router.get('/profile', getProfile);

// Get friend requests
router.get('/friend-requests', getFriendRequests);

// Accept friend request
router.put('/friend-requests/:id/accept', acceptFriendRequest);

// Reject friend request
router.put('/friend-requests/:id/reject', rejectFriendRequest);

// Remove friend
router.delete('/friends/:id', removeFriend);

// Get saved posts
router.get('/saved-posts', getSavedPosts);

// Get saved reels
router.get('/saved-reels', getSavedReels);

// Save/Unsave a post
router.put('/posts/:id/save', savePost);

// Save/Unsave a reel
router.put('/reels/:id/save', saveReel);

// Get all users (for Find Study Partner) - must be before /:id route
router.get('/all', getAllUsers);

// Get user's friends - must be before /:id route
router.get('/:id/friends', getUserFriends);

// Get user profile by ID
router.get('/:id', getUserById);

// Update bio
router.put('/bio', updateBio);

// Send friend request
router.post('/friend-request', sendFriendRequest);

// Debug route to verify router is working
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'User routes are working' });
});

module.exports = router;

