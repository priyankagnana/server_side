const CollaborationBoardRequest = require('../models/CollaborationBoardRequest');

// Get approved collaboration board posts
const getApprovedCollaborationBoardPosts = async (req, res) => {
  try {
    const approvedRequests = await CollaborationBoardRequest.find({ status: 'approved' })
      .populate('requester', 'name username profilePicture')
      .sort({ reviewedAt: -1 });

    res.status(200).json({
      success: true,
      posts: approvedRequests
    });
  } catch (error) {
    console.error('Error fetching collaboration board posts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching collaboration board posts'
    });
  }
};

// Create collaboration board request
const createCollaborationBoardRequest = async (req, res) => {
  try {
    const { field, category, title, description, tags } = req.body;

    if (!field || !category || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide field, category, title, and description'
      });
    }

    const request = await CollaborationBoardRequest.create({
      requester: req.user._id,
      field,
      category,
      title,
      description,
      tags: tags || []
    });

    const populatedRequest = await CollaborationBoardRequest.findById(request._id)
      .populate('requester', 'name username profilePicture');

    res.status(201).json({
      success: true,
      message: 'Collaboration board request submitted successfully',
      request: populatedRequest
    });
  } catch (error) {
    console.error('Error creating collaboration board request:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating collaboration board request'
    });
  }
};

module.exports = {
  getApprovedCollaborationBoardPosts,
  createCollaborationBoardRequest
};

