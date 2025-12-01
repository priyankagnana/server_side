const User = require('../models/User');
const Post = require('../models/Post');
const Reel = require('../models/Reel');
const CollaborationBoardRequest = require('../models/CollaborationBoardRequest');
const Event = require('../models/Event');
const EventRequest = require('../models/EventRequest');
const Report = require('../models/Report');
const Message = require('../models/Message');

// Get analytics
const getAnalytics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();
    const totalReels = await Reel.countDocuments();
    const totalEvents = await Event.countDocuments({ isApproved: true });
    const bannedUsers = await User.countDocuments({ isBanned: true });
    
    // Calculate engagement (total likes + comments)
    const posts = await Post.find();
    const reels = await Reel.find();
    
    let totalLikes = 0;
    let totalComments = 0;
    
    posts.forEach(post => {
      totalLikes += post.likes?.length || 0;
      totalComments += post.comments?.filter(c => !c.deleted).length || 0;
    });
    
    reels.forEach(reel => {
      totalLikes += reel.likes?.length || 0;
      totalComments += reel.comments?.filter(c => !c.deleted).length || 0;
    });
    
    const totalEngagement = totalLikes + totalComments;

    res.status(200).json({
      success: true,
      analytics: {
        totalUsers,
        totalPosts,
        totalReels,
        totalEvents,
        bannedUsers,
        totalLikes,
        totalComments,
        totalEngagement
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics'
    });
  }
};

// Collaboration Board Requests
const getCollaborationBoardRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) {
      query.status = status;
    }

    const requests = await CollaborationBoardRequest.find(query)
      .populate('requester', 'name username email profilePicture')
      .populate('reviewedBy', 'name username')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      requests
    });
  } catch (error) {
    console.error('Error fetching collaboration board requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching collaboration board requests'
    });
  }
};

const approveCollaborationBoardRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await CollaborationBoardRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    request.status = 'approved';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    res.status(200).json({
      success: true,
      message: 'Collaboration board request approved',
      request
    });
  } catch (error) {
    console.error('Error approving collaboration board request:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving collaboration board request'
    });
  }
};

const rejectCollaborationBoardRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const request = await CollaborationBoardRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    request.status = 'rejected';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    request.rejectionReason = reason || '';
    await request.save();

    res.status(200).json({
      success: true,
      message: 'Collaboration board request rejected',
      request
    });
  } catch (error) {
    console.error('Error rejecting collaboration board request:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting collaboration board request'
    });
  }
};

// Events Management
const getEvents = async (req, res) => {
  try {
    const events = await Event.find({ isApproved: true })
      .populate('createdBy', 'name username')
      .populate('approvedBy', 'name username')
      .sort({ date: 1 });

    res.status(200).json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching events'
    });
  }
};

const createEvent = async (req, res) => {
  try {
    const { title, description, date, time, location } = req.body;

    if (!title || !date || !time || !location) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, date, time, and location'
      });
    }

    const event = await Event.create({
      title,
      description: description || '',
      date,
      time,
      location,
      createdBy: req.user._id,
      isApproved: true,
      approvedBy: req.user._id,
      approvedAt: new Date()
    });

    const populatedEvent = await Event.findById(event._id)
      .populate('createdBy', 'name username')
      .populate('approvedBy', 'name username');

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event: populatedEvent
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating event'
    });
  }
};

const getEventRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) {
      query.status = status;
    }

    const requests = await EventRequest.find(query)
      .populate('requester', 'name username email profilePicture')
      .populate('reviewedBy', 'name username')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      requests
    });
  } catch (error) {
    console.error('Error fetching event requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching event requests'
    });
  }
};

const approveEventRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await EventRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Event request not found'
      });
    }

    // Create event from request
    const event = await Event.create({
      title: request.title,
      description: request.description,
      date: request.date,
      time: request.time,
      location: request.location,
      createdBy: request.requester,
      isApproved: true,
      approvedBy: req.user._id,
      approvedAt: new Date()
    });

    // Update request status
    request.status = 'approved';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    const populatedEvent = await Event.findById(event._id)
      .populate('createdBy', 'name username')
      .populate('approvedBy', 'name username');

    res.status(200).json({
      success: true,
      message: 'Event request approved and event created',
      event: populatedEvent,
      request
    });
  } catch (error) {
    console.error('Error approving event request:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving event request'
    });
  }
};

const rejectEventRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const request = await EventRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Event request not found'
      });
    }

    request.status = 'rejected';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    request.rejectionReason = reason || '';
    await request.save();

    res.status(200).json({
      success: true,
      message: 'Event request rejected',
      request
    });
  } catch (error) {
    console.error('Error rejecting event request:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting event request'
    });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findByIdAndDelete(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting event'
    });
  }
};

// Reports Management
const getReports = async (req, res) => {
  try {
    const { status, reportType } = req.query;
    const query = {};
    if (status) {
      query.status = status;
    }
    if (reportType) {
      query.reportType = reportType;
    }

    const reports = await Report.find(query)
      .populate('reporter', 'name username email')
      .populate('reviewedBy', 'name username')
      .populate('reportedItem')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      reports
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reports'
    });
  }
};

const reviewReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { actionTaken, adminNotes } = req.body;

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    report.status = 'reviewed';
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
    report.actionTaken = actionTaken || 'none';
    report.adminNotes = adminNotes || '';

    await report.save();

    res.status(200).json({
      success: true,
      message: 'Report reviewed',
      report
    });
  } catch (error) {
    console.error('Error reviewing report:', error);
    res.status(500).json({
      success: false,
      message: 'Error reviewing report'
    });
  }
};

const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findByIdAndDelete(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting post'
    });
  }
};

const deleteReel = async (req, res) => {
  try {
    const { id } = req.params;

    const reel = await Reel.findByIdAndDelete(id);
    if (!reel) {
      return res.status(404).json({
        success: false,
        message: 'Reel not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Reel deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting reel:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting reel'
    });
  }
};

const banUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot ban admin users'
      });
    }

    user.isBanned = true;
    user.bannedAt = new Date();
    user.banReason = reason || 'Violation of community guidelines';
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User banned successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        isBanned: user.isBanned
      }
    });
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({
      success: false,
      message: 'Error banning user'
    });
  }
};

const unbanUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isBanned = false;
    user.bannedAt = null;
    user.banReason = '';
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User unbanned successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        isBanned: user.isBanned
      }
    });
  } catch (error) {
    console.error('Error unbanning user:', error);
    res.status(500).json({
      success: false,
      message: 'Error unbanning user'
    });
  }
};

module.exports = {
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
};

