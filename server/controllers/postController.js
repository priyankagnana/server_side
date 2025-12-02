const Post = require('../models/Post');
const crypto = require('crypto');

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
const createPost = async (req, res) => {
  try {
    const { content, image, privacy } = req.body;
    const userId = req.user._id;

    if (!content && !image) {
      return res.status(400).json({
        success: false,
        message: 'Post must have either content or an image'
      });
    }

    const post = new Post({
      author: userId,
      content: content || '',
      image: image || '',
      privacy: privacy || 'public'
    });

    await post.save();
    await post.populate('author', 'username profilePicture email');

    // Create notifications for friends
    const User = require('../models/User');
    const currentUser = await User.findById(userId);
    const { createNotification } = require('./notificationController');
    
    if (currentUser && (privacy === 'public' || privacy === 'friends')) {
      const friends = currentUser.friends || [];
      const authorName = currentUser.username || currentUser.email?.split('@')[0] || 'Someone';
      
      // Create notifications for friends (only for friends privacy or public)
      for (const friendId of friends) {
        await createNotification(
          friendId,
          'post_created',
          'New Post from Friend',
          `${authorName} shared a new post`,
          userId,
          post._id,
          'Post'
        );
      }
    }

    // Emit socket event for new post
    const io = req.app.get('io');
    if (io) {
      const field = post.author.email ? post.author.email.split('@')[0] : 'Student';
      
      const formattedPost = {
        id: post._id,
        author: {
          id: post.author._id,
          _id: post.author._id,
          username: post.author.username || 'User',
          profilePicture: post.author.profilePicture || '',
          email: post.author.email || ''
        },
        authorId: post.author._id,
        field: field,
        content: post.content,
        image: post.image,
        privacy: post.privacy,
        likes: 0,
        likedByUser: false,
        savedByUser: false,
        firstLiker: null,
        otherLikesCount: 0,
        comments: 0,
        tag: post.tag,
        createdAt: post.createdAt,
        timeAgo: 'just now',
        pinnedToProfile: false,
        pinnedAt: null
      };

      // Broadcast to all connected users (for public posts)
      if (post.privacy === 'public') {
        io.emit('new_post', formattedPost);
        
        // Emit notifications to friends via socket
        const friends = currentUser.friends || [];
        friends.forEach(friendId => {
          io.to(`user_${friendId}`).emit('new_notification', {
            type: 'post_created',
            title: 'New Post from Friend',
            message: `${currentUser.username || currentUser.email?.split('@')[0] || 'Someone'} shared a new post`,
            fromUser: {
              _id: userId,
              username: currentUser.username,
              profilePicture: currentUser.profilePicture
            },
            relatedId: post._id,
            relatedType: 'Post'
          });
        });
      } else {
        // For friends-only posts, emit to friends only
        const friends = currentUser.friends || [];
        friends.forEach(friendId => {
          io.to(`user_${friendId}`).emit('new_post', formattedPost);
          // Emit notification
          io.to(`user_${friendId}`).emit('new_notification', {
            type: 'post_created',
            title: 'New Post from Friend',
            message: `${currentUser.username || currentUser.email?.split('@')[0] || 'Someone'} shared a new post`,
            fromUser: {
              _id: userId,
              username: currentUser.username,
              profilePicture: currentUser.profilePicture
            },
            relatedId: post._id,
            relatedType: 'Post'
          });
        });
        // Also emit to the author
        io.to(`user_${userId}`).emit('new_post', formattedPost);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post: {
        id: post._id,
        author: {
          id: post.author._id,
          username: post.author.username,
          profilePicture: post.author.profilePicture,
          email: post.author.email
        },
        content: post.content,
        image: post.image,
        privacy: post.privacy,
        likes: post.likes,
        comments: post.comments,
        tag: post.tag,
        createdAt: post.createdAt
      }
    });

  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Get all posts
// @route   GET /api/posts
// @access  Private
const getPosts = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const User = require('../models/User');
    const currentUser = await User.findById(currentUserId);
    
    const posts = await Post.find({ privacy: 'public' })
      .populate('author', 'username profilePicture email')
      .populate('likes', 'username profilePicture')
      .populate('comments.user', 'username profilePicture')
      .sort({ createdAt: -1 })
      .limit(50);

    // Generate ETag from posts data (using IDs and updatedAt timestamps)
    const postsData = posts.map(p => ({
      id: p._id.toString(),
      updatedAt: p.updatedAt ? p.updatedAt.getTime() : 0,
      likesCount: p.likes.length,
      commentsCount: p.comments.length
    }));
    
    const etag = crypto
      .createHash('md5')
      .update(JSON.stringify(postsData))
      .digest('hex');

    // Check if client has same version (304 Not Modified)
    const clientETag = req.headers['if-none-match'];
    if (clientETag === etag) {
      // No changes - return 304
      return res.status(304).end();
    }

    // Set ETag and cache headers
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'private, max-age=5'); // Cache for 5 seconds

    res.status(200).json({
      success: true,
      posts: posts.map(post => {
        // Extract field from email
        const field = post.author.email ? post.author.email.split('@')[0] : 'Student';
        
        // Check if current user has liked this post
        const likedByUser = post.likes.some(like => like._id.toString() === currentUserId.toString());
        
        // Check if current user has saved this post
        const savedByUser = currentUser.savedPosts && currentUser.savedPosts.some(
          savedPostId => savedPostId.toString() === post._id.toString()
        );
        
        // Get first user who liked (excluding current user if they liked it)
        const likesList = post.likes || [];
        const firstLiker = likesList.length > 0 
          ? likesList.find(like => like._id.toString() !== currentUserId.toString()) || likesList[0]
          : null;
        const otherLikesCount = likesList.length - (firstLiker ? 1 : 0);
        
        return {
          id: post._id,
          author: {
            id: post.author._id,
            _id: post.author._id,
            username: post.author.username || 'User',
            profilePicture: post.author.profilePicture || '',
            email: post.author.email || ''
          },
          authorId: post.author._id,
          field: field,
          content: post.content,
          image: post.image,
          privacy: post.privacy,
          likes: post.likes.length,
          likedByUser: likedByUser,
          savedByUser: savedByUser || false,
          firstLiker: firstLiker ? {
            _id: firstLiker._id,
            username: firstLiker.username,
            profilePicture: firstLiker.profilePicture
          } : null,
          otherLikesCount: otherLikesCount,
          comments: post.comments.length,
          tag: post.tag,
          createdAt: post.createdAt,
          timeAgo: getTimeAgo(post.createdAt),
          pinnedToProfile: post.pinnedToProfile || false,
          pinnedAt: post.pinnedAt || null
        };
      })
    });

  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// Helper function to calculate time ago
const getTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - date) / 1000);
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval}${unit.charAt(0)} ago`;
    }
  }
  return 'just now';
};

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Private
const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user is the author
    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own posts'
      });
    }

    await Post.findByIdAndDelete(postId);

    // Emit socket event for post deletion
    const io = req.app.get('io');
    if (io) {
      io.emit('post_deleted', { postId });
    }

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });

  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Like/Unlike a post
// @route   PUT /api/posts/:id/like
// @access  Private
const likePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user already liked the post
    const likedIndex = post.likes.findIndex(like => like.toString() === userId.toString());

    if (likedIndex > -1) {
      // Unlike: remove user from likes array
      post.likes.splice(likedIndex, 1);
    } else {
      // Like: add user to likes array
      post.likes.push(userId);
    }

    await post.save();
    await post.populate('likes', 'username profilePicture');

    // Get first user who liked (excluding current user if they liked it)
    const likesList = post.likes || [];
    const firstLiker = likesList.length > 0 
      ? likesList.find(like => like._id.toString() !== userId.toString()) || likesList[0]
      : null;
    const otherLikesCount = likesList.length - (firstLiker ? 1 : 0);

    // Emit socket event for post like update
    const io = req.app.get('io');
    if (io) {
      io.emit('post_liked', {
        postId: post._id,
        likesCount: post.likes.length,
        liked: likedIndex === -1,
        firstLiker: firstLiker ? {
          _id: firstLiker._id,
          username: firstLiker.username,
          profilePicture: firstLiker.profilePicture
        } : null,
        otherLikesCount: otherLikesCount
      });
    }

    res.status(200).json({
      success: true,
      message: likedIndex > -1 ? 'Post unliked' : 'Post liked',
      liked: likedIndex === -1,
      likesCount: post.likes.length,
      firstLiker: firstLiker ? {
        _id: firstLiker._id,
        username: firstLiker.username,
        profilePicture: firstLiker.profilePicture
      } : null,
      otherLikesCount: otherLikesCount
    });

  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Pin/Unpin a post to profile
// @route   PUT /api/posts/:id/pin
// @access  Private
const pinPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user is the author
    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only pin your own posts'
      });
    }

    // Toggle pin status
    post.pinnedToProfile = !post.pinnedToProfile;
    if (post.pinnedToProfile) {
      post.pinnedAt = new Date();
    } else {
      post.pinnedAt = null;
    }
    await post.save();

    res.status(200).json({
      success: true,
      message: post.pinnedToProfile ? 'Post pinned to profile' : 'Post unpinned from profile',
      pinned: post.pinnedToProfile
    });

  } catch (error) {
    console.error('Pin post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Add comment to post
// @route   POST /api/posts/:id/comments
// @access  Private
const addComment = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;
    const { content, parentCommentId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (parentCommentId) {
      // Add reply to existing comment
      const parentComment = post.comments.id(parentCommentId);
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
      post.comments.push({
        user: userId,
        content: content.trim(),
        upvotes: [],
        downvotes: [],
        replies: [],
        deleted: false
      });
    }

    await post.save();
    await post.populate('comments.user', 'username profilePicture');
    await post.populate('comments.replies.user', 'username profilePicture');

    let comment;
    if (parentCommentId) {
      const parentComment = post.comments.id(parentCommentId);
      comment = parentComment.replies[parentComment.replies.length - 1];
    } else {
      comment = post.comments[post.comments.length - 1];
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

// @desc    Vote on comment
// @route   PUT /api/posts/:postId/comments/:commentId/vote
// @access  Private
const voteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user._id;
    const { voteType, isReply, parentCommentId } = req.body; // voteType: 'upvote' or 'downvote'

    if (!['upvote', 'downvote'].includes(voteType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vote type'
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    let comment;
    if (isReply && parentCommentId) {
      const parentComment = post.comments.id(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({
          success: false,
          message: 'Parent comment not found'
        });
      }
      comment = parentComment.replies.id(commentId);
    } else {
      comment = post.comments.id(commentId);
    }

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Remove from opposite vote array
    const oppositeVoteType = voteType === 'upvote' ? 'downvotes' : 'upvotes';
    comment[oppositeVoteType] = comment[oppositeVoteType].filter(
      id => id.toString() !== userId.toString()
    );

    // Toggle vote in current array
    const currentVoteArray = voteType === 'upvote' ? comment.upvotes : comment.downvotes;
    const voteIndex = currentVoteArray.findIndex(id => id.toString() === userId.toString());

    if (voteIndex > -1) {
      // Remove vote (toggle off)
      currentVoteArray.splice(voteIndex, 1);
    } else {
      // Add vote
      currentVoteArray.push(userId);
    }

    await post.save();

    res.status(200).json({
      success: true,
      message: 'Vote updated',
      upvotes: comment.upvotes.length,
      downvotes: comment.downvotes.length,
      userVote: voteIndex > -1 ? null : voteType
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
// @route   DELETE /api/posts/:postId/comments/:commentId
// @access  Private
const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user._id;
    const { isReply, parentCommentId } = req.body;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    let comment;
    if (isReply && parentCommentId) {
      const parentComment = post.comments.id(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({
          success: false,
          message: 'Parent comment not found'
        });
      }
      comment = parentComment.replies.id(commentId);
    } else {
      comment = post.comments.id(commentId);
    }

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

    // If comment has replies, mark as deleted instead of removing
    if (isReply && parentCommentId) {
      const parentComment = post.comments.id(parentCommentId);
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
      // Replies don't have nested replies, so we can always delete them
      parentComment.replies.pull(commentId);
    } else {
      // Top-level comment: if it has replies, mark as deleted; otherwise remove
      if (comment.replies && comment.replies.length > 0) {
        comment.deleted = true;
        comment.content = '';
      } else {
        post.comments.pull(commentId);
      }
    }

    await post.save();

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

// @desc    Get comments for a post
// @route   GET /api/posts/:id/comments
// @access  Private
const getComments = async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId)
      .populate('comments.user', 'username profilePicture')
      .populate('comments.replies.user', 'username profilePicture')
      .populate('comments.upvotes', '_id')
      .populate('comments.downvotes', '_id')
      .populate('comments.replies.upvotes', '_id')
      .populate('comments.replies.downvotes', '_id');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const currentUserId = req.user._id;

    const formattedComments = post.comments.map(comment => ({
      _id: comment._id,
      user: {
        _id: comment.user._id,
        username: comment.user.username,
        profilePicture: comment.user.profilePicture
      },
      content: comment.deleted ? '' : comment.content,
      deleted: comment.deleted || false,
      upvotes: comment.upvotes ? comment.upvotes.length : 0,
      downvotes: comment.downvotes ? comment.downvotes.length : 0,
      userUpvoted: comment.upvotes ? comment.upvotes.some(id => {
        const idValue = id._id ? id._id.toString() : id.toString();
        return idValue === currentUserId.toString();
      }) : false,
      userDownvoted: comment.downvotes ? comment.downvotes.some(id => {
        const idValue = id._id ? id._id.toString() : id.toString();
        return idValue === currentUserId.toString();
      }) : false,
      replies: (comment.replies || []).map(reply => ({
        _id: reply._id,
        user: {
          _id: reply.user._id,
          username: reply.user.username,
          profilePicture: reply.user.profilePicture
        },
        content: reply.deleted ? '' : reply.content,
        deleted: reply.deleted || false,
        upvotes: reply.upvotes ? reply.upvotes.length : 0,
        downvotes: reply.downvotes ? reply.downvotes.length : 0,
        userUpvoted: reply.upvotes ? reply.upvotes.some(id => {
          const idValue = id._id ? id._id.toString() : id.toString();
          return idValue === currentUserId.toString();
        }) : false,
        userDownvoted: reply.downvotes ? reply.downvotes.some(id => {
          const idValue = id._id ? id._id.toString() : id.toString();
          return idValue === currentUserId.toString();
        }) : false,
        createdAt: reply.createdAt
      })),
      createdAt: comment.createdAt
    }));

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

// @desc    Get users who liked a post
// @route   GET /api/posts/:id/likes
// @access  Private
const getPostLikes = async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId)
      .populate('likes', 'username profilePicture email');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const usersWhoLiked = post.likes.map(like => ({
      _id: like._id,
      username: like.username,
      profilePicture: like.profilePicture,
      email: like.email
    }));

    res.status(200).json({
      success: true,
      users: usersWhoLiked
    });

  } catch (error) {
    console.error('Get post likes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

module.exports = {
  createPost,
  getPosts,
  deletePost,
  likePost,
  pinPost,
  addComment,
  voteComment,
  deleteComment,
  getComments,
  getPostLikes
};

