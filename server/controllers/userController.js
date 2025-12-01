const User = require('../models/User');

// @desc    Update user bio information
// @route   PUT /api/users/bio
// @access  Private
const updateBio = async (req, res) => {
  try {
    const { username, profilePicture, learningJourney, achievements } = req.body;
    const userId = req.user._id;

    // Validate username if provided
    if (username) {
      const existingUser = await User.findOne({ 
        username: username.trim(),
        _id: { $ne: userId }
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken. Please choose another.'
        });
      }
    }

    // Build update object
    const updateData = {};
    if (username !== undefined) updateData.username = username.trim();
    if (profilePicture !== undefined) updateData.profilePicture = profilePicture;
    if (learningJourney !== undefined) updateData.learningJourney = learningJourney.trim();
    if (achievements !== undefined) {
      // Filter out empty achievements
      updateData.achievements = Array.isArray(achievements) 
        ? achievements.filter(ach => ach && ach.trim() !== '')
        : [];
    }

    // Mark bio as completed if all required fields are provided
    if (username && learningJourney) {
      updateData.bioCompleted = true;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Bio updated successfully',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        profilePicture: user.profilePicture,
        learningJourney: user.learningJourney,
        achievements: user.achievements,
        bioCompleted: user.bioCompleted
      }
    });

  } catch (error) {
    console.error('Update bio error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        profilePicture: user.profilePicture,
        learningJourney: user.learningJourney,
        achievements: user.achievements,
        bioCompleted: user.bioCompleted,
        isVerified: user.isVerified,
        role: user.role || 'user',  // Include role in profile response
        friendsCount: user.friends ? user.friends.length : 0,
        friends: user.friends || []
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Get user profile by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user._id;
    const user = await User.findById(userId).select('-password');
    const currentUser = await User.findById(currentUserId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if requested user is admin
    const isRequestedUserAdmin = user.role === 'admin';
    // Check if current user is admin
    const isCurrentUserAdmin = currentUser.role === 'admin';

    // If requested user is admin and current user is not admin, deny access
    if (isRequestedUserAdmin && !isCurrentUserAdmin) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if current user is friends with this user
    const isFriend = user.friends && user.friends.some(
      friendId => friendId.toString() === currentUserId.toString()
    );

    // Check if current user has sent a friend request to this user
    const friendRequestSent = currentUser.sentFriendRequests && 
      currentUser.sentFriendRequests.some(
        sentId => sentId.toString() === userId.toString()
      );

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        profilePicture: user.profilePicture,
        learningJourney: user.learningJourney,
        achievements: user.achievements,
        bioCompleted: user.bioCompleted,
        friendsCount: user.friends ? user.friends.length : 0,
        isFriend: isFriend || false,
        friendRequestSent: friendRequestSent || false,
        role: user.role || 'user'  // Include role for admin users
      }
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Send friend request
// @route   POST /api/users/friend-request
// @access  Private
const sendFriendRequest = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user._id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    if (userId.toString() === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot send a friend request to yourself'
      });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if target user is admin and current user is not admin
    if (targetUser.role === 'admin') {
      const currentUser = await User.findById(currentUserId);
      if (currentUser.role !== 'admin') {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
    }

    const currentUser = await User.findById(currentUserId);

    // Check if already friends
    if (currentUser.friends.includes(userId) || targetUser.friends.includes(currentUserId)) {
      return res.status(400).json({
        success: false,
        message: 'You are already friends with this user'
      });
    }

    // Check if request already sent
    if (currentUser.sentFriendRequests.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Friend request already sent'
      });
    }

    // Check if request already received
    if (targetUser.friendRequests.includes(currentUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Friend request already received from this user'
      });
    }

    // Add to sent requests and received requests
    currentUser.sentFriendRequests.push(userId);
    targetUser.friendRequests.push(currentUserId);

    await currentUser.save();
    await targetUser.save();

    res.status(200).json({
      success: true,
      message: 'Friend request sent successfully'
    });

  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Get friend requests
// @route   GET /api/users/friend-requests
// @access  Private
const getFriendRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    const isCurrentUserAdmin = user.role === 'admin';
    
    // Populate friend requests, but exclude admin users if current user is not admin
    const populateQuery = isCurrentUserAdmin 
      ? { path: 'friendRequests', select: 'username profilePicture email role' }
      : { 
          path: 'friendRequests', 
          select: 'username profilePicture email role',
          match: { role: { $ne: 'admin' } }  // Exclude admin users
        };
    
    await user.populate(populateQuery);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const friendRequests = user.friendRequests || [];

    // Generate ETag from friend requests data
    const requestsData = friendRequests.map(req => ({
      id: req._id.toString(),
      username: req.username || '',
      email: req.email || ''
    }));
    
    const crypto = require('crypto');
    const etag = crypto
      .createHash('md5')
      .update(JSON.stringify(requestsData))
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
      friendRequests: friendRequests
    });

  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Accept friend request
