import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, BookOpen, Award, X } from 'lucide-react';

const BioSetup = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    learningJourney: '',
    profilePicture: '',
    achievements: []
  });
  const [newAchievement, setNewAchievement] = useState('');

  // Calculate completion percentage
  const calculateProgress = () => {
    let filledFields = 0;
    const totalFields = 4; // profilePicture, username, learningJourney, achievements
    
    if (formData.profilePicture) filledFields++;
    if (formData.username.trim()) filledFields++;
    if (formData.learningJourney.trim()) filledFields++;
    if (formData.achievements.length > 0) filledFields++;
    
    return Math.round((filledFields / totalFields) * 100);
  };

  // Load existing user data
  useEffect(() => {
    const loadUserData = async () => {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      if (!token) {
        navigate('/login', { replace: true });
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/users/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (data.success && data.user) {
              const hasExistingData = !!(data.user.username || data.user.learningJourney || data.user.profilePicture || (data.user.achievements && data.user.achievements.length > 0));
              setIsFirstTime(!hasExistingData);
              
              setFormData({
                username: data.user.username || '',
                learningJourney: data.user.learningJourney || '',
                profilePicture: data.user.profilePicture || '',
                achievements: data.user.achievements || []
              });
            }
          }
        } else if (response.status === 404) {
          // Route not found - server might not be running or routes not registered
          console.error('API route not found. Please restart the server.');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setFetching(false);
      }
    };

    loadUserData();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  // Compress and resize image - more aggressive compression
  const compressImage = (file, maxWidth = 300, maxHeight = 300, quality = 0.6) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions - always resize to max dimensions
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          // Use better image smoothing for quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with compression - use lower quality for smaller size
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          
          // Check if compressed size is still too large (base64 is ~33% larger than binary)
          const base64Size = compressedBase64.length;
          const estimatedSizeKB = (base64Size * 3) / 4 / 1024;
          
          if (estimatedSizeKB > 500) {
            // If still too large, compress more aggressively
            const lowerQuality = Math.max(0.3, quality - 0.2);
            const moreCompressed = canvas.toDataURL('image/jpeg', lowerQuality);
            resolve(moreCompressed);
          } else {
            resolve(compressedBase64);
          }
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size should be less than 10MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      
      try {
        setError('');
        // Compress the image before converting to base64
        const compressedImage = await compressImage(file, 400, 400, 0.8);
        setFormData(prev => ({ ...prev, profilePicture: compressedImage }));
      } catch (error) {
        console.error('Error compressing image:', error);
        setError('Failed to process image. Please try again.');
      }
    }
  };

  const handleAddAchievement = () => {
    if (newAchievement.trim()) {
      setFormData(prev => ({
        ...prev,
        achievements: [...prev.achievements, newAchievement.trim()]
      }));
      setNewAchievement('');
    }
  };

  const handleRemoveAchievement = (index) => {
    setFormData(prev => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.username.trim()) {
      setError('Please enter a username');
      return;
    }

    if (!formData.learningJourney.trim()) {
      setError('Please describe your learning journey');
      return;
    }

    setLoading(true);

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

    try {
      const response = await fetch(`${API_BASE}/api/users/bio`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: formData.username.trim(),
          profilePicture: formData.profilePicture,
          learningJourney: formData.learningJourney.trim(),
          achievements: formData.achievements
        }),
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        setError(`Server error: ${response.status} ${response.statusText}. Please check if the server is running.`);
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (response.ok && data.success) {
        // Update user in localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...user, ...data.user }));
        
        // Navigate to feed page
        navigate('/feed', { replace: true });
      } else {
        setError(data.message || 'Failed to save bio. Please try again.');
      }
    } catch (error) {
      console.error('Bio setup error:', error);
      if (error instanceof SyntaxError) {
        setError('Server returned invalid response. Please check if the server is running and restart it.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-white flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-purple-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647A7.962 7.962 0 0112 20c0-3.042-1.135-5.824-3-7.938l-3 2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-white flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-2xl">
        {/* Progress Section - Only show for first-time setup */}
        {isFirstTime && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-600">{progress}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-gradient-to-r from-blue-500 via-purple-500 to-teal-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Title Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-purple-500 text-xl">✦</span>
            <h1 className="text-3xl font-bold text-purple-600">Set Up Your Bio</h1>
            <span className="text-purple-500 text-xl">✦</span>
          </div>
          <p className="text-gray-600">Tell us about your learning journey</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 text-center">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Upload Photo Card */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-200 to-purple-300 flex items-center justify-center overflow-hidden">
                  {formData.profilePicture ? (
                    <img 
                      src={formData.profilePicture} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <BookOpen className="text-purple-600" size={48} />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center shadow-lg hover:bg-purple-700 transition-colors border-4 border-white focus:outline-none focus:ring-2 focus:ring-purple-300 z-10"
                  aria-label="Upload photo"
                  style={{ borderRadius: '50%' }}
                >
                  <Upload className="text-white" size={28} strokeWidth={2.5} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <p className="text-purple-600 font-medium">Upload Photo</p>
            </div>
          </div>

          {/* Username Card */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your username"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          {/* Learning Journey Card */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Learning Journey
            </label>
            <textarea
              name="learningJourney"
              value={formData.learningJourney}
              onChange={handleChange}
              placeholder="Describe your learning journey..."
              rows="5"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              required
            />
          </div>

          {/* Achievements Card */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Award className="text-teal-500" size={20} />
                <label className="block text-sm font-medium text-gray-700">
                  Add Your Achievements
                </label>
              </div>
            </div>
            
            {formData.achievements.length === 0 ? (
              <p className="text-gray-400 text-sm mb-4">No achievements added yet</p>
            ) : (
              <div className="space-y-2 mb-4">
                {formData.achievements.map((achievement, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                  >
                    <span className="text-gray-700 text-sm">{achievement}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAchievement(index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={newAchievement}
                onChange={(e) => setNewAchievement(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAchievement();
                  }
                }}
                placeholder="Add an achievement..."
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleAddAchievement}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Save & Continue Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-500 via-purple-500 to-teal-500 hover:from-blue-600 hover:via-purple-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647A7.962 7.962 0 0112 20c0-3.042-1.135-5.824-3-7.938l-3 2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              'Save & Continue'
            )}
          </button>

          <p className="text-center text-sm text-gray-400">
            You can edit this later in your profile
          </p>
        </form>
      </div>
    </div>
  );
};

export default BioSetup;

