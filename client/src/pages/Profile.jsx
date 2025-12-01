import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Edit2, Save, X, Upload, Mail, Award, BookOpen, Camera, ArrowLeft, Users, LogOut, UserPlus, UserMinus, Bookmark } from 'lucide-react';
import { useToast } from '../components/Toast.jsx';
import PostCard from '../components/PostCard';
import DashboardNavbar from '../components/DashboardNavbar';
import FriendsModal from '../components/FriendsModal.jsx';

const Profile = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Get user ID from route params
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [editingField, setEditingField] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    learningJourney: '',
    profilePicture: '',
    achievements: []
  });
  const [tempFormData, setTempFormData] = useState({
    username: '',
    learningJourney: '',
    achievements: []
  });
  const [newAchievement, setNewAchievement] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [friendsCount, setFriendsCount] = useState(0);
  const [isFriend, setIsFriend] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [processingFriend, setProcessingFriend] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);

  // Load user data and posts
  useEffect(() => {
    loadUserData();
    loadUserPosts();
  }, [id]);

  // Reload data when page becomes visible (e.g., after accepting friend request from another page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isOwnProfile && id) {
        loadUserData();
      }
    };

    const handleFocus = () => {
      if (!isOwnProfile && id) {
        loadUserData();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [id, isOwnProfile]);


  const loadUserData = async () => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    try {
      // Get current user to check if viewing own profile
      const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
      const currentUserId = currentUser._id || currentUser.id;
      
      // Determine if viewing own profile
      const viewingOwnProfile = !id || id === currentUserId;
      setIsOwnProfile(viewingOwnProfile);

      // Load profile data - use specific user ID if provided, otherwise own profile
      const endpoint = id ? `${API_BASE}/api/users/${id}` : `${API_BASE}/api/users/profile`;
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (data.success && data.user) {
            setFormData({
              username: data.user.username || '',
              email: data.user.email || '',
              learningJourney: data.user.learningJourney || '',
              profilePicture: data.user.profilePicture || '',
              achievements: data.user.achievements || []
            });
            // Set friend status, friend request status, and friends count from backend
            setFriendsCount(data.user.friendsCount || 0);
            // Only set friend status if viewing another user's profile
            if (!viewingOwnProfile) {
              setIsFriend(data.user.isFriend || false);
              setFriendRequestSent(data.user.friendRequestSent || false);
            } else {
              // Reset friend status if viewing own profile
              setIsFriend(false);
              setFriendRequestSent(false);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setFetching(false);
    }
  };

  const loadUserPosts = async () => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

    try {
      const response = await fetch(`${API_BASE}/api/posts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.posts) {
          // Filter posts to show only the target user's posts
          const targetUserId = id || (() => {
            const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
            return currentUser._id || currentUser.id;
          })();
          
          let userPosts = data.posts.filter(post => {
            const postAuthorId = post.author?.id || post.author?._id;
            return postAuthorId && postAuthorId.toString() === targetUserId?.toString();
          });
          
          // Sort posts: pinned posts first (by pinnedAt date), then others by createdAt
          userPosts = userPosts.sort((a, b) => {
            // If both are pinned, sort by pinnedAt (newest first)
            if (a.pinnedToProfile && b.pinnedToProfile) {
              const aPinnedAt = a.pinnedAt ? new Date(a.pinnedAt) : new Date(0);
              const bPinnedAt = b.pinnedAt ? new Date(b.pinnedAt) : new Date(0);
              return bPinnedAt - aPinnedAt;
            }
            // If only one is pinned, it comes first
            if (a.pinnedToProfile) return -1;
            if (b.pinnedToProfile) return 1;
            // Both unpinned, sort by createdAt (newest first)
            const aCreated = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const bCreated = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return bCreated - aCreated;
          });
          
          setUserPosts(userPosts);
        }
      }
    } catch (error) {
      console.error('Error loading user posts:', error);
    }
  };

  // Compress and resize image
  const compressImage = (file, maxWidth = 300, maxHeight = 300, quality = 0.6) => {
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

          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = reject;
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
        const compressedImage = await compressImage(file, 300, 300, 0.6);
        await updateField('profilePicture', compressedImage);
        toast.success('Profile picture updated successfully');
      } catch (error) {
        console.error('Error compressing image:', error);
        toast.error('Failed to process image. Please try again.');
      }
    }
  };

  const startEditing = (field) => {
    setEditingField(field);
    setTempFormData({
      username: formData.username,
      learningJourney: formData.learningJourney,
      achievements: [...formData.achievements]
    });
  };

  const cancelEditing = () => {
    setEditingField(null);
    setTempFormData({ username: '', learningJourney: '', achievements: [] });
    setUsernameError('');
    setCheckingUsername(false);
  };

  const updateField = async (field, value) => {
    setLoading(true);
    setError('');

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

    try {
      const updateData = {
        username: field === 'username' ? value : formData.username,
        profilePicture: field === 'profilePicture' ? value : formData.profilePicture,
        learningJourney: field === 'learningJourney' ? value : formData.learningJourney,
        achievements: field === 'achievements' ? value : formData.achievements
      };

      const response = await fetch(`${API_BASE}/api/users/bio`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (data.success) {
            setFormData(prev => ({
              ...prev,
              [field]: value
            }));
            setEditingField(null);
            
            // Update localStorage user data
            const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
            user[field] = value;
            if (field === 'profilePicture') user.profilePicture = value;
            if (field === 'username') user.username = value;
            if (field === 'learningJourney') user.learningJourney = value;
            if (field === 'achievements') user.achievements = value;
            localStorage.setItem('user', JSON.stringify(user));
            sessionStorage.setItem('user', JSON.stringify(user));
          } else {
            setError(data.message || 'Failed to update');
          }
        }
      } else {
        const errorText = await response.text();
        setError('Failed to update. Please try again.');
        console.error('Update error:', errorText);
      }
    } catch (error) {
      console.error('Error updating:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkUsernameAvailability = async (username) => {
    if (!username.trim()) {
      setUsernameError('');
      return true;
    }

    // If username hasn't changed, it's available
    if (username.trim() === formData.username) {
      setUsernameError('');
      return true;
    }

    setCheckingUsername(true);
    setUsernameError('');

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

    try {
      // Try to update with the new username to check availability
      const response = await fetch(`${API_BASE}/api/users/bio`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: username.trim(),
          profilePicture: formData.profilePicture,
          learningJourney: formData.learningJourney,
          achievements: formData.achievements
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUsernameError('');
        setCheckingUsername(false);
        return true;
      } else {
        setUsernameError(data.message || 'Username is not available');
        setCheckingUsername(false);
        return false;
      }
    } catch (error) {
      console.error('Error checking username:', error);
      setCheckingUsername(false);
      return false;
    }
  };

  const handleUsernameChange = async (e) => {
    const value = e.target.value;
    setTempFormData(prev => ({ ...prev, username: value }));
    setUsernameError('');
    
    // Debounce username check
    if (value.trim() && value.trim() !== formData.username) {
      setTimeout(() => {
        checkUsernameAvailability(value);
      }, 500);
    }
  };

  const handleSave = async (field) => {
    if (field === 'username') {
      if (!tempFormData.username.trim()) {
        setError('Username cannot be empty');
        return;
      }
      if (usernameError) {
        setError('Please choose a different username');
        return;
      }
      // Final check before saving
      const isAvailable = await checkUsernameAvailability(tempFormData.username.trim());
      if (!isAvailable) {
        return;
      }
      await updateField('username', tempFormData.username.trim());
      setUsernameError('');
    } else if (field === 'learningJourney') {
      await updateField('learningJourney', tempFormData.learningJourney.trim());
    } else if (field === 'achievements') {
      await updateField('achievements', tempFormData.achievements);
    }
  };

  const handleAddAchievement = () => {
    if (newAchievement.trim()) {
      setTempFormData(prev => ({
        ...prev,
        achievements: [...prev.achievements, newAchievement.trim()]
      }));
      setNewAchievement('');
    }
  };

  const handleRemoveAchievement = (index) => {
    setTempFormData(prev => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== index)
    }));
  };


  const handleAddFriend = async () => {
    if (!id || isOwnProfile) return;
    
    setProcessingFriend(true);
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

    try {
      const response = await fetch(`${API_BASE}/api/users/friend-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: id })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Friend request sent successfully');
        setFriendRequestSent(true);
        // Reload user data to get updated status
        await loadUserData();
      } else {
        // If already friends, reload data to update the UI
        if (data.message && data.message.includes('already friends')) {
          await loadUserData();
        }
        toast.error(data.message || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error('Failed to send friend request');
    } finally {
      setProcessingFriend(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!id || isOwnProfile) return;
    
    setProcessingFriend(true);
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

    try {
      const response = await fetch(`${API_BASE}/api/users/friends/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Friend removed successfully');
        setIsFriend(false);
        // Reload user data to get updated status
        await loadUserData();
      } else {
        toast.error(data.message || 'Failed to remove friend');
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      toast.error('Failed to remove friend');
    } finally {
      setProcessingFriend(false);
    }
  };

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenExpiry');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('tokenExpiry');
    
    // Redirect to login page
    navigate('/login', { replace: true });
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    );
  }

  // Transform posts for PostCard component
  const transformedPosts = userPosts.map(post => ({
    id: post._id || post.id,
    author: post.author?.username || 'User',
    authorId: post.author?.id || post.author?._id,
    profilePicture: post.author?.profilePicture || null,
    field: post.field || post.author?.email?.split('@')[0] || 'Student',
    timeAgo: post.timeAgo || 'just now',
    tag: post.tag || '',
    content: post.content || '',
    image: post.image || null,
    likes: post.likes || 0,
    likedByUser: post.likedByUser || false,
    firstLiker: post.firstLiker || null,
    otherLikesCount: post.otherLikesCount || 0,
    comments: post.comments || 0,
    pinnedToProfile: post.pinnedToProfile || false,
    pinnedAt: post.pinnedAt || null
  }));

  const handlePostDelete = (postId) => {
    setUserPosts(prevPosts => prevPosts.filter(p => (p._id || p.id) !== postId));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <DashboardNavbar />

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Back Button */}
          <button
            onClick={() => navigate('/feed')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back to Feed</span>
          </button>

          <div className="flex items-center gap-6">
            {/* Profile Picture */}
            <div className="relative">
              {formData.profilePicture && formData.profilePicture.trim() !== '' ? (
                <img
                  src={formData.profilePicture}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white text-4xl font-semibold border-4 border-white shadow-lg">
                  {formData.username?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              {isOwnProfile && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-2 shadow-lg transition-colors"
                  title="Change profile picture"
                >
                  <Camera size={18} />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>

            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {editingField === 'username' ? (
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={tempFormData.username}
                        onChange={handleUsernameChange}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                        style={{ color: '#111827' }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleSave('username')}
                        disabled={loading || checkingUsername || !!usernameError}
                        className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save size={18} />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    {checkingUsername && (
                      <p className="text-xs text-gray-500 mt-1">Checking availability...</p>
                    )}
                    {usernameError && (
                      <p className="text-xs text-red-500 mt-1">{usernameError}</p>
                    )}
                  </div>
                ) : (
                  <>
                    <h1 className="text-3xl font-bold text-gray-900">{formData.username || 'User'}</h1>
                    {isOwnProfile && (
                      <button
                        onClick={() => startEditing('username')}
                        className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Edit username"
                      >
                        <Edit2 size={18} />
                      </button>
                    )}
                  </>
                )}
              </div>
              
              <div className="space-y-2 mb-4">
                {formData.email && formData.email.trim() !== '' && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail size={16} />
                    <span>{formData.email}</span>
                  </div>
                )}
                <div 
                  className="flex items-center gap-2 text-gray-600 cursor-pointer hover:text-purple-600 transition-colors"
                  onClick={() => {
                    const targetUserId = id || (() => {
                      const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
                      return currentUser._id || currentUser.id;
                    })();
                    if (targetUserId) {
                      setShowFriendsModal(true);
                    }
                  }}
                >
                  <Users size={16} />
                  <span className="font-medium">{friendsCount}</span>
                  <span>Friends</span>
                </div>
                {/* Friend Action Button - Only show for other users' profiles */}
                {!isOwnProfile && (
                  <div className="mt-3">
                    {isFriend ? (
                      <button
                        onClick={handleRemoveFriend}
                        disabled={processingFriend}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        style={{ backgroundColor: '#ef4444', border: 'none' }}
                      >
                        <UserMinus size={18} />
                        <span>Remove Friend</span>
                      </button>
                    ) : friendRequestSent ? (
                      <button
                        disabled
                        className="flex items-center gap-2 px-4 py-2 bg-gray-400 text-white rounded-lg font-medium cursor-not-allowed"
                        style={{ border: 'none' }}
                      >
                        <UserPlus size={18} />
                        <span>Friend Request Sent</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleAddFriend}
                        disabled={processingFriend}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        style={{ backgroundColor: '#22c55e', border: 'none' }}
                      >
                        <UserPlus size={18} />
                        <span>Add as Friend</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1 space-y-6 min-w-0">
            {/* Learning Journey */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="text-purple-600" size={20} />
                  <h2 className="text-lg font-semibold text-gray-900">Learning Journey</h2>
                </div>
                {editingField !== 'learningJourney' && isOwnProfile && (
                  <button
                    onClick={() => startEditing('learningJourney')}
                    className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Edit learning journey"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
              </div>
              
              {editingField === 'learningJourney' ? (
                <div className="space-y-3">
                  <textarea
                    value={tempFormData.learningJourney}
                    onChange={(e) => setTempFormData(prev => ({ ...prev, learningJourney: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 min-h-[100px]"
                    placeholder="Tell us about your learning journey..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave('learningJourney')}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700 leading-relaxed">
                  {formData.learningJourney && formData.learningJourney.trim() !== '' 
                    ? formData.learningJourney 
                    : 'No learning journey added yet.'}
                </p>
              )}
            </div>

            {/* Achievements */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 w-full min-w-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Award className="text-yellow-600" size={20} />
                  <h2 className="text-lg font-semibold text-gray-900">Achievements</h2>
                </div>
                {editingField !== 'achievements' && isOwnProfile && (
                  <button
                    onClick={() => startEditing('achievements')}
                    className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Edit achievements"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
              </div>

              {editingField === 'achievements' ? (
                <div className="space-y-3 w-full">
                  <div className="flex gap-2 w-full">
                    <input
                      type="text"
                      value={newAchievement}
                      onChange={(e) => setNewAchievement(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddAchievement()}
                      placeholder="Add achievement..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 min-w-0"
                      style={{ color: '#111827' }}
                    />
                    <button
                      onClick={handleAddAchievement}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {tempFormData.achievements.map((achievement, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                        <span className="text-gray-700 flex-1 break-words">{achievement}</span>
                        <button
                          onClick={() => handleRemoveAchievement(index)}
                          className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleSave('achievements')}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {formData.achievements.length > 0 ? (
                    formData.achievements.map((achievement, index) => (
                      <div key={index} className="bg-gray-50 px-3 py-2 rounded-lg">
                        <span className="text-gray-700">{achievement}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">
                      {formData.achievements && formData.achievements.length > 0 
                        ? '' 
                        : 'No achievements added yet.'}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Saved Posts Button - Only for own profile */}
            {isOwnProfile && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 w-full min-w-0">
                <button
                  onClick={() => navigate('/saved-posts')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium cursor-pointer"
                  style={{ backgroundColor: '#9333ea', border: 'none' }}
                >
                  <Bookmark size={18} />
                  <span>Saved Posts</span>
                </button>
              </div>
            )}

            {/* Logout Button - Only show for own profile */}
            {isOwnProfile && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 w-full min-w-0">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium cursor-pointer"
                  style={{ backgroundColor: '#ef4444', border: 'none' }}
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Column - Posts */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {isOwnProfile ? 'My Posts' : `${formData.username || 'User'}'s Posts`}
              </h2>
              {transformedPosts.length > 0 ? (
                <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                  {transformedPosts.map((post) => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      onDelete={handlePostDelete}
                      onRefresh={loadUserPosts}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>No posts yet. Start sharing your thoughts!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Friends Modal */}
      <FriendsModal
        isOpen={showFriendsModal}
        onClose={() => setShowFriendsModal(false)}
        userId={id || (() => {
          const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
          return currentUser._id || currentUser.id;
        })()}
      />
    </div>
  );
};

export default Profile;

