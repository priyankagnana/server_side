const express = require('express');
const router = express.Router();
const {
  getAnalytics,
  getCollaborationBoardRequests,
  approveCollaborationBoardRequest,
  rejectCollaborationBoardRequest,
  getEvents,
  createEvent,
  getEventRequests,
  approveEventRequest,
  rejectEventRequest,
  deleteEvent,
  getReports,
  reviewReport,
  deletePost,
  deleteReel,
  banUser,
  unbanUser
} = require('../controllers/adminController');
const { authenticate, isAdmin } = require('../middleware/authMiddleware');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(isAdmin);

// Analytics
router.get('/analytics', getAnalytics);

// Collaboration Board Requests
router.get('/collaboration-board-requests', getCollaborationBoardRequests);
router.put('/collaboration-board-requests/:id/approve', approveCollaborationBoardRequest);
router.put('/collaboration-board-requests/:id/reject', rejectCollaborationBoardRequest);

// Events
router.get('/events', getEvents);
router.post('/events', createEvent);
router.delete('/events/:id', deleteEvent);

// Event Requests
router.get('/event-requests', getEventRequests);
router.put('/event-requests/:id/approve', approveEventRequest);
router.put('/event-requests/:id/reject', rejectEventRequest);

// Reports
router.get('/reports', getReports);
router.put('/reports/:id/review', reviewReport);

// Content Management
router.delete('/posts/:id', deletePost);
router.delete('/reels/:id', deleteReel);

// User Management
router.put('/users/:id/ban', banUser);
router.put('/users/:id/unban', unbanUser);

module.exports = router;

