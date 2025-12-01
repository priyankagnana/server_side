import React, { useState, useRef, useEffect } from 'react';
import { X, Image as ImageIcon, Smile, ChevronDown, Globe, Search } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useToast } from './Toast.jsx';

const CreatePostModal = ({ isOpen, onClose, onSubmit }) => {
  const toast = useToast();
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedGif, setSelectedGif] = useState(null);
  const [privacy, setPrivacy] = useState('public'); // 'public' or 'friends'
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchQuery, setGifSearchQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [gifLoading, setGifLoading] = useState(false);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const gifPickerRef = useRef(null);

  // Giphy API - Using public demo key (replace with your own for production)
  const GIPHY_API_KEY = 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65'; // Public demo key
  const GIPHY_API_URL = 'https://api.giphy.com/v1/gifs';

  // Note: Click outside is now handled by the backdrop onClick handlers

  // Fetch trending GIFs when picker opens
  useEffect(() => {
    if (showGifPicker) {
      fetchTrendingGifs();
    }
  }, [showGifPicker]);

  const fetchTrendingGifs = async () => {
    setGifLoading(true);
    try {
      const response = await fetch(`${GIPHY_API_URL}/trending?api_key=${GIPHY_API_KEY}&limit=20`);
      const data = await response.json();
      if (data.data) {
        setGifs(data.data);
      }
    } catch (error) {
      console.error('Error fetching trending GIFs:', error);
    } finally {
      setGifLoading(false);
    }
  };

  const searchGifs = async (query) => {
    if (!query.trim()) {
      fetchTrendingGifs();
      return;
    }

    setGifLoading(true);
    try {
      const response = await fetch(`${GIPHY_API_URL}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20`);
      const data = await response.json();
      if (data.data) {
        setGifs(data.data);
      }
    } catch (error) {
      console.error('Error searching GIFs:', error);
    } finally {
      setGifLoading(false);
    }
  };

  const handleGifSearch = (e) => {
    e.preventDefault();
    searchGifs(gifSearchQuery);
  };

  const handleGifSelect = (gif) => {
    setSelectedGif(gif.images.fixed_height.url);
    setSelectedImage(null); // Clear image if GIF is selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setShowGifPicker(false);
  };

  const handleEmojiClick = (emojiData) => {
    setContent(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  if (!isOpen) return null;

  // Compress and resize image
  const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.7) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        // Use window.Image explicitly to avoid conflicts
        const imgElement = new window.Image();
        imgElement.src = event.target.result;
        imgElement.onload = () => {
          const canvas = document.createElement('canvas');
          let width = imgElement.width;
          let height = imgElement.height;

          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(imgElement, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        imgElement.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.warning('Image size should be less than 10MB');
        return;
      }
      try {
        const compressedImage = await compressImage(file, 800, 800, 0.7);
        setSelectedImage(compressedImage);
        setSelectedGif(null); // Clear GIF if image is selected
      } catch (error) {
        console.error('Error compressing image:', error);
        toast.error('Failed to process image. Please try again.');
      }
    }
  };

  const handleSubmit = () => {
    if (!content.trim() && !selectedImage && !selectedGif) {
      toast.warning('Please add some content, an image, or a GIF');
      return;
    }
    onSubmit({
      content: content.trim(),
      image: selectedImage || selectedGif, // Use GIF URL if selected
      privacy
    });
    // Reset form
    setContent('');
    setSelectedImage(null);
    setSelectedGif(null);
    setPrivacy('public');
    setShowEmojiPicker(false);
    setShowGifPicker(false);
    onClose();
  };

  const removeImage = () => {
    setSelectedImage(null);
    setSelectedGif(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)'
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Create Post</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {/* Text Input */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's happening?"
            className="w-full min-h-[150px] text-lg text-gray-900 placeholder-gray-400 border-none focus:outline-none resize-none"
            style={{ backgroundColor: 'transparent' }}
          />

          {/* Selected Image/GIF Preview */}
          {(selectedImage || selectedGif) && (
            <div className="relative mb-4 rounded-lg overflow-hidden">
              <img
                src={selectedImage || selectedGif}
                alt="Selected"
                className="w-full max-h-96 object-cover"
              />
              <button
                onClick={removeImage}
                className="absolute top-2 right-2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Media Options */}
          <div className="flex items-center gap-4 mb-4 pt-4 border-t border-gray-200 relative">
            <button
              onClick={() => {
                fileInputRef.current?.click();
                setShowEmojiPicker(false);
                setShowGifPicker(false);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ImageIcon size={20} className="text-gray-600" />
              <span className="text-sm text-gray-600">Image</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />

            <div className="relative" ref={gifPickerRef}>
              <button
                onClick={() => {
                  setShowGifPicker(!showGifPicker);
                  setShowEmojiPicker(false);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">GIF</span>
                </div>
                <span className="text-sm text-gray-600">GIF</span>
              </button>

              {/* GIF Picker */}
              {showGifPicker && (
                <div 
                  className="fixed inset-0 flex items-center justify-center z-50 picker-backdrop"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
                  onClick={() => setShowGifPicker(false)}
                >
                  <div 
                    ref={gifPickerRef}
                    className="bg-white rounded-lg shadow-xl border border-gray-200 w-[500px] max-h-[500px] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-3 border-b border-gray-200">
                      <form onSubmit={handleGifSearch} className="flex gap-2">
                        <input
                          type="text"
                          value={gifSearchQuery}
                          onChange={(e) => setGifSearchQuery(e.target.value)}
                          placeholder="Search GIFs..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="submit"
                          className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          <Search size={16} />
                        </button>
                      </form>
                    </div>
                    <div className="overflow-y-auto max-h-[420px] p-3">
                      {gifLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-gray-500">Loading GIFs...</div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {gifs.map((gif) => (
                            <button
                              key={gif.id}
                              onClick={() => handleGifSelect(gif)}
                              className="relative aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                            >
                              <img
                                src={gif.images.fixed_height_small.url}
                                alt={gif.title}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={emojiPickerRef}>
              <button
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                  setShowGifPicker(false);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Smile size={20} className="text-gray-600" />
                <span className="text-sm text-gray-600">Emoji</span>
              </button>

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div 
                  className="fixed inset-0 flex items-center justify-center z-50 picker-backdrop"
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

          {/* Privacy Settings */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="relative">
              <button
                onClick={() => setShowPrivacyMenu(!showPrivacyMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <Globe size={16} className="text-gray-600" />
                <span className="text-sm text-gray-700">
                  {privacy === 'public' ? 'Everyone can view' : 'Only friends can view'}
                </span>
                <ChevronDown size={16} className="text-gray-600" />
              </button>
              {showPrivacyMenu && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[200px] z-10">
                  <button
                    onClick={() => {
                      setPrivacy('public');
                      setShowPrivacyMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-900"
                    style={{ color: '#111827', border: 'none' }}
                  >
                    <Globe size={16} className="text-gray-600" />
                    <span className="text-sm text-gray-900">Everyone can view</span>
                  </button>
                  <button
                    onClick={() => {
                      setPrivacy('friends');
                      setShowPrivacyMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-900"
                    style={{ color: '#111827', border: 'none' }}
                  >
                    <span className="text-sm text-gray-900">Only friends can view</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 rounded-lg text-white font-semibold transition-colors"
            style={{
              backgroundColor: '#1e40af',
              border: 'none',
              cursor: 'pointer'
            }}
            disabled={!content.trim() && !selectedImage && !selectedGif}
          >
            Share now
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;

