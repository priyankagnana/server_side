import React, { useState, useEffect, useRef } from 'react';
import { ThumbsUp, ThumbsDown, Reply, Trash2, Send, Smile } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useToast } from './Toast.jsx';
import Dialog from './Dialog.jsx';

const CommentSection = ({ postId, reelId, onCommentCountChange }) => {
  const toast = useToast();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReplyEmojiPicker, setShowReplyEmojiPicker] = useState(null);
  const emojiPickerRef = useRef(null);
  const replyEmojiPickerRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
  const currentUserId = currentUser._id || currentUser.id;

  const entityId = postId || reelId;
  const entityType = postId ? 'posts' : 'reels';

  useEffect(() => {
    if (entityId) {
      fetchComments();
    }
  }, [entityId]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
      if (replyEmojiPickerRef.current && !replyEmojiPickerRef.current.contains(event.target)) {
        setShowReplyEmojiPicker(null);
      }
    };

    if (showEmojiPicker || showReplyEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker, showReplyEmojiPicker]);

  const handleEmojiClick = (emojiData) => {
    setNewComment(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleReplyEmojiClick = (emojiData, commentId) => {
    setReplyContent(prev => prev + emojiData.emoji);
    setShowReplyEmojiPicker(null);
  };

  const fetchComments = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/${entityType}/${entityId}/comments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setComments(data.comments || []);
          if (onCommentCountChange) {
            onCommentCountChange(data.comments.length);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.warning('Please enter a comment');
      return;
    }

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/${entityType}/${entityId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newComment.trim() })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Comment added');
        setNewComment('');
        fetchComments();
      } else {
        toast.error(data.message || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const handleAddReply = async (parentCommentId) => {
    if (!replyContent.trim()) {
      toast.warning('Please enter a reply');
      return;
    }

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/${entityType}/${entityId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: replyContent.trim(),
          parentCommentId: parentCommentId
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Reply added');
        setReplyContent('');
        setReplyingTo(null);
        fetchComments();
      } else {
        toast.error(data.message || 'Failed to add reply');
      }
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Failed to add reply');
    }
  };

  const handleVote = async (commentId, voteType, isReply = false, parentCommentId = null) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/${entityType}/${entityId}/comments/${commentId}/vote`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          voteType,
          isReply,
          parentCommentId
        })
      });

      const data = await response.json();
      if (data.success) {
        fetchComments();
      } else {
        toast.error(data.message || 'Failed to vote');
      }
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to vote');
    }
  };

  const handleDeleteComment = async (commentId, isReply = false, parentCommentId = null) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/${entityType}/${entityId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          isReply,
          parentCommentId
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Comment deleted');
        fetchComments();
      } else {
        toast.error(data.message || 'Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const CommentItem = ({ comment, isReply = false, parentId = null }) => {
    const commentUserId = comment.user._id || comment.user.id;
    const isOwnComment = commentUserId && (commentUserId.toString() === currentUserId?.toString() || commentUserId.toString() === currentUser.id?.toString());
    const deleted = comment.deleted;

    return (
      <div className={`${isReply ? 'ml-8 mt-3' : 'mb-4'}`}>
        <div className="flex gap-3">
          {/* Profile Picture */}
          {comment.user.profilePicture ? (
            <img
              src={comment.user.profilePicture}
              alt={comment.user.username}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {comment.user.username?.[0]?.toUpperCase() || 'U'}
            </div>
          )}

          {/* Comment Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm text-gray-900">
                  {comment.user.username}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(comment.createdAt)}
                </span>
              </div>
              {deleted ? (
                <p className="text-sm text-gray-400 italic">Comment deleted by the user</p>
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              )}
            </div>

            {/* Actions */}
            {!deleted && (
              <div className="flex items-center gap-4 mt-2 ml-2">
                {/* Vote Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleVote(comment._id, 'upvote', isReply, parentId)}
                    className={`p-1 rounded hover:bg-gray-200 transition-colors cursor-pointer ${
                      comment.userUpvoted ? 'text-orange-500' : 'text-gray-500'
                    }`}
                  >
                    <ThumbsUp size={16} fill={comment.userUpvoted ? 'currentColor' : 'none'} />
                  </button>
                  <span className="text-xs text-gray-600 min-w-[20px] text-center">
                    {comment.upvotes - comment.downvotes}
                  </span>
                  <button
                    onClick={() => handleVote(comment._id, 'downvote', isReply, parentId)}
                    className={`p-1 rounded hover:bg-gray-200 transition-colors cursor-pointer ${
                      comment.userDownvoted ? 'text-blue-500' : 'text-gray-500'
                    }`}
                  >
                    <ThumbsDown size={16} fill={comment.userDownvoted ? 'currentColor' : 'none'} />
                  </button>
                </div>

                {/* Reply Button */}
                {!isReply && (
                  <button
                    onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                  >
                    <Reply size={14} />
                    <span>Reply</span>
                  </button>
                )}

                {/* Delete Button */}
                {isOwnComment && (
                  <button
                    onClick={() => setShowDeleteDialog({ commentId: comment._id, isReply, parentId })}
                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            )}

            {/* Reply Input */}
            {replyingTo === comment._id && !isReply && (
              <div className="mt-3 ml-2">
                <div className="flex gap-2 relative">
                  <input
                    type="text"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddReply(comment._id)}
                    placeholder="Write a reply..."
                    className="flex-1 px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowReplyEmojiPicker(showReplyEmojiPicker === comment._id ? null : comment._id)}
                    className="absolute right-12 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-500 hover:text-purple-600 hover:bg-gray-100 rounded transition-colors"
                  >
                    <Smile size={16} />
                  </button>
                  <button
                    onClick={() => handleAddReply(comment._id)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </div>
                
                {/* Emoji Picker for Reply */}
                {showReplyEmojiPicker === comment._id && (
                  <div 
                    className="fixed inset-0 flex items-center justify-center z-50"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
                    onClick={() => setShowReplyEmojiPicker(null)}
                  >
                    <div 
                      ref={replyEmojiPickerRef}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <EmojiPicker
                        onEmojiClick={(emojiData) => handleReplyEmojiClick(emojiData, comment._id)}
                        width={400}
                        height={450}
                        previewConfig={{ showPreview: false }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Replies */}
            {!isReply && comment.replies && comment.replies.length > 0 && (
              <div className="mt-3">
                {comment.replies.map((reply) => (
                  <CommentItem
                    key={reply._id}
                    comment={reply}
                    isReply={true}
                    parentId={comment._id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="border-t border-gray-200 pt-4 mt-4">
        <div className="text-center text-gray-500 text-sm py-4">Loading comments...</div>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 pt-4 mt-4">
      {/* Add Comment Input */}
      <div className="mb-4">
        <div className="flex gap-3">
          {currentUser.profilePicture ? (
            <img
              src={currentUser.profilePicture}
              alt="You"
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {currentUser.username?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <div className="flex-1 relative">
            <div className="relative">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                placeholder="Write a comment..."
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
              />
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-500 hover:text-purple-600 hover:bg-gray-100 rounded transition-colors"
              >
                <Smile size={18} />
              </button>
            </div>
            <div className="flex justify-end mt-2">
              <button
                onClick={handleAddComment}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
              >
                <Send size={14} />
                <span>Comment</span>
              </button>
            </div>
            
            {/* Emoji Picker for Main Comment */}
            {showEmojiPicker && (
              <div 
                className="fixed inset-0 flex items-center justify-center z-50"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
                onClick={() => setShowEmojiPicker(false)}
              >
                <div 
                  ref={emojiPickerRef}
                  onClick={(e) => e.stopPropagation()}
                >
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    width={400}
                    height={450}
                    previewConfig={{ showPreview: false }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comments List */}
      {comments.length > 0 ? (
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {comments.map((comment) => (
            <CommentItem key={comment._id} comment={comment} />
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 text-sm py-4">
          No comments yet. Be the first to comment!
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <Dialog
          isOpen={!!showDeleteDialog}
          onClose={() => setShowDeleteDialog(null)}
          onConfirm={() => {
            handleDeleteComment(showDeleteDialog.commentId, showDeleteDialog.isReply, showDeleteDialog.parentId);
            setShowDeleteDialog(null);
          }}
          title="Delete Comment"
          message="Are you sure you want to delete this comment? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
      )}
    </div>
  );
};

export default CommentSection;