// @route   PUT /api/users/friend-requests/:id/accept
// @access  Private
const acceptFriendRequest = async (req, res) => {
  try {
    const requestUserId = req.params.id;
    const currentUserId = req.user._id;

    if (requestUserId.toString() === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request'
      });
    }

    const currentUser = await User.findById(currentUserId);
    const requestUser = await User.findById(requestUserId);

    if (!currentUser || !requestUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if request exists
    if (!currentUser.friendRequests.includes(requestUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Friend request not found'
      });
    }

    // Check if already friends
    if (currentUser.friends.includes(requestUserId)) {
      return res.status(400).json({
        success: false,
        message: 'You are already friends with this user'
      });
    }

    // Remove from friendRequests and sentFriendRequests
    currentUser.friendRequests = currentUser.friendRequests.filter(
      id => id.toString() !== requestUserId.toString()
    );
    requestUser.sentFriendRequests = requestUser.sentFriendRequests.filter(
      id => id.toString() !== currentUserId.toString()
    );

    // Add to friends array for both users
    if (!currentUser.friends.includes(requestUserId)) {
      currentUser.friends.push(requestUserId);
    }
    if (!requestUser.friends.includes(currentUserId)) {
      requestUser.friends.push(currentUserId);
    }

    await currentUser.save();
    await requestUser.save();

    res.status(200).json({
      success: true,
      message: 'Friend request accepted'
    });

  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Reject friend request
