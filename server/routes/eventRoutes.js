const express = require('express');
const router = express.Router();
const { getEvents, createEventRequest } = require('../controllers/eventController');
const { authenticate } = require('../middleware/authMiddleware');

// Get events (public, but requires auth for consistency)
router.get('/', authenticate, getEvents);

// Create event request (requires auth)
router.post('/request', authenticate, createEventRequest);

module.exports = router;

