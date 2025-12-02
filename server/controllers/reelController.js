const Reel = require('../models/Reel');
const cloudinary = require('../config/cloudinary');
const crypto = require('crypto');

// @desc    Get upload signature for direct Cloudinary upload
// @route   GET /api/reels/upload-signature
// @access  Private
const getUploadSignature = async (req, res) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    // Parameters for the upload (must match exactly what's sent in FormData)
    // Note: resource_type is NOT included in signature calculation
    // eager_async must be string 'true' to match FormData
    const params = {
      eager: 'w_720,h_1280,c_limit,q_auto:good,vc_h264',
      eager_async: 'true', // Must be string, not boolean
      folder: 'reels',
      timestamp: timestamp
    };

    // Generate signature (parameters are automatically sorted alphabetically by api_sign_request)
    const signature = cloudinary.utils.api_sign_request(
      params,
      process.env.CLOUDINARY_API_SECRET
    );

    res.status(200).json({
      success: true,
      signature: signature,
      timestamp: timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder: 'reels'
    });
  } catch (error) {
    console.error('Get upload signature error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate upload signature'
    });
  }
};

// @desc    Create a new reel (video already uploaded to Cloudinary)
// @route   POST /api/reels
// @access  Private
const createReel = async (req, res) => {
  try {
    const { cloudinaryPublicId, videoUrl, thumbnailUrl, caption, duration } = req.body;
    const userId = req.user._id;

    if (!cloudinaryPublicId || !videoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Cloudinary upload data is required'
      });
    }

    // Create reel in database (video already uploaded to Cloudinary)
    const reel = new Reel({
      author: userId,
      videoUrl: videoUrl,
      thumbnailUrl: thumbnailUrl || videoUrl.replace('.mp4', '.jpg'),
      caption: caption || '',
      duration: duration || 0,
      cloudinaryPublicId: cloudinaryPublicId
    });

    await reel.save();
    await reel.populate('author', 'username profilePicture');

    // Create notifications for friends
    const User = require('../models/User');
    const currentUser = await User.findById(userId);
    const { createNotification } = require('./notificationController');
    
    if (currentUser) {
      const friends = currentUser.friends || [];
      const authorName = currentUser.username || currentUser.email?.split('@')[0] || 'Someone';
      
      // Create notifications for friends (reels are always public)
      for (const friendId of friends) {
        await createNotification(
          friendId,
          'reel_created',
          'New Reel from Friend',
          `${authorName} shared a new reel`,
          userId,
          reel._id,
          'Reel'
        );
      }
    }

    // Emit socket event for new reel
    const io = req.app.get('io');
    if (io) {
      const formattedReel = {
        id: reel._id,
        author: {
          id: reel.author._id,
          username: reel.author.username,
          profilePicture: reel.author.profilePicture
        },
        videoUrl: reel.videoUrl,
        thumbnailUrl: reel.thumbnailUrl,
        caption: reel.caption,
        duration: reel.duration,
        views: 0,
        likes: 0,
        comments: 0,
        createdAt: reel.createdAt
      };

      // Broadcast to all connected users
      io.emit('new_reel', formattedReel);
      
      // Emit notifications to friends via socket
      if (currentUser) {
        const friends = currentUser.friends || [];
        friends.forEach(friendId => {
          io.to(`user_${friendId}`).emit('new_notification', {
            type: 'reel_created',
            title: 'New Reel from Friend',
            message: `${currentUser.username || currentUser.email?.split('@')[0] || 'Someone'} shared a new reel`,
            fromUser: {
              _id: userId,
              username: currentUser.username,
              profilePicture: currentUser.profilePicture
            },
            relatedId: reel._id,
            relatedType: 'Reel'
          });
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Reel created successfully',
      reel: {
        id: reel._id,
        author: {
          id: reel.author._id,
          username: reel.author.username,
          profilePicture: reel.author.profilePicture
        },
        videoUrl: reel.videoUrl,
        thumbnailUrl: reel.thumbnailUrl,
        caption: reel.caption,
        duration: reel.duration,
        views: reel.views.length,
        likes: reel.likes.length,
        comments: reel.comments.length,
        createdAt: reel.createdAt
      }
    });

  } catch (error) {
    console.error('Create reel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Get all reels
// @route   GET /api/reels
// @access  Private
const getReels = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const User = require('../models/User');
    const currentUser = await User.findById(currentUserId);
    
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const reels = await Reel.find()
      .populate('author', 'username profilePicture learningJourney')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Generate ETag from reels data (only for first page to avoid complexity)
    let etag = null;
    if (page === 1) {
      const reelsData = reels.map(r => ({
        id: r._id.toString(),
        updatedAt: r.updatedAt ? r.updatedAt.getTime() : 0,
        likesCount: r.likes.length,
        viewsCount: r.views.length
      }));
      
      etag = crypto
        .createHash('md5')
        .update(JSON.stringify(reelsData))
        .digest('hex');

      // Check if client has same version (304 Not Modified)
      const clientETag = req.headers['if-none-match'];
      if (clientETag === etag) {
        // No changes - return 304
        return res.status(304).end();
      }
    }

    const formattedReels = reels.map(reel => {
      const likedByUser = reel.likes.some(
        likeId => likeId.toString() === currentUserId.toString()
      );
      const savedByUser = currentUser.savedReels && currentUser.savedReels.some(
        savedReelId => savedReelId.toString() === reel._id.toString()
      );

      return {
        id: reel._id,
        author: {
          id: reel.author._id,
          username: reel.author.username,
          profilePicture: reel.author.profilePicture,
          learningJourney: reel.author.learningJourney || ''
        },
        videoUrl: reel.videoUrl,
        thumbnailUrl: reel.thumbnailUrl,
        caption: reel.caption,
        duration: reel.duration,
        views: reel.views.length,
        likes: reel.likes.length,
        likedByUser: likedByUser,
        savedByUser: savedByUser || false,
        comments: reel.comments.length,
        createdAt: reel.createdAt,
        timeAgo: getTimeAgo(reel.createdAt)
      };
    });

    // Set ETag and cache headers (only for first page)
    if (page === 1 && etag) {
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'private, max-age=5'); // Cache for 5 seconds
    }

    res.status(200).json({
      success: true,
      reels: formattedReels,
      page,
      limit,
      hasMore: reels.length === limit
    });

  } catch (error) {
    console.error('Get reels error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// Helper function to calculate time ago
const getTimeAgo = (date) => {
  if (!date) return 'just now';
  const now = new Date();
  const postDate = new Date(date);
  const diffInSeconds = Math.floor((now - postDate) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return postDate.toLocaleDateString();
};

// @desc    Like/Unlike a reel
// @route   PUT /api/reels/:id/like
// @access  Private
const likeReel = async (req, res) => {
  try {
    const reelId = req.params.id;
    const userId = req.user._id;

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({
        success: false,
        message: 'Reel not found'
      });
    }

    const likedIndex = reel.likes.findIndex(
      likeId => likeId.toString() === userId.toString()
    );

    if (likedIndex > -1) {
      reel.likes.splice(likedIndex, 1);
    } else {
      reel.likes.push(userId);
    }

    await reel.save();

    // Emit socket event for reel like update
    const io = req.app.get('io');
    if (io) {
      io.emit('reel_liked', {
        reelId: reel._id,
        likesCount: reel.likes.length,
        liked: likedIndex === -1
      });
    }

    res.status(200).json({
      success: true,
      liked: likedIndex === -1,
      likesCount: reel.likes.length
    });

  } catch (error) {
    console.error('Like reel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Add view to reel
// @route   PUT /api/reels/:id/view
// @access  Private
const addView = async (req, res) => {
  try {
    const reelId = req.params.id;
    const userId = req.user._id;

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({
        success: false,
        message: 'Reel not found'
      });
    }

    // Only add view if user hasn't viewed it yet
    if (!reel.views.includes(userId)) {
      reel.views.push(userId);
      await reel.save();
    }

    res.status(200).json({
      success: true,
      viewsCount: reel.views.length
    });

  } catch (error) {
    console.error('Add view error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Delete a reel
// @route   DELETE /api/reels/:id
// @access  Private
const deleteReel = async (req, res) => {
  try {
    const reelId = req.params.id;
    const userId = req.user._id;

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({
        success: false,
        message: 'Reel not found'
      });
    }

    // Check if user is the author
    if (reel.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own reels'
      });
    }

    // Delete from Cloudinary
    if (reel.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(reel.cloudinaryPublicId, {
          resource_type: 'video'
        });
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
      }
    }

    // Delete from database
    await Reel.findByIdAndDelete(reelId);

    // Emit socket event for reel deletion
    const io = req.app.get('io');
    if (io) {
      io.emit('reel_deleted', { reelId });
    }

    res.status(200).json({
      success: true,
      message: 'Reel deleted successfully'
    });

  } catch (error) {
    console.error('Delete reel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Add comment to reel
// @route   POST /api/reels/:id/comments
// @access  Private
const addComment = async (req, res) => {
  try {
    const reelId = req.params.id;
    const userId = req.user._id;
    const { content, parentCommentId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({
        success: false,
        message: 'Reel not found'
      });
    }

    if (parentCommentId) {
      // Add reply to existing comment
      const parentComment = reel.comments.id(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({
          success: false,
          message: 'Parent comment not found'
        });
      }

      parentComment.replies.push({
        user: userId,
        content: content.trim(),
        upvotes: [],
        downvotes: [],
        deleted: false
      });
    } else {
      // Add new top-level comment
      reel.comments.push({
        user: userId,
        content: content.trim(),
        upvotes: [],
        downvotes: [],
        replies: [],
        deleted: false
      });
    }

    await reel.save();
    await reel.populate('comments.user', 'username profilePicture');
    await reel.populate('comments.replies.user', 'username profilePicture');

    let comment;
    if (parentCommentId) {
      const parentComment = reel.comments.id(parentCommentId);
      comment = parentComment.replies[parentComment.replies.length - 1];
    } else {
      comment = reel.comments[reel.comments.length - 1];
    }

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      comment: {
        _id: comment._id,
        user: {
          _id: comment.user._id,
          username: comment.user.username,
          profilePicture: comment.user.profilePicture
        },
        content: comment.content,
        upvotes: comment.upvotes ? comment.upvotes.length : 0,
        downvotes: comment.downvotes ? comment.downvotes.length : 0,
        createdAt: comment.createdAt,
        deleted: comment.deleted || false
      }
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Get comments for a reel
// @route   GET /api/reels/:id/comments
// @access  Private
const getComments = async (req, res) => {
  try {
    const reelId = req.params.id;
    const reel = await Reel.findById(reelId)
      .populate('comments.user', 'username profilePicture')
      .populate('comments.replies.user', 'username profilePicture');

    if (!reel) {
      return res.status(404).json({
        success: false,
        message: 'Reel not found'
      });
    }

    const currentUserId = req.user._id;

    // Format comments
    const formattedComments = reel.comments
      .filter(comment => !comment.deleted)
      .map(comment => {
        const hasUpvoted = comment.upvotes && comment.upvotes.some(
          id => id.toString() === currentUserId.toString()
        );
        const hasDownvoted = comment.downvotes && comment.downvotes.some(
          id => id.toString() === currentUserId.toString()
        );

        return {
          _id: comment._id,
          user: {
            _id: comment.user._id,
            id: comment.user._id,
            username: comment.user.username,
            profilePicture: comment.user.profilePicture
          },
          content: comment.content,
          upvotes: comment.upvotes ? comment.upvotes.length : 0,
          downvotes: comment.downvotes ? comment.downvotes.length : 0,
          hasUpvoted,
          hasDownvoted,
          replies: comment.replies
            .filter(reply => !reply.deleted)
            .map(reply => {
              const replyHasUpvoted = reply.upvotes && reply.upvotes.some(
                id => id.toString() === currentUserId.toString()
              );
              const replyHasDownvoted = reply.downvotes && reply.downvotes.some(
                id => id.toString() === currentUserId.toString()
              );

              return {
                _id: reply._id,
                user: {
                  _id: reply.user._id,
                  id: reply.user._id,
                  username: reply.user.username,
                  profilePicture: reply.user.profilePicture
                },
                content: reply.content,
                upvotes: reply.upvotes ? reply.upvotes.length : 0,
                downvotes: reply.downvotes ? reply.downvotes.length : 0,
                hasUpvoted: replyHasUpvoted,
                hasDownvoted: replyHasDownvoted,
                createdAt: reply.createdAt,
                deleted: reply.deleted || false
              };
            }),
          createdAt: comment.createdAt,
          deleted: comment.deleted || false
        };
      });

    res.status(200).json({
      success: true,
      comments: formattedComments
    });

  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Vote on comment
// @route   PUT /api/reels/:reelId/comments/:commentId/vote
// @access  Private
const voteComment = async (req, res) => {
  try {
    const { reelId, commentId } = req.params;
    const userId = req.user._id;
    const { voteType, isReply, parentCommentId } = req.body;

    if (!['upvote', 'downvote'].includes(voteType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vote type'
      });
    }

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({
        success: false,
        message: 'Reel not found'
      });
    }

    if (isReply && parentCommentId) {
      // Vote on reply
      const parentComment = reel.comments.id(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({
          success: false,
          message: 'Parent comment not found'
        });
      }

      const reply = parentComment.replies.id(commentId);
      if (!reply) {
        return res.status(404).json({
          success: false,
          message: 'Reply not found'
        });
      }

      // Handle upvote
      const upvoteIndex = reply.upvotes.findIndex(
        id => id.toString() === userId.toString()
      );
      if (voteType === 'upvote') {
        if (upvoteIndex > -1) {
          reply.upvotes.splice(upvoteIndex, 1);
        } else {
          // Remove from downvotes if exists
          const downvoteIndex = reply.downvotes.findIndex(
            id => id.toString() === userId.toString()
          );
          if (downvoteIndex > -1) {
            reply.downvotes.splice(downvoteIndex, 1);
          }
          reply.upvotes.push(userId);
        }
      } else {
        // Handle downvote
        const downvoteIndex = reply.downvotes.findIndex(
          id => id.toString() === userId.toString()
        );
        if (downvoteIndex > -1) {
          reply.downvotes.splice(downvoteIndex, 1);
        } else {
          // Remove from upvotes if exists
          if (upvoteIndex > -1) {
            reply.upvotes.splice(upvoteIndex, 1);
          }
          reply.downvotes.push(userId);
        }
      }
    } else {
      // Vote on top-level comment
      const comment = reel.comments.id(commentId);
      if (!comment) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found'
        });
      }

      // Handle upvote
      const upvoteIndex = comment.upvotes.findIndex(
        id => id.toString() === userId.toString()
      );
      if (voteType === 'upvote') {
        if (upvoteIndex > -1) {
          comment.upvotes.splice(upvoteIndex, 1);
        } else {
          // Remove from downvotes if exists
          const downvoteIndex = comment.downvotes.findIndex(
            id => id.toString() === userId.toString()
          );
          if (downvoteIndex > -1) {
            comment.downvotes.splice(downvoteIndex, 1);
          }
          comment.upvotes.push(userId);
        }
      } else {
        // Handle downvote
        const downvoteIndex = comment.downvotes.findIndex(
          id => id.toString() === userId.toString()
        );
        if (downvoteIndex > -1) {
          comment.downvotes.splice(downvoteIndex, 1);
        } else {
          // Remove from upvotes if exists
          if (upvoteIndex > -1) {
            comment.upvotes.splice(upvoteIndex, 1);
          }
          comment.downvotes.push(userId);
        }
      }
    }

    await reel.save();

    res.status(200).json({
      success: true,
      message: 'Vote updated successfully'
    });

  } catch (error) {
    console.error('Vote comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Delete comment
// @route   DELETE /api/reels/:reelId/comments/:commentId
// @access  Private
const deleteComment = async (req, res) => {
  try {
    const { reelId, commentId } = req.params;
    const userId = req.user._id;
    const { isReply, parentCommentId } = req.body;

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({
        success: false,
        message: 'Reel not found'
      });
    }

    if (isReply && parentCommentId) {
      // Delete reply
      const parentComment = reel.comments.id(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({
          success: false,
          message: 'Parent comment not found'
        });
      }

      const reply = parentComment.replies.id(commentId);
      if (!reply) {
        return res.status(404).json({
          success: false,
          message: 'Reply not found'
        });
      }

      // Check if user is the author
      if (reply.user.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own replies'
        });
      }

      reply.deleted = true;
    } else {
      // Delete top-level comment
      const comment = reel.comments.id(commentId);
      if (!comment) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found'
        });
      }

      // Check if user is the author
      if (comment.user.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own comments'
        });
      }

      // If comment has replies, soft delete. Otherwise, hard delete
      if (comment.replies && comment.replies.length > 0) {
        comment.deleted = true;
      } else {
        reel.comments.pull(commentId);
      }
    }

    await reel.save();

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });

  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

module.exports = {
  getUploadSignature,
  createReel,
  getReels,
  likeReel,
  addView,
  deleteReel,
  addComment,
  getComments,
  voteComment,
  deleteComment
};

