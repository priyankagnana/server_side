import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Check, X, Users, BookOpen, Award } from 'lucide-react';
import DashboardNavbar from '../components/DashboardNavbar';
import { useToast } from '../components/Toast.jsx';

const FindStudyPartner = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingRequests, setProcessingRequests] = useState({});

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/users/all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUsers(data.users || []);
        } else {
          toast.error(data.message || 'Failed to fetch users');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleFriendRequest = async (userId, isFriend, friendRequestSent, friendRequestReceived) => {
    if (isFriend) {
      toast.info('You are already friends with this user');
      return;
    }

    if (friendRequestReceived) {
      // Accept the friend request
      handleAcceptRequest(userId);
      return;
    }

    if (friendRequestSent) {
      toast.info('Friend request already sent');
      return;
    }

    setProcessingRequests(prev => ({ ...prev, [userId]: true }));

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/users/friend-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Friend request sent successfully');
        // Update the user's status
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user._id === userId || user.id === userId
              ? { ...user, friendRequestSent: true }
              : user
          )
        );
      } else {
        toast.error(data.message || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error('Failed to send friend request');
    } finally {
      setProcessingRequests(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleAcceptRequest = async (userId) => {
    setProcessingRequests(prev => ({ ...prev, [userId]: true }));

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/users/friend-requests/${userId}/accept`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Friend request accepted');
        // Update the user's status
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user._id === userId || user.id === userId
              ? { ...user, isFriend: true, friendRequestReceived: false, friendRequestSent: false }
              : user
          )
        );
      } else {
        toast.error(data.message || 'Failed to accept friend request');
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast.error('Failed to accept friend request');
    } finally {
      setProcessingRequests(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleProfileClick = (userId) => {
    navigate(`/profile/${userId}`);
  };

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.username?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.learningJourney?.toLowerCase().includes(query) ||
      user.achievements?.some(achievement => achievement.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/feed')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back to Feed</span>
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-50 rounded-full">
              <Users className="text-green-600" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Find Study Partner</h1>
              <p className="text-sm text-gray-500 mt-1">
                Connect with students and find your perfect study partner
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-md mt-4">
            <input
              type="text"
              placeholder="Search by name, email, learning journey, or achievements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-500"
            />
          </div>
        </div>

        {/* Users Grid */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading users...</div>
        ) : filteredUsers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user) => {
              const userId = user._id || user.id;
              const username = user.username || user.email?.split('@')[0] || 'User';
              const profilePicture = user.profilePicture || '';
              const isProcessing = processingRequests[userId];

              return (
                <div
                  key={userId}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  {/* Profile Header */}
                  <div className="flex items-start gap-4 mb-4">
                    {profilePicture && profilePicture.trim() !== '' ? (
                      <img
                        src={profilePicture}
                        alt={username}
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleProfileClick(userId)}
                      />
                    ) : (
                      <div
                        className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white text-2xl font-semibold border-2 border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleProfileClick(userId)}
                      >
                        {username[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-green-600 transition-colors"
                        onClick={() => handleProfileClick(userId)}
                      >
                        {username}
                      </h3>
                      {user.email && (
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                      )}
                    </div>
                  </div>

                  {/* Learning Journey */}
                  {user.learningJourney && user.learningJourney.trim() !== '' && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen size={16} className="text-purple-600" />
                        <span className="text-sm font-medium text-gray-700">Learning Journey</span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {user.learningJourney}
                      </p>
                    </div>
                  )}

                  {/* Achievements */}
                  {user.achievements && user.achievements.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Award size={16} className="text-yellow-600" />
                        <span className="text-sm font-medium text-gray-700">Achievements</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {user.achievements.slice(0, 3).map((achievement, index) => (
                          <span
                            key={index}
                            className="text-xs px-2 py-1 bg-yellow-50 text-yellow-800 rounded-md"
                          >
                            {achievement}
                          </span>
                        ))}
                        {user.achievements.length > 3 && (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md">
                            +{user.achievements.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {user.isFriend ? (
                      <button
                        disabled
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-600 rounded-lg font-medium cursor-not-allowed"
                        style={{ border: 'none' }}
                      >
                        <Check size={18} />
                        <span>Friends</span>
                      </button>
                    ) : user.friendRequestReceived ? (
                      <button
                        onClick={() => handleAcceptRequest(userId)}
                        disabled={isProcessing}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        style={{ backgroundColor: '#22c55e', border: 'none' }}
                      >
                        <Check size={18} />
                        <span>{isProcessing ? 'Processing...' : 'Accept Request'}</span>
                      </button>
                    ) : user.friendRequestSent ? (
                      <button
                        disabled
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-400 text-white rounded-lg font-medium cursor-not-allowed"
                        style={{ border: 'none' }}
                      >
                        <UserPlus size={18} />
                        <span>Request Sent</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleFriendRequest(userId, user.isFriend, user.friendRequestSent, user.friendRequestReceived)}
                        disabled={isProcessing}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        style={{ backgroundColor: '#22c55e', border: 'none' }}
                      >
                        <UserPlus size={18} />
                        <span>{isProcessing ? 'Processing...' : 'Add as Friend'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Users className="text-gray-400" size={40} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-500">
              {searchQuery ? 'Try adjusting your search query' : 'No other users available at the moment.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FindStudyPartner;

