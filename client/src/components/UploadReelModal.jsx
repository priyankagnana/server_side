import React, { useState, useRef, useEffect } from 'react';
import { X, Video, Upload } from 'lucide-react';
import { useToast } from './Toast.jsx';
import { cropVideoToDuration, getVideoDuration } from '../utils/videoCompression.js';

const UploadReelModal = ({ isOpen, onClose, onSubmit }) => {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const xhrRef = useRef(null); // Store XHR for cancellation
  const progressIntervalRef = useRef(null); // Store progress interval
  const compressionAbortRef = useRef(false); // Flag to abort compression
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }
    };
  }, [videoPreview]);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video size must be less than 50MB');
      return;
    }

    try {
      // Get video duration
      const videoDuration = await getVideoDuration(file);
      // Allow videos longer than 60 seconds - they will be cropped
      setDuration(Math.min(videoDuration, 60));

      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setVideoPreview(previewUrl);
      setSelectedVideo(file);
    } catch (error) {
      console.error('Error processing video:', error);
      toast.error('Failed to process video');
    }
  };

  const handleRemoveVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setSelectedVideo(null);
    setVideoPreview(null);
    setDuration(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancel = () => {
    // Abort upload if in progress
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    
    // Clear progress interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    // Set abort flag for compression
    compressionAbortRef.current = true;
    
    // Reset states
    setUploading(false);
    setUploadProgress(0);
    setCompressionProgress(0);
    compressionAbortRef.current = false;
    
    // Close modal
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedVideo) {
      toast.error('Please select a video');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setCompressionProgress(0);
    compressionAbortRef.current = false;
    
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      // Step 1: Get upload signature from server
      setCompressionProgress(10);
      const signatureResponse = await fetch(`${API_BASE}/api/reels/upload-signature`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!signatureResponse.ok) {
        throw new Error('Failed to get upload signature');
      }
      
      const signatureData = await signatureResponse.json();
      if (!signatureData.success) {
        throw new Error('Failed to get upload signature');
      }
      
      setCompressionProgress(20);
      
      // Step 2: Crop video if needed (only if > 60 seconds)
      let videoToUpload = selectedVideo;
      if (duration > 60) {
        setCompressionProgress(30);
        const croppedBlob = await cropVideoToDuration(selectedVideo, 60);
        videoToUpload = croppedBlob;
        setCompressionProgress(50);
      } else {
        setCompressionProgress(50);
      }
      
      // Check if cancelled
      if (compressionAbortRef.current) {
        return;
      }
      
      setCompressionProgress(100);
      setUploadProgress(10);
      
      // Step 3: Upload directly to Cloudinary
      const formData = new FormData();
      formData.append('file', videoToUpload);
      formData.append('timestamp', signatureData.timestamp);
      formData.append('signature', signatureData.signature);
      formData.append('api_key', signatureData.apiKey);
      formData.append('folder', signatureData.folder);
      formData.append('resource_type', 'video');
      formData.append('eager', 'w_720,h_1280,c_limit,q_auto:good,vc_h264');
      formData.append('eager_async', 'true');
      
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        
        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && !compressionAbortRef.current) {
            // Progress from 10% to 90% (10% for setup, 80% for upload)
            const uploadPercent = (e.loaded / e.total) * 80;
            setUploadProgress(10 + uploadPercent);
          }
        });
        
        xhr.addEventListener('load', async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const cloudinaryResult = JSON.parse(xhr.responseText);
              
              if (compressionAbortRef.current) {
                return;
              }
              
              setUploadProgress(95);
              
              // Step 4: Send metadata to our server
              const createResponse = await fetch(`${API_BASE}/api/reels`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  cloudinaryPublicId: cloudinaryResult.public_id,
                  videoUrl: cloudinaryResult.secure_url,
                  thumbnailUrl: cloudinaryResult.secure_url.replace('.mp4', '.jpg'),
                  caption: caption.trim(),
                  duration: duration
                })
              });
              
              if (createResponse.ok) {
                const data = await createResponse.json();
                if (data.success) {
                  setUploadProgress(100);
                  
                  if (onSubmit) {
                    await onSubmit({
                      cloudinaryPublicId: cloudinaryResult.public_id,
                      videoUrl: cloudinaryResult.secure_url,
                      thumbnailUrl: cloudinaryResult.secure_url.replace('.mp4', '.jpg'),
                      caption: caption.trim(),
                      duration: duration
                    });
                  }
                  
                  // Reset form
                  handleRemoveVideo();
                  setCaption('');
                  setUploadProgress(0);
                  setCompressionProgress(0);
                  onClose();
                  toast.success('Reel uploaded successfully!');
                  resolve();
                } else {
                  reject(new Error(data.message || 'Failed to create reel'));
                }
              } else {
                const errorData = await createResponse.json().catch(() => ({}));
                reject(new Error(errorData.message || 'Failed to create reel'));
              }
            } catch (error) {
              reject(new Error('Failed to process upload result'));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.message || `Upload failed: ${xhr.statusText}`));
            } catch {
              reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });
        
        xhr.addEventListener('abort', () => {
          xhrRef.current = null;
          if (!compressionAbortRef.current) {
            reject(new Error('Upload cancelled'));
          }
        });
        
        // Upload to Cloudinary directly
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/video/upload`);
        xhr.send(formData);
      });
      
      xhrRef.current = null;
    } catch (error) {
      if (error.message !== 'Upload cancelled' && !compressionAbortRef.current) {
        console.error('Error uploading reel:', error);
        toast.error(error.message || 'Failed to upload reel');
      }
      setUploadProgress(0);
      setCompressionProgress(0);
    } finally {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
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
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-gray-900">Upload Reel</h3>
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
          {/* Video Upload Area */}
          {!selectedVideo ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-purple-500 transition-colors"
            >
              <Video className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-gray-600 mb-2">Click to upload video</p>
              <p className="text-sm text-gray-500">Videos longer than 60s will be cropped, Max 50MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="mb-4">
              <div className="relative rounded-lg overflow-hidden bg-black">
                <video
                  ref={videoPreviewRef}
                  src={videoPreview}
                  controls
                  className="w-full max-h-[400px]"
                />
                <button
                  onClick={handleRemoveVideo}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Duration: {Math.round(duration)}s
              </p>
            </div>
          )}

          {/* Caption */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Caption (optional)
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 min-h-[100px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">{caption.length}/500</p>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {compressionProgress < 100 ? (duration > 60 ? 'Cropping video...' : 'Preparing video...') : 'Uploading to Cloudinary...'}
                </span>
                <span className="text-sm font-medium text-purple-600">{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-600 to-pink-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              {compressionProgress < 100 && (
                <div className="mt-1">
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-purple-400 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${compressionProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {duration > 60 ? 'Cropping to 60 seconds...' : 'Preparing for upload...'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleCancel}
              disabled={!uploading}
              className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ border: 'none' }}
            >
              {uploading ? 'Cancel Upload' : 'Cancel'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedVideo || uploading}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              style={{ border: 'none' }}
            >
              {uploading ? 'Uploading...' : 'Upload Reel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadReelModal;

