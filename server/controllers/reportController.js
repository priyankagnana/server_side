const Report = require('../models/Report');
const Post = require('../models/Post');
const Reel = require('../models/Reel');
const Message = require('../models/Message');
const User = require('../models/User');

// Create report
const createReport = async (req, res) => {
  try {
    const { reportType, reportedItemId, reason, description } = req.body;

    if (!reportType || !reportedItemId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide reportType, reportedItemId, and reason'
      });
    }

    // Validate report type
    const validTypes = ['post', 'reel', 'chat', 'user'];
    if (!validTypes.includes(reportType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report type'
      });
    }

    // Check if item exists
    let itemExists = false;
    let reportTypeModel = '';

    switch (reportType) {
      case 'post':
        const post = await Post.findById(reportedItemId);
        itemExists = !!post;
        reportTypeModel = 'Post';
        break;
      case 'reel':
        const reel = await Reel.findById(reportedItemId);
        itemExists = !!reel;
        reportTypeModel = 'Reel';
        break;
      case 'chat':
        const message = await Message.findById(reportedItemId);
        itemExists = !!message;
        reportTypeModel = 'Message';
        break;
      case 'user':
        const user = await User.findById(reportedItemId);
        itemExists = !!user;
        reportTypeModel = 'User';
        break;
    }

    if (!itemExists) {
      return res.status(404).json({
        success: false,
        message: 'Reported item not found'
      });
    }

    // Check if user already reported this item
    const existingReport = await Report.findOne({
      reporter: req.user._id,
      reportType,
      reportedItem: reportedItemId
    });

    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this item'
      });
    }

    const report = await Report.create({
      reporter: req.user._id,
      reportType,
      reportedItem: reportedItemId,
      reportTypeModel,
      reason,
      description: description || ''
    });

    const populatedReport = await Report.findById(report._id)
      .populate('reporter', 'name username email');

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      report: populatedReport
    });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating report'
    });
  }
};

module.exports = {
  createReport
};

