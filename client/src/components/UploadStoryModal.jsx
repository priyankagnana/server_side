import React, { useState, useRef, useEffect } from 'react';
import { X, Image, Video, Upload, Globe, ChevronDown } from 'lucide-react';
import { useToast } from './Toast.jsx';

// Image compression utility
const compressImage = (file, maxWidth = 720, maxHeight = 1280, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

const UploadStoryModal = ({ isOpen, onClose, onSubmit }) => {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState('image'); // 'image' or 'video'
  const [privacy, setPrivacy] = useState('public'); // 'public' or 'friends'
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const privacyMenuRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      toast.error('Please select an image or video file');
      return;
    }

    // Validate file size
    const maxSize = isImage ? 10 * 1024 * 1024 : 30 * 1024 * 1024; // 10MB for images, 30MB for videos
    if (file.size > maxSize) {
      toast.error(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
      return;
    }

    // Validate video duration (max 15 seconds for stories)
    if (isVideo) {
      try {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(video.src);
          if (video.duration > 15) {
            toast.error('Story video must be 15 seconds or less');
            return;
          }
          processMedia(file, isImage);
        };
        video.onerror = () => {
          toast.error('Failed to load video');
        };
        video.src = URL.createObjectURL(file);
      } catch (error) {
        console.error('Error processing video:', error);
        toast.error('Failed to process video');
      }
    } else {
      processMedia(file, isImage);
    }
  };

  const processMedia = async (file, isImage) => {
    try {
      if (isImage) {
        // Compress image
        const compressedImage = await compressImage(file, 720, 1280, 0.7);
        setMediaPreview(compressedImage);
        setSelectedMedia(compressedImage);
        setMediaType('image');
      } else {
        // For video, convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          setMediaPreview(URL.createObjectURL(file));
          setSelectedMedia(reader.result);
          setMediaType('video');
        };
        reader.onerror = () => {
          toast.error('Failed to process video');
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('Error processing media:', error);
      toast.error('Failed to process media');
    }
  };

  const handleRemoveMedia = () => {
    if (mediaPreview && mediaType === 'video') {
      URL.revokeObjectURL(mediaPreview);
    }
    setSelectedMedia(null);
    setMediaPreview(null);
    setMediaType('image');
    setPrivacy('public');
    setCaption('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Close privacy menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (privacyMenuRef.current && !privacyMenuRef.current.contains(event.target)) {
        setShowPrivacyMenu(false);
      }
    };

    if (showPrivacyMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPrivacyMenu]);

  const handleSubmit = async () => {
    if (!selectedMedia) {
      toast.error('Please select an image or video');
      return;
    }

    setUploading(true);
    try {
      await onSubmit({
        media: selectedMedia,
        mediaType: mediaType,
        privacy: privacy,
        caption: caption.trim()
      });

      // Reset form
      handleRemoveMedia();
      onClose();
      toast.success('Story uploaded successfully!');
    } catch (error) {
      console.error('Error uploading story:', error);
      toast.error(error.message || 'Failed to upload story');
    } finally {
      setUploading(false);
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
        className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-gray-900">Create Story</h3>
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
          {/* Media Upload Area */}
          {!selectedMedia ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-purple-500 transition-colors"
            >
              <div className="flex items-center justify-center gap-4 mb-4">
                <Image className="text-gray-400" size={32} />
                <span className="text-gray-400">or</span>
                <Video className="text-gray-400" size={32} />
              </div>
              <p className="text-gray-600 mb-2">Click to upload image or video</p>
              <p className="text-sm text-gray-500">Image: Max 10MB | Video: Max 15s, 30MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="mb-4">
              <div className="relative rounded-lg overflow-hidden bg-black">
                {mediaType === 'image' ? (
                  <img
                    src={mediaPreview}
                    alt="Story preview"
                    className="w-full max-h-[500px] object-contain"
                  />
                ) : (
                  <video
                    src={mediaPreview}
                    controls
                    className="w-full max-h-[500px]"
                  />
                )}
                <button
                  onClick={handleRemoveMedia}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Story will expire in 24 hours
              </p>
            </div>
          )}

          {/* Caption Input */}
          {selectedMedia && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Caption (optional)
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 min-h-[80px] resize-none"
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">{caption.length}/200</p>
            </div>
          )}

          {/* Privacy Settings */}
          {selectedMedia && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="relative" ref={privacyMenuRef}>
                <button
                  onClick={() => setShowPrivacyMenu(!showPrivacyMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors w-full"
                  style={{ border: 'none' }}
                >
                  <Globe size={16} className="text-gray-600" />
                  <span className="text-sm text-gray-700 flex-1 text-left">
                    {privacy === 'public' ? 'Share to everyone' : 'Share to friends only'}
                  </span>
                  <ChevronDown size={16} className="text-gray-600" />
                </button>
                {showPrivacyMenu && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <button
                      onClick={() => {
                        setPrivacy('public');
                        setShowPrivacyMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-900 transition-colors"
                      style={{ color: '#111827', border: 'none' }}
                    >
                      <Globe size={16} className="text-gray-600" />
                      <span className="text-sm text-gray-900">Share to everyone</span>
                    </button>
                    <button
                      onClick={() => {
                        setPrivacy('friends');
                        setShowPrivacyMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-900 transition-colors"
                      style={{ color: '#111827', border: 'none' }}
                    >
                      <span className="text-sm text-gray-900">Share to friends only</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors font-medium"
              style={{ border: 'none' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedMedia || uploading}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              style={{ border: 'none' }}
            >
              {uploading ? 'Uploading...' : 'Share Story'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadStoryModal;

