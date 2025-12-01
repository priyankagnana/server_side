import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Bookmark, MoreVertical, Flag, UserPlus, Trash2, Pin as PinIcon } from 'lucide-react';
import { useToast } from './Toast.jsx';
import Dialog from './Dialog.jsx';
import ReportDialog from './ReportDialog.jsx';
import CommentSection from './CommentSection.jsx';
import LikesModal from './LikesModal.jsx';
import ShareModal from './ShareModal.jsx';

const PostCard = ({ post, onDelete, onRefresh }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const [liked, setLiked] = useState(post.likedByUser || false);
  const [saved, setSaved] = useState(post.savedByUser || false);
  const [likes, setLikes] = useState(post.likes || 0);
  const [firstLiker, setFirstLiker] = useState(post.firstLiker || null);
  const [otherLikesCount, setOtherLikesCount] = useState(post.otherLikesCount || 0);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comments || 0);
  const menuRef = useRef(null);
  
  // Get current user
  const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
  const isOwnPost = post.authorId === currentUser._id || post.authorId === currentUser.id;

  // Update liked state when post.likedByUser changes
  useEffect(() => {
    setLiked(post.likedByUser || false);
  }, [post.likedByUser]);

  // Update likes count when post.likes changes
  useEffect(() => {
    setLikes(post.likes || 0);
  }, [post.likes]);

  // Update saved state when post.savedByUser changes
  useEffect(() => {
    setSaved(post.savedByUser || false);
  }, [post.savedByUser]);

  // Update firstLiker and otherLikesCount when post changes
  useEffect(() => {
    setFirstLiker(post.firstLiker || null);
    setOtherLikesCount(post.otherLikesCount || 0);
  }, [post.firstLiker, post.otherLikesCount]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleLike = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/posts/${post.id}/like`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

          const data = await response.json();
          if (data.success) {
            setLiked(data.liked);
            setLikes(data.likesCount);
            setFirstLiker(data.firstLiker || null);
            setOtherLikesCount(data.otherLikesCount || 0);
            // Refresh posts if callback is provided
            if (onRefresh) {
              onRefresh();
            }
          } else {
            toast.error(data.message || 'Failed to like/unlike post');
          }
    } catch (error) {
      console.error('Error liking post:', error);
      toast.error('Failed to like/unlike post');
    }
  };

  const handleSave = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/users/posts/${post.id}/save`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setSaved(data.saved);
        toast.success(data.saved ? 'Post saved' : 'Post unsaved');
        // Refresh posts if callback is provided
        if (onRefresh) {
          onRefresh();
        }
      } else {
        toast.error(data.message || 'Failed to save/unsave post');
      }
    } catch (error) {
      console.error('Error saving post:', error);
      toast.error('Failed to save/unsave post');
    }
  };

  const handleProfileClick = () => {
    if (post.authorId) {
      navigate(`/profile/${post.authorId}`);
    }
  };

  const handleReportPost = () => {
    setShowMenu(false);
    setShowReportDialog(true);
  };

  const confirmReportPost = async (reason) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reportType: 'post',
          reportedItemId: post.id,
          reason: reason,
          description: ''
        })
      });

      if (response.ok) {
        toast.success('Post reported. Thank you for your feedback.');
        setShowReportDialog(false);
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to report post');
      }
    } catch (error) {
      console.error('Error reporting post:', error);
      toast.error('Failed to report post');
    }
  };

  const handleAddFriend = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/users/friend-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: post.authorId })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Friend request sent to ${post.author}`);
      } else {
        toast.error(data.message || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error('Failed to send friend request');
    }
    setShowMenu(false);
  };

  const handleDeletePost = () => {
    setShowMenu(false);
    setShowDeleteDialog(true);
  };

  const confirmDeletePost = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/posts/${post.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Post deleted successfully');
        if (onDelete) onDelete(post.id);
        if (onRefresh) onRefresh();
      } else {
        toast.error(data.message || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  const handlePinToProfile = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/posts/${post.id}/pin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Pin post error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        toast.success(data.pinned ? 'Post pinned to profile' : 'Post unpinned from profile');
        if (onRefresh) {
          onRefresh();
        }
      } else {
        toast.error(data.message || 'Failed to pin post');
      }
    } catch (error) {
      console.error('Error pinning post:', error);
      toast.error('Failed to pin post. Please try again.');
    }
    setShowMenu(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
      {/* Post Header */}
      <div className="flex items-start gap-3 mb-3 relative">
        {post.profilePicture ? (
          <img
            src={post.profilePicture}
            alt={post.author}
            className="w-12 h-12 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleProfileClick}
          />
        ) : (
          <div 
            className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-semibold cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleProfileClick}
          >
            {post.author[0]?.toUpperCase() || 'U'}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 
              className="font-semibold text-gray-900 cursor-pointer hover:text-purple-600 transition-colors"
              onClick={handleProfileClick}
            >
              {post.author}
            </h4>
            {post.pinnedToProfile && (
              <PinIcon size={14} className="text-purple-600" fill="currentColor" />
            )}
          </div>
          <p className="text-sm text-gray-500 mb-1">{post.field} • {post.timeAgo}</p>
          {post.tag && (
            <span className={`inline-block text-xs px-2 py-1 rounded-md ${
              post.tag === 'Achievement' ? 'bg-yellow-100 text-yellow-800' :
              post.tag === 'Campus Post' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {post.tag}
            </span>
          )}
        </div>
        
        {/* Three Dots Menu */}
        <div className="relative ml-auto" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <MoreVertical size={20} className="text-gray-600 cursor-pointer" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[180px] z-10">
              {isOwnPost ? (
                <>
                  <button
                    onClick={handleDeletePost}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-red-600 transition-colors cursor-pointer"
                  >
                    <Trash2 size={16} />
                    <span className="text-sm">Delete</span>
                  </button>
                  <button
                    onClick={handlePinToProfile}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-700 transition-colors cursor-pointer"
                  >
                    <PinIcon size={16} />
                    <span className="text-sm">{post.pinnedToProfile ? 'Unpin from profile' : 'Pin to profile'}</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleReportPost}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-700 transition-colors cursor-pointer"
                  >
                    <Flag size={16} />
                    <span className="text-sm">Report post</span>
                  </button>
                  <button
                    onClick={handleAddFriend}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-700 transition-colors cursor-pointer"
                  >
                    <UserPlus size={16} />
                    <span className="text-sm">Add {post.author} as friend</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post Content */}
      <p className="text-gray-900 mb-3 leading-relaxed">{post.content}</p>

      {/* Post Image */}
      {post.image && post.image.trim() !== '' && (
        <img
          src={post.image}
          alt="Post"
          className="w-full rounded-lg mb-3 object-cover"
          style={{ maxHeight: '500px' }}
        />
      )}

      {/* Engagement Metrics */}
      <div className="flex items-center justify-between mb-3 text-sm">
        {/* Liked By - Left Side */}
        {likes > 0 ? (
          <div 
            className="text-gray-600 cursor-pointer hover:text-purple-600 transition-colors"
            onClick={() => setShowLikesModal(true)}
          >
            {firstLiker ? (
              <>
                Liked by <span className="font-semibold">{firstLiker.username}</span>
                {otherLikesCount > 0 && (
                  <span> and {otherLikesCount} {otherLikesCount === 1 ? 'other' : 'others'}</span>
                )}
              </>
            ) : (
              <span>{likes} {likes === 1 ? 'like' : 'likes'}</span>
            )}
          </div>
        ) : (
          <div className="text-gray-400">No likes yet</div>
        )}

        {/* Counts - Right Side */}
        <div className="flex items-center gap-4 text-gray-600">
          <span>{likes} {likes === 1 ? 'like' : 'likes'}</span>
          <span>{commentCount} {commentCount === 1 ? 'comment' : 'comments'}</span>
        </div>
      </div>

      {/* Action Buttons - Transparent with light grey text */}
      <div className="flex items-center gap-4 border-t border-gray-200 pt-3">
        <button
          onClick={handleLike}
          className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer"
          style={{ backgroundColor: 'transparent', border: 'none' }}
        >
          <Heart 
            size={20} 
            className={`${liked ? 'text-pink-500' : 'text-gray-700'} cursor-pointer`} 
            fill={liked ? 'currentColor' : 'none'} 
          />
          <span className="text-gray-500 text-sm">Like</span>
        </button>
        <button 
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer"
          style={{ backgroundColor: 'transparent', border: 'none' }}
        >
          <MessageCircle size={20} className="text-gray-700 cursor-pointer" />
          <span className="text-gray-500 text-sm">Comment</span>
        </button>
        <button 
          onClick={() => setShowShareModal(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer"
          style={{ backgroundColor: 'transparent', border: 'none' }}
        >
          <Share2 size={20} className="text-gray-700 cursor-pointer" />
          <span className="text-gray-500 text-sm">Share</span>
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ml-auto cursor-pointer"
          style={{ backgroundColor: 'transparent', border: 'none' }}
        >
          <Bookmark size={20} className={`${saved ? 'text-purple-600' : 'text-gray-700'} cursor-pointer`} fill={saved ? 'currentColor' : 'none'} />
          <span className="text-gray-500 text-sm">Save</span>
        </button>
      </div>

      {/* Comment Section */}
      {showComments && (
        <CommentSection 
          postId={post.id} 
          onCommentCountChange={(count) => setCommentCount(count)}
        />
      )}

      {/* Likes Modal */}
      <LikesModal
        isOpen={showLikesModal}
        onClose={() => setShowLikesModal(false)}
        postId={post.id}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        postId={post.id}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeletePost}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Report Dialog */}
      <ReportDialog
        isOpen={showReportDialog}
        onClose={() => setShowReportDialog(false)}
        onConfirm={confirmReportPost}
        title="Report Post"
        itemType="post"
      />
    </div>
  );
};

export default PostCard;

