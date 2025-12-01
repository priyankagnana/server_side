import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, Camera, X, Circle } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

const MessageInput = ({ onSendMessage, onTypingStart, onTypingStop, disabled, onError }) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Cleanup camera stream on unmount
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Initialize camera when modal opens
  useEffect(() => {
    if (showCamera && videoRef.current) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [showCamera]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    // Typing indicators
    if (value.trim() && !isTypingRef.current) {
      isTypingRef.current = true;
      onTypingStart?.();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTypingStop?.();
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !uploading) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = (emojiData) => {
    setMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      if (onError) {
        onError('File size must be less than 10MB');
      }
      return;
    }

    setSelectedFile(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Use back camera on mobile
        audio: false
      });
      
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      if (onError) {
        onError('Unable to access camera. Please check permissions or use file upload instead.');
      }
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0);

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          // Create a File object from the blob
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setCapturedPhoto(file);
          stopCamera();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const handleCameraClick = () => {
    // Check if camera is supported
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setShowCamera(true);
      setCapturedPhoto(null);
    } else {
      // Fallback to file input if camera API not available
      cameraInputRef.current?.click();
    }
  };

  const handleUsePhoto = () => {
    if (capturedPhoto) {
      setSelectedFile(capturedPhoto);
      setShowCamera(false);
      setCapturedPhoto(null);
    }
  };

  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const handleCloseCamera = () => {
    stopCamera();
    setShowCamera(false);
    setCapturedPhoto(null);
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  const uploadFile = async (file) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      // Get upload signature from backend
      const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const signatureResponse = await fetch(`${API_BASE}/api/chat/upload-signature`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!signatureResponse.ok) {
        throw new Error('Failed to get upload signature');
      }

      const { signature, timestamp, cloudName, apiKey, folder } = await signatureResponse.json();

      // Determine resource type
      const isImage = file.type.startsWith('image/');
      const resourceType = isImage ? 'image' : 'raw';

      // Create FormData for Cloudinary upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('folder', folder);
      formData.append('resource_type', resourceType);

      // Upload to Cloudinary
      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            setUploadProgress(percentComplete);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            resolve(response.secure_url);
          } else {
            reject(new Error('Upload failed'));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload error'));
        });

        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`);
        xhr.send(formData);
      });
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSend = async () => {
    if (disabled || uploading) return;

    let fileUrl = '';
    let messageType = 'text';
    const fileToUpload = selectedFile;

    // Clear file preview immediately when send is clicked
    if (fileToUpload) {
      setSelectedFile(null);
      messageType = fileToUpload.type.startsWith('image/') ? 'image' : 'file';
    }

    // If file was selected, upload it first
    if (fileToUpload) {
      try {
        fileUrl = await uploadFile(fileToUpload);
      } catch (error) {
        if (onError) {
          onError('Failed to upload file. Please try again.');
        }
        return;
      }
    }

    // Send message (with or without file)
    if (message.trim() || fileUrl) {
      onSendMessage(message.trim(), messageType, fileUrl);
      setMessage('');
      setShowEmojiPicker(false);
      
      // Stop typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      isTypingRef.current = false;
      onTypingStop?.();
    }
  };

  return (
    <>
      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Camera Preview */}
          {!capturedPhoto ? (
            <>
              <div className="flex-1 relative flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              
              {/* Camera Controls */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center justify-center gap-6">
                  <button
                    onClick={handleCloseCamera}
                    className="p-3 bg-white/20 rounded-full text-white hover:bg-white/30 transition-colors cursor-pointer"
                    type="button"
                  >
                    <X size={24} />
                  </button>
                  
                  <button
                    onClick={capturePhoto}
                    className="p-4 bg-white rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                    type="button"
                  >
                    <Circle size={64} className="text-gray-800" fill="currentColor" />
                  </button>
                  
                  <div className="w-16" /> {/* Spacer for alignment */}
                </div>
              </div>
            </>
          ) : (
            /* Captured Photo Preview */
            <div className="flex-1 relative flex flex-col">
              <div className="flex-1 flex items-center justify-center bg-black">
                <img
                  src={URL.createObjectURL(capturedPhoto)}
                  alt="Captured"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              
              {/* Photo Actions */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center justify-center gap-6">
                  <button
                    onClick={handleRetakePhoto}
                    className="px-6 py-3 bg-white/20 rounded-full text-white hover:bg-white/30 transition-colors cursor-pointer font-medium"
                    type="button"
                  >
                    Retake
                  </button>
                  
                  <button
                    onClick={handleUsePhoto}
                    className="px-6 py-3 bg-blue-600 rounded-full text-white hover:bg-blue-700 transition-colors cursor-pointer font-medium"
                    type="button"
                  >
                    Use Photo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-gray-200 bg-white p-4 relative">
        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-full left-0 mb-2 z-10">
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              width={350}
              height={400}
            />
          </div>
        )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Selected file preview */}
      {selectedFile && (
        <div className="mb-2 p-2 bg-gray-50 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedFile.type.startsWith('image/') ? (
              <img
                src={URL.createObjectURL(selectedFile)}
                alt="Preview"
                className="w-12 h-12 object-cover rounded"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                <Paperclip size={20} className="text-gray-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            onClick={removeSelectedFile}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
            type="button"
            disabled={uploading}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="mb-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Uploading... {Math.round(uploadProgress)}%</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Emoji Button */}
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
          type="button"
          disabled={uploading}
        >
          <Smile size={20} />
        </button>

        {/* Attachment Button */}
        <button
          onClick={handleAttachClick}
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          type="button"
          title="Attach file (max 10MB)"
          disabled={uploading}
        >
          <Paperclip size={20} />
        </button>

        {/* Camera Button */}
        <button
          onClick={handleCameraClick}
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          type="button"
          title="Take photo"
          disabled={uploading}
        >
          <Camera size={20} />
        </button>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black placeholder-gray-500 bg-white"
          disabled={disabled || uploading}
          style={{ color: '#000000' }}
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={(!message.trim() && !selectedFile) || disabled || uploading}
          className="bg-blue-600 text-white p-2.5 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center"
          type="button"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
    </>
  );
};

export default MessageInput;

