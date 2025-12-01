import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Check, X } from 'lucide-react';
import DashboardNavbar from '../components/DashboardNavbar';
import { useToast } from '../components/Toast.jsx';

const Requests = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [friendRequests, setFriendRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const pollingIntervalRef = useRef(null);
  const lastETagRef = useRef(null);

  useEffect(() => {
    fetchFriendRequests();

    // Start polling every 15 seconds when page is visible
    const startPolling = () => {
      if (pollingIntervalRef.current) return;
      
      pollingIntervalRef.current = setInterval(() => {
        // Only poll if page is visible (not in background tab)
        if (document.visibilityState === 'visible') {
          fetchFriendRequests(true); // true = silent update
        }
      }, 15000); // Poll every 15 seconds
    };

    startPolling();

    // Stop polling when page is hidden, resume when visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      } else {
        startPolling();
        fetchFriendRequests(true); // Fetch immediately when page becomes visible
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchFriendRequests = async (silent = false) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const headers = {
        'Authorization': `Bearer ${token}`
      };

      // Add If-None-Match header if we have a previous ETag
      if (lastETagRef.current) {
        headers['If-None-Match'] = lastETagRef.current;
      }

      const response = await fetch(`${API_BASE}/api/users/friend-requests?t=${Date.now()}`, {
        headers
      });

      // Handle 304 Not Modified (no changes)
      if (response.status === 304) {
        // No changes - keep existing friend requests
        return;
      }

      if (response.ok) {
        // Store ETag for next request
        const etag = response.headers.get('ETag');
        if (etag) {
          lastETagRef.current = etag;
        }

        const data = await response.json();
        if (data.success) {
          setFriendRequests(prevRequests => {
            // Smart merge: only update if there are actual changes
            const newRequestIds = new Set((data.friendRequests || []).map(r => (r._id || r.id).toString()));
            const prevRequestIds = new Set(prevRequests.map(r => (r._id || r.id).toString()));
            
            // Check if there are new or removed requests
            const hasNewRequests = (data.friendRequests || []).some(r => !prevRequestIds.has((r._id || r.id).toString()));
            const hasRemovedRequests = prevRequests.some(r => !newRequestIds.has((r._id || r.id).toString()));
            
            // Only update if there are changes (avoid unnecessary re-renders)
            if (hasNewRequests || hasRemovedRequests || !silent) {
              return data.friendRequests || [];
            }
            return prevRequests;
          });
        }
      }
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      if (!silent) {
        toast.error('Failed to load friend requests');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const handleAccept = async (userId) => {
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
        // Remove from list
        setFriendRequests(prev => prev.filter(req => req._id !== userId && req.id !== userId));
        // Refresh friend requests
        fetchFriendRequests();
      } else {
        toast.error(data.message || 'Failed to accept friend request');
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast.error('Failed to accept friend request');
    }
  };

  const handleReject = async (userId) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/users/friend-requests/${userId}/reject`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Friend request rejected');
        // Remove from list
        setFriendRequests(prev => prev.filter(req => req._id !== userId && req.id !== userId));
        // Refresh friend requests
        fetchFriendRequests();
      } else {
        toast.error(data.message || 'Failed to reject friend request');
      }
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toast.error('Failed to reject friend request');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/feed')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back to Feed</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 rounded-full">
              <UserPlus className="text-green-600" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Friend Requests</h1>
              <p className="text-sm text-gray-500 mt-1">
                {friendRequests.length} {friendRequests.length === 1 ? 'request' : 'requests'}
              </p>
            </div>
          </div>
        </div>

        {/* Friend Requests List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading friend requests...</div>
        ) : friendRequests.length > 0 ? (
          <div className="space-y-4">
            {friendRequests.map((request) => {
              const userId = request._id || request.id;
              const username = request.username || request.email?.split('@')[0] || 'User';
              const profilePicture = request.profilePicture || '';

              return (
                <div
                  key={userId}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between"
                >
                  <div 
                    className="flex items-center gap-4 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => navigate(`/profile/${userId}`)}
                  >
                    {/* Profile Picture */}
                    {profilePicture && profilePicture.trim() !== '' ? (
                      <img
                        src={profilePicture}
                        alt={username}
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white text-2xl font-semibold border-2 border-gray-200">
                        {username[0]?.toUpperCase() || 'U'}
                      </div>
                    )}

                    {/* User Info */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{username}</h3>
                      {request.email && (
                        <p className="text-sm text-gray-500">{request.email}</p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleAccept(userId)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
                    >
                      <Check size={18} />
                      <span>Accept</span>
                    </button>
                    <button
                      onClick={() => handleReject(userId)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
                    >
                      <X size={18} />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <UserPlus className="text-gray-400" size={40} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No friend requests</h3>
            <p className="text-gray-500">You don't have any pending friend requests at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Requests;

