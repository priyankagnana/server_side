require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const { initializeSocket } = require('./config/socket');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;

// Connect to database
connectDB();

// Initialize Socket.io
initializeSocket(io);

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is healthy' });
});

// Auth routes
app.use('/api/auth', require('./routes/authRoutes'));

// User routes
app.use('/api/users', require('./routes/userRoutes'));

// Post routes
app.use('/api/posts', require('./routes/postRoutes'));

// Reel routes
app.use('/api/reels', require('./routes/reelRoutes'));

// Story routes
app.use('/api/stories', require('./routes/storyRoutes'));

// Chat routes
app.use('/api/chat', require('./routes/chatRoutes'));

// Admin routes
app.use('/api/admin', require('./routes/adminRoutes'));

// Collaboration routes
app.use('/api/collaboration', require('./routes/collaborationRoutes'));

// Event routes
app.use('/api/events', require('./routes/eventRoutes'));

// Report routes
app.use('/api/reports', require('./routes/reportRoutes'));

// Call routes
app.use('/api/calls', require('./routes/callRoutes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  // Handle payload too large error specifically
  if (err.type === 'entity.too.large' || err.message?.includes('too large') || err.name === 'PayloadTooLargeError') {
    return res.status(413).json({
      success: false,
      message: 'Request payload too large. Please compress your image or use a smaller file.'
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Available routes:');
  console.log('  POST /api/auth/signup');
  console.log('  POST /api/auth/login');
  console.log('  GET  /api/users/profile');
  console.log('  PUT  /api/users/bio');
  console.log('  POST /api/posts');
  console.log('  GET  /api/posts');
  console.log('  DELETE /api/posts/:id');
  console.log('  PUT  /api/posts/:id/pin');
  console.log('  POST /api/users/friend-request');
  console.log('  POST /api/reels');
  console.log('  GET  /api/reels');
  console.log('  POST /api/stories');
  console.log('  GET  /api/stories');
  console.log('  Socket.io server initialized');
});

// Export io for use in controllers
app.set('io', io);

