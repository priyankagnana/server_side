const express = require('express');
const router = express.Router();
const {
  createCallRoom,
  joinCallRoom,
  endCallSession
} = require('../controllers/callController');
const { authenticate } = require('../middleware/authMiddleware');

// All call routes require authentication
router.use(authenticate);

// Create call room
router.post('/create-room', createCallRoom);

// Join existing call room
router.post('/join-room', joinCallRoom);

// End call session
router.post('/end-session', endCallSession);

module.exports = router;

