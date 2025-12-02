import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, MessageCircle, UserPlus, Shield } from 'lucide-react';
import NotificationsDropdown from './NotificationsDropdown';
import { useSocket } from '../contexts/SocketContext';

const DashboardNavbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  });
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '');
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const { socket } = useSocket();

  // Fetch user profile data to sync with database
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        
        if (!token) return;

        const response = await fetch(`${API_BASE}/api/users/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            // Update state
            setProfilePicture(data.user.profilePicture || '');
            setUser(prev => ({ ...prev, ...data.user }));
            setIsAdmin(data.user.role === 'admin');
            
            // Update localStorage/sessionStorage
            const storage = localStorage.getItem('authToken') ? localStorage : sessionStorage;
            const currentUser = JSON.parse(storage.getItem('user') || '{}');
            storage.setItem('user', JSON.stringify({ ...currentUser, ...data.user }));
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
    
    // Refresh profile data every 60 seconds
    const interval = setInterval(fetchUserProfile, 60000);
    
    // Refresh when window gains focus (user returns to tab)
    const handleFocus = () => {
      fetchUserProfile();
    };
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Fetch friend request count with polling
  useEffect(() => {
    const friendRequestCountETagRef = { current: null };
    const pollingIntervalRef = { current: null };

    const fetchFriendRequestCount = async (silent = false) => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        
        const headers = {
          'Authorization': `Bearer ${token}`
        };

        // Add If-None-Match header if we have a previous ETag
        if (friendRequestCountETagRef.current) {
          headers['If-None-Match'] = friendRequestCountETagRef.current;
        }

        const response = await fetch(`${API_BASE}/api/users/friend-requests?t=${Date.now()}`, {
          headers
        });

        // Handle 304 Not Modified (no changes)
        if (response.status === 304) {
          // No changes - keep existing count
          return;
        }

        if (response.ok) {
          // Store ETag for next request
          const etag = response.headers.get('ETag');
          if (etag) {
            friendRequestCountETagRef.current = etag;
          }

          const data = await response.json();
          if (data.success) {
            setFriendRequestCount(data.friendRequests?.length || 0);
          }
        }
      } catch (error) {
        console.error('Error fetching friend requests:', error);
      }
    };

    fetchFriendRequestCount();

    // Start polling every 20 seconds when page is visible
    const startPolling = () => {
      if (pollingIntervalRef.current) return;
      
      pollingIntervalRef.current = setInterval(() => {
        // Only poll if page is visible (not in background tab)
        if (document.visibilityState === 'visible') {
          fetchFriendRequestCount(true); // true = silent update
        }
      }, 20000); // Poll every 20 seconds
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
        fetchFriendRequestCount(true); // Fetch immediately when page becomes visible
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

  // Fetch notification count
  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        
        if (!token) return;

        const response = await fetch(`${API_BASE}/api/notifications/unread-count`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setNotificationCount(data.unreadCount);
          }
        }
      } catch (error) {
        console.error('Error fetching notification count:', error);
      }
    };

    fetchNotificationCount();

    // Poll every 30 seconds
    const interval = setInterval(fetchNotificationCount, 30000);

    // Listen for new notifications via socket
    if (socket) {
      const handleNewNotification = () => {
        fetchNotificationCount();
      };

      socket.on('new_notification', handleNewNotification);

      return () => {
        clearInterval(interval);
        socket.off('new_notification', handleNewNotification);
      };
    }

    return () => {
      clearInterval(interval);
    };
  }, [socket]);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate('/feed')}
          >
            <div className="flex items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-white"></div>
              </div>
              <div className="w-2 h-2 rounded-full bg-purple-500 -ml-2"></div>
            </div>
            <span className="text-xl font-bold text-gray-900">Campus Connect</span>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search students, clubs, events..."
                className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-100 text-gray-700 placeholder-gray-500"
                style={{ border: 'none' }}
              />
            </div>
          </div>

          {/* Right Icons */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div 
              className="relative cursor-pointer"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="text-gray-600 hover:text-purple-600 transition-colors" size={24} />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-semibold">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
              <NotificationsDropdown
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
              />
            </div>

            {/* Friend Requests */}
            <div 
              className="relative cursor-pointer"
              onClick={() => navigate('/requests')}
            >
              <UserPlus className="text-gray-600 hover:text-green-600 transition-colors" size={24} />
              {friendRequestCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-600 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-semibold">
                  {friendRequestCount > 9 ? '9+' : friendRequestCount}
                </span>
              )}
            </div>

            {/* Messages */}
            <div 
              className="relative cursor-pointer"
              onClick={() => navigate('/chat')}
            >
              <MessageCircle className="text-gray-600 hover:text-blue-600 transition-colors" size={24} />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full border-2 border-white"></span>
            </div>

            {/* Admin Panel */}
            {isAdmin && (
              <div 
                className="relative cursor-pointer"
                onClick={() => navigate('/admin')}
                title="Admin Panel"
              >
                <Shield className="text-gray-600 hover:text-red-600 transition-colors" size={24} />
              </div>
            )}

            {/* Profile */}
            <div 
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate('/profile')}
            >
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-semibold">
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default DashboardNavbar;

