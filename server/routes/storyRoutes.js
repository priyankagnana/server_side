const express = require('express');
const router = express.Router();
const { createStory, getStories, addView, deleteStory } = require('../controllers/storyController');
const { authenticate } = require('../middleware/authMiddleware');

// All story routes require authentication
router.use(authenticate);

// Create a new story
router.post('/', createStory);

// Get all active stories
router.get('/', getStories);

// Add view to story
router.put('/:id/view', addView);

// Delete a story
router.delete('/:id', deleteStory);

module.exports = router;

