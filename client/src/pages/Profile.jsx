import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Edit2, Save, X, Upload, Mail, Award, BookOpen, Camera, ArrowLeft, Users, LogOut, UserPlus, UserMinus, Bookmark, Loader2, Hash, FileText, Settings, User, MapPin, GraduationCap, Code, Heart, TrendingUp, Briefcase, Video } from 'lucide-react';
import { useToast } from '../components/Toast.jsx';
import PostCard from '../components/PostCard';
import DashboardNavbar from '../components/DashboardNavbar';
import FriendsModal from '../components/FriendsModal.jsx';
import ReelsViewer from '../components/ReelsViewer';

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
  const [userReels, setUserReels] = useState([]);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    learningJourney: '',
    profilePicture: '',
    achievements: [],
    location: '',
    education: '',
    skills: [],
    interests: [],
    bio: ''
  });
  const [tempFormData, setTempFormData] = useState({
    username: '',
    learningJourney: '',
    achievements: [],
    location: '',
    education: '',
    skills: [],
    interests: [],
    bio: ''
  });
  const [newSkill, setNewSkill] = useState('');
  const [newInterest, setNewInterest] = useState('');
  const [newAchievement, setNewAchievement] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [friendsCount, setFriendsCount] = useState(0);
  const [isFriend, setIsFriend] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [processingFriend, setProcessingFriend] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [userStudyGroups, setUserStudyGroups] = useState([]);
  const [loadingStudyGroups, setLoadingStudyGroups] = useState(false);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts', 'reels', 'about', 'groups'
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedReelIndex, setSelectedReelIndex] = useState(0);

  // Load user data and posts
  useEffect(() => {
    loadUserData();
    loadUserPosts();
    loadUserReels();
  }, [id]);

  // Load study groups when profile is loaded and it's own profile
  useEffect(() => {
    if (isOwnProfile && !fetching) {
      loadUserStudyGroups();
    }
  }, [isOwnProfile, fetching]);

  // Listen for study group updates
  useEffect(() => {
    if (!isOwnProfile) return;

    const handleStudyGroupUpdate = () => {
      loadUserStudyGroups();
    };

    window.addEventListener('studyGroupCreated', handleStudyGroupUpdate);
    window.addEventListener('studyGroupJoined', handleStudyGroupUpdate);

    return () => {
      window.removeEventListener('studyGroupCreated', handleStudyGroupUpdate);
      window.removeEventListener('studyGroupJoined', handleStudyGroupUpdate);
    };
  }, [isOwnProfile]);

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
              achievements: data.user.achievements || [],
              location: data.user.location || '',
              education: data.user.education || '',
              skills: data.user.skills || [],
              interests: data.user.interests || [],
              bio: data.user.bio || ''
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

  const loadUserStudyGroups = async () => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

    if (!token) return;

    try {
      setLoadingStudyGroups(true);
      const response = await fetch(`${API_BASE}/api/study-groups`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.studyGroups) {
          // Get current user ID
          const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
          const currentUserId = currentUser._id || currentUser.id;

          // Filter to show only groups user is a member of
          const myGroups = data.studyGroups.filter(group => {
            const isMember = group.members?.some(m =>
              (m.user?._id || m.user)?.toString() === currentUserId?.toString()
            );
            return isMember;
          });

          setUserStudyGroups(myGroups);
        }
      }
    } catch (error) {
      console.error('Error loading study groups:', error);
    } finally {
      setLoadingStudyGroups(false);
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

  const loadUserReels = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/reels`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.reels) {
          const targetUserId = id || (() => {
            const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
            return currentUser._id || currentUser.id;
          })();

          const userReels = data.reels.filter(reel => {
            const reelAuthorId = reel.author?.id || reel.author?._id;
            return reelAuthorId && reelAuthorId.toString() === targetUserId?.toString();
          });

          // Sort reels by createdAt (newest first)
          const sortedReels = userReels.sort((a, b) => {
            const aCreated = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const bCreated = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return bCreated - aCreated;
          });

          setUserReels(sortedReels);
        }
      }
    } catch (error) {
      console.error('Error loading user reels:', error);
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
      achievements: [...formData.achievements],
      location: formData.location,
      education: formData.education,
      skills: [...formData.skills],
      interests: [...formData.interests],
      bio: formData.bio
    });
  };

  const cancelEditing = () => {
    setEditingField(null);
    setTempFormData({ username: '', learningJourney: '', achievements: [], location: '', education: '', skills: [], interests: [], bio: '' });
    setUsernameError('');
    setCheckingUsername(false);
    setNewSkill('');
    setNewInterest('');
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
        achievements: field === 'achievements' ? value : formData.achievements,
        location: field === 'location' ? value : formData.location,
        education: field === 'education' ? value : formData.education,
        skills: field === 'skills' ? value : formData.skills,
        interests: field === 'interests' ? value : formData.interests,
        bio: field === 'bio' ? value : formData.bio
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
    } else if (field === 'location') {
      await updateField('location', tempFormData.location.trim());
    } else if (field === 'education') {
      await updateField('education', tempFormData.education.trim());
    } else if (field === 'skills') {
      await updateField('skills', tempFormData.skills);
    } else if (field === 'interests') {
      await updateField('interests', tempFormData.interests);
    } else if (field === 'bio') {
      await updateField('bio', tempFormData.bio.trim());
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

  const handleAddSkill = () => {
    if (newSkill.trim()) {
      setTempFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (index) => {
    setTempFormData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  const handleAddInterest = () => {
    if (newInterest.trim()) {
      setTempFormData(prev => ({
        ...prev,
        interests: [...prev.interests, newInterest.trim()]
      }));
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (index) => {
    setTempFormData(prev => ({
      ...prev,
      interests: prev.interests.filter((_, i) => i !== index)
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 flex items-center justify-center">
        <div className={`text-center rounded-3xl bg-white/80 backdrop-blur-xl border border-gray-200/50 shadow-xl p-12`}>
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-700 text-lg">Loading profile...</p>
        </div>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 transition-colors duration-300">
      <style>{`
        .profile-post-wrapper img[alt="Post"] {
          display: none !important;
        }
      `}</style>
      {/* Navbar */}
      <DashboardNavbar />

      <div className="container mx-auto px-4 py-6 lg:py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header with Profile Card */}
          <div className={`mb-8 rounded-3xl bg-white/90 backdrop-blur-xl border border-gray-200/50 shadow-xl p-8 lg:p-12 transition-all duration-300`}>
            {/* Back Button and Logout */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigate('/feed')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-all duration-300 hover:scale-105"
              >
                <ArrowLeft size={18} />
                <span className="text-sm font-medium">Back to Feed</span>
              </button>
              {isOwnProfile && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <LogOut size={18} />
                  <span className="text-sm">Logout</span>
                </button>
              )}
            </div>

            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Profile Picture */}
              <div className="relative group">
                {formData.profilePicture && formData.profilePicture.trim() !== '' ? (
                  <div className="relative">
                    <img
                      src={formData.profilePicture}
                      alt="Profile"
                      className="w-32 h-32 lg:w-40 lg:h-40 rounded-3xl object-cover border-4 border-white shadow-2xl group-hover:scale-105 transition-all duration-300"
                    />
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                ) : (
                  <div className="w-32 h-32 lg:w-40 lg:h-40 flex items-center justify-center rounded-3xl border-4 border-dashed transition-all duration-300 group-hover:scale-105 bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300/50 text-gray-500 shadow-xl">
                    <div className="text-4xl lg:text-5xl font-bold text-gray-400">
                      {formData.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                  </div>
                )}
                {isOwnProfile && (
                  <label
                    className="absolute -bottom-2 -right-2 p-4 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="w-5 h-5" />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 w-full text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-3 flex-wrap">
                  {editingField === 'username' ? (
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={tempFormData.username}
                          onChange={handleUsernameChange}
                          className="flex-1 px-5 py-3 border-2 border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-gray-900 bg-white/80 backdrop-blur-xl transition-all duration-300"
                          style={{ color: '#111827' }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleSave('username')}
                          disabled={loading || checkingUsername || !!usernameError}
                          className="p-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          <Save size={18} />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-3 bg-gray-500 hover:bg-gray-600 text-white rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          <X size={18} />
                        </button>
                      </div>
                      {checkingUsername && (
                        <p className="text-xs text-purple-600 mt-2 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Checking availability...
                        </p>
                      )}
                      {usernameError && (
                        <p className="text-xs text-red-500 mt-2">{usernameError}</p>
                      )}
                    </div>
                  ) : (
                    <>
                      <h1 className="text-3xl lg:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {formData.username || 'User'}
                      </h1>
                      {isOwnProfile && (
                        <button
                          onClick={() => startEditing('username')}
                          className="p-2.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all duration-300 hover:scale-110 transform"
                          title="Edit username"
                        >
                          <Edit2 size={18} />
                        </button>
                      )}
                    </>
                  )}
                </div>

                <p className="text-base lg:text-lg mb-4 text-gray-600">
                  {formData.email || 'No email set'}
                </p>

                <div className="flex flex-wrap items-center gap-4 mb-4 justify-center md:justify-start">
                  <div
                    className="flex items-center gap-2 text-gray-700 cursor-pointer hover:text-purple-600 transition-all duration-300 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 hover:border-purple-200"
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
                    <Users size={18} className="text-purple-600" />
                    <span className="font-semibold text-gray-900">{friendsCount}</span>
                    <span className="text-sm">Friends</span>
                  </div>
                  {/* Friend Action Button - Only show for other users' profiles */}
                  {!isOwnProfile && (
                    <div className="mt-2 sm:mt-0">
                      {isFriend ? (
                        <button
                          onClick={handleRemoveFriend}
                          disabled={processingFriend}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          <UserMinus size={18} />
                          <span>Remove Friend</span>
                        </button>
                      ) : friendRequestSent ? (
                        <button
                          disabled
                          className="flex items-center gap-2 px-5 py-2.5 bg-gray-400 text-white rounded-xl font-medium cursor-not-allowed shadow-md"
                        >
                          <UserPlus size={18} />
                          <span>Friend Request Sent</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleAddFriend}
                          disabled={processingFriend}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          <UserPlus size={18} />
                          <span>Add as Friend</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl shadow-sm">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Tabs Navigation */}
            <div className="rounded-2xl bg-white/80 backdrop-blur-xl border border-gray-200/50 shadow-lg p-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'posts'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg scale-105'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                >
                  <FileText size={18} />
                  <span>Posts</span>
                  {transformedPosts.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                      {transformedPosts.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('reels')}
                  className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'reels'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg scale-105'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                >
                  <Video size={18} />
                  <span>Reels</span>
                  {userReels.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                      {userReels.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('about')}
                  className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'about'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg scale-105'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                >
                  <User size={18} />
                  <span>About</span>
                </button>
                {isOwnProfile && (
                  <button
                    onClick={() => setActiveTab('groups')}
                    className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'groups'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg scale-105'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                  >
                    <Users size={18} />
                    <span>Study Groups</span>
                    {userStudyGroups.length > 0 && (
                      <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                        {userStudyGroups.length}
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'posts' && (
              <div className="rounded-3xl bg-white/80 backdrop-blur-xl border border-gray-200/50 shadow-xl p-6 sm:p-8 transition-all duration-300">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                  <div className="p-2 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl">
                    <FileText className="text-purple-600" size={20} />
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    {isOwnProfile ? 'My Posts' : `${formData.username || 'User'}'s Posts`}
                  </h2>
                  {transformedPosts.length > 0 && (
                    <span className="ml-auto px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                      {transformedPosts.length}
                    </span>
                  )}
                </div>
                {transformedPosts.length > 0 ? (
                  <div className="space-y-6 max-h-[calc(100vh-400px)] overflow-y-auto pr-2 custom-scrollbar">
                    {transformedPosts.map((post) => (
                      <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="profile-post-wrapper">
                          <PostCard
                            post={post}
                            onDelete={handlePostDelete}
                            onRefresh={loadUserPosts}
                          />
                        </div>
                        {post.image && post.image.trim() !== '' && (
                          <div className="w-full overflow-x-auto bg-gray-50 border-t border-gray-200">
                            <img
                              src={post.image}
                              alt="Post"
                              className="w-full h-auto object-contain"
                              style={{ maxHeight: 'none', display: 'block', minWidth: '100%' }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="inline-block p-6 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full mb-4">
                      <FileText size={48} className="text-purple-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No posts yet</h3>
                    <p className="text-gray-500">Start sharing your thoughts and experiences!</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reels' && (
              <div className="rounded-3xl bg-white/80 backdrop-blur-xl border border-gray-200/50 shadow-xl p-6 sm:p-8 transition-all duration-300">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                  <div className="p-2 bg-gradient-to-br from-red-100 to-pink-100 rounded-xl">
                    <Video className="text-red-600" size={20} />
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    {isOwnProfile ? 'My Reels' : `${formData.username || 'User'}'s Reels`}
                  </h2>
                  {userReels.length > 0 && (
                    <span className="ml-auto px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                      {userReels.length}
                    </span>
                  )}
                </div>
                {userReels.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {userReels.map((reel, index) => (
                      <div
                        key={reel.id || reel._id}
                        className="aspect-[9/16] bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative group"
                        onClick={() => {
                          setSelectedReelIndex(index);
                          setIsViewerOpen(true);
                        }}
                      >
                        {reel.thumbnailUrl ? (
                          <img 
                            src={reel.thumbnailUrl} 
                            alt={reel.caption || 'Reel'} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                            <Video size={32} className="text-white" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Video size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-3 text-white text-xs">
                          <span className="flex items-center gap-1">
                            <span>❤️</span>
                            <span>{reel.likes?.length || reel.likes || 0}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span>💬</span>
                            <span>{reel.comments?.length || reel.comments || 0}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="inline-block p-6 bg-gradient-to-br from-red-100 to-pink-100 rounded-full mb-4">
                      <Video size={48} className="text-red-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No reels yet</h3>
                    <p className="text-gray-500">Start sharing your video content!</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-6">
                {/* Personal Information Section */}
                <div className="rounded-3xl bg-gradient-to-br from-white/90 to-blue-50/50 backdrop-blur-xl border border-gray-200/50 shadow-xl p-6 lg:p-8 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                    <div className="p-3 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl">
                      <User className="text-blue-600" size={24} />
                    </div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-700 bg-clip-text text-transparent">
                      Personal Information
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Bio */}
                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <User className="text-blue-600" size={18} />
                          <h3 className="text-lg font-semibold text-gray-800">About Me</h3>
                        </div>
                        {editingField !== 'bio' && isOwnProfile && (
                          <button
                            onClick={() => startEditing('bio')}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Edit bio"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                      </div>
                      {editingField === 'bio' ? (
                        <div className="space-y-3">
                          <textarea
                            value={tempFormData.bio}
                            onChange={(e) => setTempFormData(prev => ({ ...prev, bio: e.target.value }))}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-gray-900 min-h-[100px] resize-none bg-white transition-all"
                            placeholder="Tell us about yourself..."
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSave('bio')}
                              disabled={loading}
                              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all font-medium disabled:opacity-50 text-sm"
                            >
                              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save'}
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all font-medium text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-700 leading-relaxed bg-white/60 rounded-lg p-4 border border-gray-100">
                          {formData.bio && formData.bio.trim() !== ''
                            ? formData.bio
                            : <span className="text-gray-400 italic">No bio added yet.</span>}
                        </p>
                      )}
                    </div>

                    {/* Location */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="text-green-600" size={18} />
                          <h3 className="text-lg font-semibold text-gray-800">Location</h3>
                        </div>
                        {editingField !== 'location' && isOwnProfile && (
                          <button
                            onClick={() => startEditing('location')}
                            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                            title="Edit location"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                      </div>
                      {editingField === 'location' ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={tempFormData.location}
                            onChange={(e) => setTempFormData(prev => ({ ...prev, location: e.target.value }))}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 text-gray-900 bg-white transition-all"
                            placeholder="e.g., New York, USA"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSave('location')}
                              disabled={loading}
                              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all font-medium disabled:opacity-50 text-sm"
                            >
                              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save'}
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all font-medium text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white/60 rounded-lg p-4 border border-gray-100">
                          <p className="text-gray-700">
                            {formData.location && formData.location.trim() !== ''
                              ? formData.location
                              : <span className="text-gray-400 italic">Not specified</span>}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Education */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="text-indigo-600" size={18} />
                          <h3 className="text-lg font-semibold text-gray-800">Education</h3>
                        </div>
                        {editingField !== 'education' && isOwnProfile && (
                          <button
                            onClick={() => startEditing('education')}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Edit education"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                      </div>
                      {editingField === 'education' ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={tempFormData.education}
                            onChange={(e) => setTempFormData(prev => ({ ...prev, education: e.target.value }))}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-gray-900 bg-white transition-all"
                            placeholder="e.g., Bachelor's in Computer Science, MIT"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSave('education')}
                              disabled={loading}
                              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all font-medium disabled:opacity-50 text-sm"
                            >
                              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save'}
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all font-medium text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white/60 rounded-lg p-4 border border-gray-100">
                          <p className="text-gray-700">
                            {formData.education && formData.education.trim() !== ''
                              ? formData.education
                              : <span className="text-gray-400 italic">Not specified</span>}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Professional & Skills Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Skills */}
                  <div className="rounded-3xl bg-gradient-to-br from-white/90 to-orange-50/50 backdrop-blur-xl border border-gray-200/50 shadow-xl p-6 lg:p-8 transition-all duration-300 hover:shadow-2xl">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-orange-100 to-red-100 rounded-xl">
                          <Code className="text-orange-600" size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Skills</h2>
                      </div>
                      {editingField !== 'skills' && isOwnProfile && (
                        <button
                          onClick={() => startEditing('skills')}
                          className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all duration-300 hover:scale-110 transform"
                          title="Edit skills"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                    </div>

                    {editingField === 'skills' ? (
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                            placeholder="Add skill..."
                            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 text-gray-900 bg-white transition-all"
                          />
                          <button
                            onClick={handleAddSkill}
                            className="px-5 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl transition-all font-medium shadow-lg hover:shadow-xl"
                          >
                            Add
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                          {tempFormData.skills.map((skill, index) => (
                            <div key={index} className="flex items-center gap-2 bg-gradient-to-r from-orange-50 to-red-50 px-3 py-2 rounded-xl border border-orange-100 group">
                              <span className="text-gray-700 font-medium text-sm">{skill}</span>
                              <button
                                onClick={() => handleRemoveSkill(index)}
                                className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={() => handleSave('skills')}
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl transition-all font-medium disabled:opacity-50 shadow-lg hover:shadow-xl"
                          >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Save'}
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="flex-1 px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl transition-all font-medium shadow-lg hover:shadow-xl"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {formData.skills.length > 0 ? (
                          formData.skills.map((skill, index) => (
                            <span key={index} className="px-4 py-2 bg-gradient-to-r from-orange-50 to-red-50 text-gray-700 rounded-xl border border-orange-100 font-medium text-sm hover:shadow-md transition-all">
                              {skill}
                            </span>
                          ))
                        ) : (
                          <p className="text-gray-400 text-sm italic w-full text-center py-4">No skills added yet.</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Interests */}
                  <div className="rounded-3xl bg-gradient-to-br from-white/90 to-pink-50/50 backdrop-blur-xl border border-gray-200/50 shadow-xl p-6 lg:p-8 transition-all duration-300 hover:shadow-2xl">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-pink-100 to-rose-100 rounded-xl">
                          <Heart className="text-pink-600" size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Interests</h2>
                      </div>
                      {editingField !== 'interests' && isOwnProfile && (
                        <button
                          onClick={() => startEditing('interests')}
                          className="p-2 text-gray-500 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-all duration-300 hover:scale-110 transform"
                          title="Edit interests"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                    </div>

                    {editingField === 'interests' ? (
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newInterest}
                            onChange={(e) => setNewInterest(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddInterest()}
                            placeholder="Add interest..."
                            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 text-gray-900 bg-white transition-all"
                          />
                          <button
                            onClick={handleAddInterest}
                            className="px-5 py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white rounded-xl transition-all font-medium shadow-lg hover:shadow-xl"
                          >
                            Add
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                          {tempFormData.interests.map((interest, index) => (
                            <div key={index} className="flex items-center gap-2 bg-gradient-to-r from-pink-50 to-rose-50 px-3 py-2 rounded-xl border border-pink-100 group">
                              <span className="text-gray-700 font-medium text-sm">{interest}</span>
                              <button
                                onClick={() => handleRemoveInterest(index)}
                                className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={() => handleSave('interests')}
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl transition-all font-medium disabled:opacity-50 shadow-lg hover:shadow-xl"
                          >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Save'}
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="flex-1 px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl transition-all font-medium shadow-lg hover:shadow-xl"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {formData.interests.length > 0 ? (
                          formData.interests.map((interest, index) => (
                            <span key={index} className="px-4 py-2 bg-gradient-to-r from-pink-50 to-rose-50 text-gray-700 rounded-xl border border-pink-100 font-medium text-sm hover:shadow-md transition-all">
                              {interest}
                            </span>
                          ))
                        ) : (
                          <p className="text-gray-400 text-sm italic w-full text-center py-4">No interests added yet.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Learning Journey & Achievements Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Learning Journey */}
                  <div className="rounded-3xl bg-gradient-to-br from-white/90 to-purple-50/50 backdrop-blur-xl border border-gray-200/50 shadow-xl p-6 lg:p-8 transition-all duration-300 hover:shadow-2xl">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl">
                          <TrendingUp className="text-purple-600" size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Learning Journey</h2>
                      </div>
                      {editingField !== 'learningJourney' && isOwnProfile && (
                        <button
                          onClick={() => startEditing('learningJourney')}
                          className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all duration-300 hover:scale-110 transform"
                          title="Edit learning journey"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                    </div>

                    {editingField === 'learningJourney' ? (
                      <div className="space-y-4">
                        <textarea
                          value={tempFormData.learningJourney}
                          onChange={(e) => setTempFormData(prev => ({ ...prev, learningJourney: e.target.value }))}
                          className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-gray-900 min-h-[140px] resize-none bg-white transition-all"
                          placeholder="Tell us about your learning journey..."
                        />
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleSave('learningJourney')}
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl transition-all font-medium disabled:opacity-50 shadow-lg hover:shadow-xl"
                          >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Save'}
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="flex-1 px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl transition-all font-medium shadow-lg hover:shadow-xl"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-700 leading-relaxed bg-white/60 rounded-lg p-4 border border-gray-100 min-h-[100px]">
                        {formData.learningJourney && formData.learningJourney.trim() !== ''
                          ? formData.learningJourney
                          : <span className="text-gray-400 italic">No learning journey added yet.</span>}
                      </p>
                    )}
                  </div>

                  {/* Achievements */}
                  <div className="rounded-3xl bg-gradient-to-br from-white/90 to-yellow-50/50 backdrop-blur-xl border border-gray-200/50 shadow-xl p-6 lg:p-8 transition-all duration-300 hover:shadow-2xl">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-xl">
                          <Award className="text-yellow-600" size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Achievements</h2>
                      </div>
                      {editingField !== 'achievements' && isOwnProfile && (
                        <button
                          onClick={() => startEditing('achievements')}
                          className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-xl transition-all duration-300 hover:scale-110 transform"
                          title="Edit achievements"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                    </div>

                    {editingField === 'achievements' ? (
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newAchievement}
                            onChange={(e) => setNewAchievement(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddAchievement()}
                            placeholder="Add achievement..."
                            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500 text-gray-900 bg-white transition-all"
                          />
                          <button
                            onClick={handleAddAchievement}
                            className="px-5 py-3 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white rounded-xl transition-all font-medium shadow-lg hover:shadow-xl"
                          >
                            Add
                          </button>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                          {tempFormData.achievements.map((achievement, index) => (
                            <div key={index} className="flex items-center justify-between bg-gradient-to-r from-yellow-50 to-amber-50 px-4 py-3 rounded-xl border border-yellow-100 hover:border-yellow-200 transition-all group">
                              <span className="text-gray-700 flex-1 break-words font-medium text-sm">{achievement}</span>
                              <button
                                onClick={() => handleRemoveAchievement(index)}
                                className="text-red-500 hover:text-red-700 ml-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded-lg"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={() => handleSave('achievements')}
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl transition-all font-medium disabled:opacity-50 shadow-lg hover:shadow-xl"
                          >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Save'}
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="flex-1 px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl transition-all font-medium shadow-lg hover:shadow-xl"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                        {formData.achievements.length > 0 ? (
                          formData.achievements.map((achievement, index) => (
                            <div key={index} className="bg-gradient-to-r from-yellow-50 to-amber-50 px-4 py-3 rounded-xl border border-yellow-100 hover:border-yellow-200 transition-all hover:shadow-md">
                              <span className="text-gray-700 font-medium flex items-center gap-2 text-sm">
                                <Award size={14} className="text-yellow-600" />
                                {achievement}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <Award size={32} className="text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-400 text-sm">No achievements added yet.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats & Actions Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Quick Stats */}
                  <div className="rounded-3xl bg-gradient-to-br from-white/90 to-indigo-50/50 backdrop-blur-xl border border-gray-200/50 shadow-xl p-6 transition-all duration-300 hover:shadow-2xl">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                      <div className="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl">
                        <TrendingUp className="text-indigo-600" size={20} />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900">Quick Stats</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-100">
                        <p className="text-3xl font-bold text-purple-600 mb-1">{transformedPosts.length}</p>
                        <p className="text-sm text-gray-600 font-medium">Posts</p>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                        <p className="text-3xl font-bold text-green-600 mb-1">{friendsCount}</p>
                        <p className="text-sm text-gray-600 font-medium">Friends</p>
                      </div>
                    </div>
                  </div>

                  {/* Saved Posts Button - Only for own profile */}
                  {isOwnProfile && (
                    <div className="rounded-3xl bg-gradient-to-br from-white/90 to-purple-50/50 backdrop-blur-xl border border-gray-200/50 shadow-xl p-6 transition-all duration-300 hover:shadow-2xl">
                      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                        <div className="p-2 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl">
                          <Bookmark className="text-purple-600" size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
                      </div>
                      <button
                        onClick={() => navigate('/saved-posts')}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        <Bookmark size={20} />
                        <span>View Saved Posts</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'groups' && isOwnProfile && (
              <div className="rounded-3xl bg-white/80 backdrop-blur-xl border border-gray-200/50 shadow-xl p-6 sm:p-8 transition-all duration-300">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl">
                      <Users className="text-green-600" size={20} />
                    </div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      My Study Groups
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigate('/study-rooms')}
                      className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl transition-all duration-300 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      Browse All
                    </button>
                  </div>
                </div>
                {loadingStudyGroups ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                  </div>
                ) : userStudyGroups.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userStudyGroups.map((group) => (
                      <div
                        key={group._id}
                        onClick={() => navigate(`/study-rooms/${group._id}`)}
                        className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 hover:border-green-300 cursor-pointer transition-all duration-300 hover:shadow-xl group"
                      >
                        <div className="flex items-start gap-4">
                          {group.icon ? (
                            <img src={group.icon} alt={group.name} className="w-16 h-16 rounded-xl object-cover" />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                              {group.name[0]?.toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 text-lg mb-1 truncate group-hover:text-green-700 transition-colors">
                              {group.name}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{group.description || 'No description'}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span className="px-2 py-1 bg-white/60 rounded-md">{group.category || 'General'}</span>
                              <span>•</span>
                              <span>{group.members?.length || 0} members</span>
                            </div>
                            {group.tags && group.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {group.tags.slice(0, 3).map((tag, idx) => (
                                  <span key={idx} className="px-2 py-0.5 bg-white/60 rounded text-xs text-gray-600">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="inline-block p-6 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full mb-4">
                      <Users size={48} className="text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No study groups yet</h3>
                    <p className="text-gray-500 mb-6">Join study groups to collaborate and learn together!</p>
                    <button
                      onClick={() => navigate('/study-rooms')}
                      className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      Browse Study Groups
                    </button>
                  </div>
                )}
              </div>
            )}
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

      {/* Reels Viewer */}
      <ReelsViewer
        isOpen={isViewerOpen}
        onClose={() => {
          setIsViewerOpen(false);
        }}
        reels={userReels}
        initialIndex={selectedReelIndex}
        onReelDeleted={loadUserReels}
        onReelChange={(index) => {
          setSelectedReelIndex(index);
        }}
      />
    </div >
  );
};

export default Profile;

