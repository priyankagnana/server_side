const express = require('express');
const router = express.Router();
const { createReport } = require('../controllers/reportController');
const { authenticate } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticate);

// Create report
router.post('/', createReport);

module.exports = router;