// @route   PUT /api/users/friend-requests/:id/reject
// @access  Private
const rejectFriendRequest = async (req, res) => {
  try {
    const requestUserId = req.params.id;
    const currentUserId = req.user._id;

    if (requestUserId.toString() === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request'
      });
    }

    const currentUser = await User.findById(currentUserId);
    const requestUser = await User.findById(requestUserId);

    if (!currentUser || !requestUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if request exists
    if (!currentUser.friendRequests.includes(requestUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Friend request not found'
      });
    }

    // Remove from friendRequests and sentFriendRequests
    currentUser.friendRequests = currentUser.friendRequests.filter(
      id => id.toString() !== requestUserId.toString()
    );
    requestUser.sentFriendRequests = requestUser.sentFriendRequests.filter(
      id => id.toString() !== currentUserId.toString()
    );

    await currentUser.save();
    await requestUser.save();

    res.status(200).json({
      success: true,
      message: 'Friend request rejected'
    });

  } catch (error) {
    console.error('Reject friend request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Remove friend
// @route   DELETE /api/users/friends/:id
// @access  Private
const removeFriend = async (req, res) => {
  try {
    const friendId = req.params.id;
    const currentUserId = req.user._id;

    if (friendId.toString() === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request'
      });
    }

    const currentUser = await User.findById(currentUserId);
    const friendUser = await User.findById(friendId);

    if (!currentUser || !friendUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if they are friends
    if (!currentUser.friends.includes(friendId)) {
      return res.status(400).json({
        success: false,
        message: 'You are not friends with this user'
      });
    }

    // Remove from friends array for both users
    currentUser.friends = currentUser.friends.filter(
      id => id.toString() !== friendId.toString()
    );
    friendUser.friends = friendUser.friends.filter(
      id => id.toString() !== currentUserId.toString()
    );

    await currentUser.save();
    await friendUser.save();

    res.status(200).json({
      success: true,
      message: 'Friend removed successfully'
    });

  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Get user's friends
// @route   GET /api/users/:id/friends
// @access  Private
const getUserFriends = async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user._id;
    const currentUser = await User.findById(currentUserId);
    const isCurrentUserAdmin = currentUser.role === 'admin';
    
    const user = await User.findById(userId);
    
    // Check if requested user is admin and current user is not admin
    if (user.role === 'admin' && !isCurrentUserAdmin) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Populate friends, but exclude admin users if current user is not admin
    const populateQuery = isCurrentUserAdmin
      ? { path: 'friends', select: 'username profilePicture email role' }
      : {
          path: 'friends',
          select: 'username profilePicture email role',
          match: { role: { $ne: 'admin' } }  // Exclude admin users
        };
    
    await user.populate(populateQuery);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const friendsList = user.friends.map(friend => ({
      _id: friend._id,
      id: friend._id,
      username: friend.username,
      profilePicture: friend.profilePicture,
      email: friend.email
    }));

    res.status(200).json({
      success: true,
      friends: friendsList
    });

  } catch (error) {
    console.error('Get user friends error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Save/Unsave a post
// @route   PUT /api/users/posts/:id/save
// @access  Private
const savePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if post is already saved
    const isSaved = user.savedPosts.some(
      savedPostId => savedPostId.toString() === postId.toString()
    );

    if (isSaved) {
      // Unsave: remove post from savedPosts
      user.savedPosts = user.savedPosts.filter(
        savedPostId => savedPostId.toString() !== postId.toString()
      );
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Post unsaved',
        saved: false
      });
    } else {
      // Save: add post to savedPosts
      user.savedPosts.push(postId);
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Post saved',
        saved: true
      });
    }

  } catch (error) {
    console.error('Save post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// Helper function to calculate time ago (same as in postController)
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

// @desc    Save/Unsave a reel
// @route   PUT /api/users/reels/:id/save
// @access  Private
const saveReel = async (req, res) => {
  try {
    const reelId = req.params.id;
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if reel is already saved
    const isSaved = user.savedReels.some(
      savedReelId => savedReelId.toString() === reelId.toString()
    );

    if (isSaved) {
      // Unsave: remove reel from savedReels
      user.savedReels = user.savedReels.filter(
        savedReelId => savedReelId.toString() !== reelId.toString()
      );
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Reel unsaved',
        saved: false
      });
    } else {
      // Save: add reel to savedReels
      user.savedReels.push(reelId);
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Reel saved',
        saved: true
      });
    }

  } catch (error) {
    console.error('Save reel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Get user's saved posts
// @route   GET /api/users/saved-posts
// @access  Private
const getSavedPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate({
      path: 'savedPosts',
      populate: [
        {
          path: 'author',
          select: 'username profilePicture email'
        },
        {
          path: 'likes',
          select: 'username profilePicture'
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Format posts similar to getPosts
    const formattedPosts = user.savedPosts.map(post => {
      const field = post.author?.email ? post.author.email.split('@')[0] : 'Student';
      
      // Check if current user has liked this post
      const likedByUser = post.likes && post.likes.some(
        like => like._id.toString() === userId.toString()
      );
      
      // Get first user who liked (excluding current user if they liked it)
      const likesList = post.likes || [];
      const firstLiker = likesList.length > 0 
        ? (likesList.find(like => like._id.toString() !== userId.toString()) || likesList[0])
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
        likes: post.likes ? post.likes.length : 0,
        likedByUser: likedByUser || false,
        firstLiker: firstLiker ? {
          _id: firstLiker._id,
          username: firstLiker.username,
          profilePicture: firstLiker.profilePicture
        } : null,
        otherLikesCount: otherLikesCount,
        comments: post.comments ? post.comments.length : 0,
        tag: post.tag,
        createdAt: post.createdAt,
        timeAgo: getTimeAgo(post.createdAt),
        pinnedToProfile: post.pinnedToProfile || false,
        pinnedAt: post.pinnedAt || null
      };
    });

    res.status(200).json({
      success: true,
      posts: formattedPosts
    });

  } catch (error) {
    console.error('Get saved posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Get user's saved reels
// @route   GET /api/users/saved-reels
// @access  Private
const getSavedReels = async (req, res) => {
  try {
    const userId = req.user._id;
    const Reel = require('../models/Reel');
    const user = await User.findById(userId).populate({
      path: 'savedReels',
      populate: {
        path: 'author',
        select: 'username profilePicture learningJourney'
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Format reels
    const formattedReels = user.savedReels.map(reel => {
      const likedByUser = reel.likes && reel.likes.some(
        likeId => likeId.toString() === userId.toString()
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
        likedByUser: likedByUser || false,
        savedByUser: true, // All reels here are saved
        comments: reel.comments.length,
        createdAt: reel.createdAt,
        timeAgo: getTimeAgo(reel.createdAt)
      };
    });

    res.status(200).json({
      success: true,
      reels: formattedReels
    });

  } catch (error) {
    console.error('Get saved reels error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Get all users (for Find Study Partner)
// @route   GET /api/users/all
// @access  Private
const getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const currentUser = await User.findById(currentUserId);
    const isCurrentUserAdmin = currentUser.role === 'admin';

    // Build query: exclude current user
    // If current user is not admin, also exclude all admin users
    const query = { _id: { $ne: currentUserId } };
    if (!isCurrentUserAdmin) {
      query.role = { $ne: 'admin' };  // Exclude admin users for regular users
    }

    // Get all users except current user (and admins if current user is not admin)
    const users = await User.find(query)
      .select('username profilePicture email learningJourney achievements bioCompleted role')
      .limit(100);

    // Format users with friend status
    const formattedUsers = users.map(user => {
      // Check if current user is friends with this user
      const isFriend = currentUser.friends && currentUser.friends.some(
        friendId => friendId.toString() === user._id.toString()
      );

      // Check if current user has sent a friend request to this user
      const friendRequestSent = currentUser.sentFriendRequests && 
        currentUser.sentFriendRequests.some(
          sentId => sentId.toString() === user._id.toString()
        );

      // Check if current user has received a friend request from this user
      const friendRequestReceived = currentUser.friendRequests && 
        currentUser.friendRequests.some(
          receivedId => receivedId.toString() === user._id.toString()
        );

      return {
        _id: user._id,
        id: user._id,
        username: user.username || user.email?.split('@')[0] || 'User',
        profilePicture: user.profilePicture || '',
        email: user.email || '',
        learningJourney: user.learningJourney || '',
        achievements: user.achievements || [],
        bioCompleted: user.bioCompleted || false,
        isFriend: isFriend || false,
        friendRequestSent: friendRequestSent || false,
        friendRequestReceived: friendRequestReceived || false
      };
    });

    res.status(200).json({
      success: true,
      users: formattedUsers
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

module.exports = {
  updateBio,
  getProfile,
  getUserById,
  sendFriendRequest,
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getUserFriends,
  savePost,
  saveReel,
  getSavedPosts,
  getSavedReels,
  getAllUsers
};

