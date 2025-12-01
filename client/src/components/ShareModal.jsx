import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Share2 } from 'lucide-react';
import { useToast } from './Toast.jsx';

const ShareModal = ({ isOpen, onClose, postId, reelId }) => {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [shareLink, setShareLink] = useState('');

  useEffect(() => {
    if (isOpen && (postId || reelId)) {
      // Generate shareable link
      const baseUrl = window.location.origin;
      const link = postId 
        ? `${baseUrl}/post/${postId}`
        : `${baseUrl}/reels/${reelId}`;
      setShareLink(link);
      setCopied(false);
    }
  }, [isOpen, postId, reelId]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying link:', error);
      toast.error('Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this post on Campus Connect',
          text: 'Check out this post on Campus Connect',
          url: shareLink
        });
        onClose();
      } catch (error) {
        // User cancelled or error occurred
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
          toast.error('Failed to share');
        }
      }
    } else {
      // Fallback to copy if native share is not available
      handleCopyLink();
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)'
      }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{postId ? 'Share Post' : 'Share Reel'}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Share Link */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Share Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                  copied
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
                style={{ border: 'none' }}
              >
                {copied ? (
                  <>
                    <Check size={18} />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Native Share Button (if available) */}
          {navigator.share && (
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
              style={{ border: 'none' }}
            >
              <Share2 size={18} />
              <span>Share via...</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;

