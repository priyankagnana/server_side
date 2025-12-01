const Story = require('../models/Story');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');
const crypto = require('crypto');

// Helper to convert base64 to buffer
const base64ToBuffer = (base64String, isImage = false) => {
  const prefix = isImage ? 'data:image' : 'data:video';
  const base64Data = base64String.replace(new RegExp(`^${prefix}\/\\w+;base64,`), '');
  return Buffer.from(base64Data, 'base64');
};

// Helper to upload media to Cloudinary
const uploadToCloudinary = async (mediaBuffer, folder = 'stories', isImage = false) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: folder,
      transformation: []
    };

    if (isImage) {
      uploadOptions.format = 'jpg';
      uploadOptions.transformation = [
        { width: 720, height: 1280, crop: 'limit', quality: 'auto' }
      ];
    } else {
      uploadOptions.resource_type = 'video';
      uploadOptions.format = 'mp4';
      uploadOptions.transformation = [
        { width: 720, height: 1280, crop: 'limit', quality: 'auto' },
        { video_codec: 'h264' }
      ];
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    const stream = Readable.from(mediaBuffer);
    stream.pipe(uploadStream);
  });
};

// @desc    Create a new story
// @route   POST /api/stories
// @access  Private
const createStory = async (req, res) => {
  try {
    const { media, mediaType, privacy = 'public', caption = '' } = req.body;
    const userId = req.user._id;

    if (!media || !mediaType) {
      return res.status(400).json({
        success: false,
        message: 'Media and mediaType are required'
      });
    }

    if (!['image', 'video'].includes(mediaType)) {
      return res.status(400).json({
        success: false,
        message: 'mediaType must be either "image" or "video"'
      });
    }

    const isImage = mediaType === 'image';

    // Convert base64 to buffer
    const mediaBuffer = base64ToBuffer(media, isImage);

    // Upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(mediaBuffer, 'stories', isImage);

    // Generate thumbnail
    const thumbnailUrl = isImage 
      ? cloudinaryResult.secure_url 
      : (cloudinaryResult.secure_url.replace('.mp4', '.jpg') || cloudinaryResult.secure_url);

    // Create story in database (expires in 24 hours)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const story = new Story({
      author: userId,
      mediaUrl: cloudinaryResult.secure_url,
      mediaType: mediaType,
      thumbnailUrl: thumbnailUrl,
      privacy: privacy === 'friends' ? 'friends' : 'public',
      caption: caption || '',
      expiresAt: expiresAt,
      cloudinaryPublicId: cloudinaryResult.public_id
    });

    await story.save();
    await story.populate('author', 'username profilePicture');

    // Emit socket event for new story
    const io = req.app.get('io');
    if (io) {
      const User = require('../models/User');
      const currentUser = await User.findById(userId);
      
      const formattedStory = {
        id: story._id,
        author: {
          id: story.author._id,
          username: story.author.username,
          profilePicture: story.author.profilePicture
        },
        mediaUrl: story.mediaUrl,
        thumbnailUrl: story.thumbnailUrl,
        mediaType: story.mediaType,
        caption: story.caption || '',
        views: 0,
        viewedByUser: false,
        expiresAt: story.expiresAt,
        createdAt: story.createdAt
      };

      // For public stories, broadcast to all
      // For friends-only stories, emit to friends only
      if (story.privacy === 'public') {
        io.emit('new_story', formattedStory);
      } else {
        const friends = currentUser.friends || [];
        friends.forEach(friendId => {
          io.to(`user_${friendId}`).emit('new_story', formattedStory);
        });
        // Also emit to the author
        io.to(`user_${userId}`).emit('new_story', formattedStory);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Story created successfully',
      story: {
        id: story._id,
        author: {
          id: story.author._id,
          username: story.author.username,
          profilePicture: story.author.profilePicture
        },
        mediaUrl: story.mediaUrl,
        thumbnailUrl: story.thumbnailUrl,
        mediaType: story.mediaType,
        caption: story.caption || '',
        views: story.views.length,
        expiresAt: story.expiresAt,
        createdAt: story.createdAt
      }
    });

  } catch (error) {
    console.error('Create story error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Get all active stories (grouped by user)
// @route   GET /api/stories
// @access  Private
const getStories = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const User = require('../models/User');
    const currentUser = await User.findById(currentUserId);

    // Get stories from friends and current user
    const friendIds = currentUser.friends || [];
    const storyAuthors = [...friendIds, currentUserId];

    // Get active stories (not expired)
    // Show: 
    // 1. All public stories (from anyone)
    // 2. Friends-only stories from friends or current user
    const stories = await Story.find({
      expiresAt: { $gt: new Date() },
      $or: [
        { privacy: 'public' },
        {
          privacy: 'friends',
          author: { $in: storyAuthors }
        }
      ]
    })
      .populate('author', 'username profilePicture')
      .sort({ createdAt: -1 });

    // Group stories by author
    const storiesByUser = {};
    stories.forEach(story => {
      const authorId = story.author._id.toString();
      if (!storiesByUser[authorId]) {
        storiesByUser[authorId] = {
          author: {
            id: story.author._id,
            username: story.author.username,
            profilePicture: story.author.profilePicture
          },
          stories: []
        };
      }

      // Check if current user has viewed this story
      const viewedByUser = story.views.some(
        view => view.user.toString() === currentUserId.toString()
      );

      storiesByUser[authorId].stories.push({
        id: story._id,
        mediaUrl: story.mediaUrl,
        thumbnailUrl: story.thumbnailUrl,
        mediaType: story.mediaType,
        caption: story.caption || '',
        views: story.views.length,
        viewedByUser: viewedByUser,
        expiresAt: story.expiresAt,
        createdAt: story.createdAt
      });
    });

    // Convert to array
    const storiesArray = Object.values(storiesByUser);

    // Generate ETag from stories data
    const storiesData = storiesArray.map(userStory => ({
      authorId: userStory.author.id.toString(),
      storyIds: userStory.stories.map(s => s.id.toString()),
      storyCount: userStory.stories.length
    }));
    
    const etag = crypto
      .createHash('md5')
      .update(JSON.stringify(storiesData))
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
      stories: storiesArray
    });

  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Add view to story
// @route   PUT /api/stories/:id/view
// @access  Private
const addView = async (req, res) => {
  try {
    const storyId = req.params.id;
    const userId = req.user._id;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    // Check if already viewed
    const alreadyViewed = story.views.some(
      view => view.user.toString() === userId.toString()
    );

    if (!alreadyViewed) {
      story.views.push({
        user: userId,
        viewedAt: new Date()
      });
      await story.save();
    }

    res.status(200).json({
      success: true,
      viewsCount: story.views.length
    });

  } catch (error) {
    console.error('Add view error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// @desc    Delete a story
// @route   DELETE /api/stories/:id
// @access  Private
const deleteStory = async (req, res) => {
  try {
    const storyId = req.params.id;
    const userId = req.user._id;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    // Check if user is the author
    if (story.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own stories'
      });
    }

    // Delete from Cloudinary
    if (story.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(story.cloudinaryPublicId, {
          resource_type: story.mediaType === 'video' ? 'video' : 'image'
        });
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
      }
    }

    // Delete from database
    await Story.findByIdAndDelete(storyId);

    // Emit socket event for story deletion
    const io = req.app.get('io');
    if (io) {
      io.emit('story_deleted', { storyId });
    }

    res.status(200).json({
      success: true,
      message: 'Story deleted successfully'
    });

  } catch (error) {
    console.error('Delete story error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

module.exports = {
  createStory,
  getStories,
  addView,
  deleteStory
};

