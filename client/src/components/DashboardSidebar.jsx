import React, { useState, useEffect, useRef } from 'react';
import { Clock, Calendar, UserPlus, TrendingUp, BookOpen, Play, RotateCcw, HelpCircle, Coffee, Square, Hash, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
// import { useToast } from './Toast.jsx';
import ReelsViewer from './ReelsViewer';
import StudyGroupsSidebar from './StudyGroupsSidebar';

const DashboardSidebar = () => {
  const navigate = useNavigate();
  const [isBreakMode, setIsBreakMode] = useState(false);
  const [timer, setTimer] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [trendingReels, setTrendingReels] = useState([]);
  const [isReelsViewerOpen, setIsReelsViewerOpen] = useState(false);
  const [selectedReelIndex, setSelectedReelIndex] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const reelsContainerRef = useRef(null);
  const [suggestedFriends, setSuggestedFriends] = useState([]);
  const [loadingSuggestedFriends, setLoadingSuggestedFriends] = useState(true);

  // Update timer when mode changes
  useEffect(() => {
    if (isBreakMode) {
      setTimer(5 * 60); // 5 minutes for break
    } else {
      setTimer(25 * 60); // 25 minutes for focus
    }
    setIsRunning(false); // Reset running state when switching modes
  }, [isBreakMode]);

  // Timer countdown effect
  useEffect(() => {
    let interval = null;
    if (isRunning && timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => {
          if (prevTimer <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prevTimer - 1;
        });
      }, 1000);
    } else if (timer === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timer]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReset = () => {
    setIsRunning(false);
    if (isBreakMode) {
      setTimer(5 * 60);
    } else {
      setTimer(25 * 60);
    }
  };

  // Fetch suggested friends (users who are not friends)
  useEffect(() => {
    fetchSuggestedFriends();
  }, []);

  const fetchSuggestedFriends = async () => {
    try {
      setLoadingSuggestedFriends(true);
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/users/all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.users) {
          // Filter to show only users who are not friends and haven't sent/received requests
          const nonFriends = data.users.filter(user =>
            !user.isFriend &&
            !user.friendRequestSent &&
            !user.friendRequestReceived
          );
          // Limit to 10 suggestions
          setSuggestedFriends(nonFriends.slice(0, 10));
        }
      }
    } catch (error) {
      console.error('Error fetching suggested friends:', error);
    } finally {
      setLoadingSuggestedFriends(false);
    }
  };

  const handleSendFriendRequest = async (userId) => {
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

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update the user's status in the list
          setSuggestedFriends(prev =>
            prev.map(user =>
              user.id === userId || user._id === userId
                ? { ...user, friendRequestSent: true }
                : user
            )
          );
        }
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const [events, setEvents] = useState([]);
  const [isEventRequestModalOpen, setIsEventRequestModalOpen] = useState(false);
  const [eventRequestForm, setEventRequestForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: ''
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/events`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEvents(data.events);
        }
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleSubmitEventRequest = async (e) => {
    e.preventDefault();
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/events/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(eventRequestForm)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Show success message (you might want to use toast here)
          setIsEventRequestModalOpen(false);
          setEventRequestForm({ title: '', description: '', date: '', time: '', location: '' });
        }
      }
    } catch (error) {
      console.error('Error submitting event request:', error);
    }
  };

  const formatEventDate = (dateString, timeString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let dateStr = '';
    if (date.toDateString() === today.toDateString()) {
      dateStr = 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      dateStr = 'Tomorrow';
    } else {
      dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    return `${dateStr} • ${timeString}`;
  };

  const reelsPollingIntervalRef = useRef(null);
  const lastReelsETagRef = useRef(null);

  // Fetch trending reels (initial load - 3 reels)
  useEffect(() => {
    fetchTrendingReels(1);

    // Start polling every 20 seconds when page is visible
    const startPolling = () => {
      if (reelsPollingIntervalRef.current) return;

      reelsPollingIntervalRef.current = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchTrendingReels(1, false, true); // true = silent update
        }
      }, 20000); // Poll every 20 seconds
    };

    startPolling();

    // Stop polling when page is hidden, resume when visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (reelsPollingIntervalRef.current) {
          clearInterval(reelsPollingIntervalRef.current);
          reelsPollingIntervalRef.current = null;
        }
      } else {
        startPolling();
        fetchTrendingReels(1, false, true); // Fetch immediately when page becomes visible
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (reelsPollingIntervalRef.current) {
        clearInterval(reelsPollingIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchTrendingReels = async (page = 1, append = false, silent = false) => {
    if (loadingMore && !silent) return;

    if (!silent) {
      setLoadingMore(true);
    }
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const headers = {
        'Authorization': `Bearer ${token}`
      };

      // Add If-None-Match header if we have a previous ETag (only for first page)
      if (page === 1 && lastReelsETagRef.current) {
        headers['If-None-Match'] = lastReelsETagRef.current;
      }

      const response = await fetch(`${API_BASE}/api/reels?page=${page}&limit=3&t=${Date.now()}`, {
        headers
      });

      // Handle 304 Not Modified (no changes) - only for first page
      if (page === 1 && response.status === 304) {
        // No changes - keep existing reels
        return;
      }

      if (response.ok) {
        // Store ETag for next request (only for first page)
        if (page === 1) {
          const etag = response.headers.get('ETag');
          if (etag) {
            lastReelsETagRef.current = etag;
          }
        }

        const data = await response.json();
        if (data.success && data.reels) {
          if (append) {
            setTrendingReels(prev => [...prev, ...data.reels]);
          } else {
            setTrendingReels(data.reels);
          }

          // Check if there are more reels to load
          setHasMore(data.reels.length === 3);
        }
      }
    } catch (error) {
      console.error('Error fetching trending reels:', error);
    } finally {
      if (!silent) {
        setLoadingMore(false);
      }
    }
  };

  // Handle scroll for lazy loading
  useEffect(() => {
    const container = reelsContainerRef.current;
    if (!container || !hasMore) return;

    const handleScroll = () => {
      if (loadingMore) return;

      const { scrollLeft, scrollWidth, clientWidth } = container;
      const scrollPercentage = (scrollLeft + clientWidth) / scrollWidth;

      // Load more when user scrolls to 80% of the container
      if (scrollPercentage > 0.8 && hasMore && !loadingMore) {
        const nextPage = currentPage + 1;
        setCurrentPage(nextPage);
        fetchTrendingReels(nextPage, true);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, currentPage]);

  const handleReelClick = (reelIndex) => {
    setSelectedReelIndex(reelIndex);
    setIsReelsViewerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Focus Timer */}
      <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-sm p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="text-white" size={20} />
            <h3 className="font-semibold">Focus Timer</h3>
          </div>
          <button
            onClick={() => setIsBreakMode(!isBreakMode)}
            className="text-sm px-3 py-1.5 rounded-lg transition-all backdrop-blur-md bg-white/20 hover:bg-white/30 border border-white/30"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', border: 'none' }}
          >
            {isBreakMode ? (
              <>
                <Clock size={14} className="inline mr-1" />
                Switch to Focus
              </>
            ) : (
              <>
                <Coffee size={14} className="inline mr-1" />
                Switch to Break
              </>
            )}
          </button>
        </div>
        <div className="mb-4">
          <div className="flex justify-center mb-3">
            <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg flex items-center gap-2">
              {isBreakMode ? (
                <>
                  <span>☕</span>
                  <p className="text-sm font-medium">Break Time</p>
                </>
              ) : (
                <>
                  <span>🎯</span>
                  <p className="text-sm font-medium">Focus Mode</p>
                </>
              )}
            </div>
          </div>
          <p className="text-7xl font-bold mb-2 text-center">{formatTime(timer)}</p>
          <p className="text-sm text-purple-100 text-center">
            {isBreakMode ? 'Take a well-deserved break' : 'Time to concentrate on your studies'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="flex-1 px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            style={{
              backgroundColor: '#ffffff',
              color: '#9333EA',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {isRunning ? (
              <>
                <Square size={18} fill="#9333EA" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Play size={18} fill="#9333EA" />
                <span>Start</span>
              </>
            )}
          </button>
          <button
            onClick={handleReset}
            className="w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-105 shadow-md"
            style={{
              backgroundColor: '#a855f7',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={22} style={{ color: '#ffffff' }} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="text-blue-600" size={20} />
            <h3 className="font-bold text-gray-900">Upcoming Events</h3>
          </div>
          <button
            onClick={() => setIsEventRequestModalOpen(true)}
            className="text-xs text-blue-600 hover:underline"
          >
            Request Event
          </button>
        </div>
        <div className="space-y-3">
          {events.length === 0 ? (
            <p className="text-center py-4 text-gray-500 text-sm">No upcoming events</p>
          ) : (
            events.map((event) => (
              <div
                key={event._id}
                className="bg-gray-100 rounded-lg p-3 shadow-sm"
              >
                <h4 className="font-bold text-gray-900 mb-2">{event.title}</h4>
                {event.description && (
                  <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock size={14} className="text-gray-500" />
                    <span>{formatEventDate(event.date, event.time)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-gray-500">📍</span>
                    <span>{event.location}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Event Request Modal */}
      {isEventRequestModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsEventRequestModalOpen(false);
            }
          }}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Request Event</h3>
            <form onSubmit={handleSubmitEventRequest}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={eventRequestForm.title}
                    onChange={(e) => setEventRequestForm({ ...eventRequestForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={eventRequestForm.description}
                    onChange={(e) => setEventRequestForm({ ...eventRequestForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={eventRequestForm.date}
                    onChange={(e) => setEventRequestForm({ ...eventRequestForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 cursor-pointer"
                    style={{ colorScheme: 'light' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    required
                    value={eventRequestForm.time}
                    onChange={(e) => setEventRequestForm({ ...eventRequestForm, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 cursor-pointer"
                    style={{ colorScheme: 'light' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    required
                    value={eventRequestForm.location}
                    onChange={(e) => setEventRequestForm({ ...eventRequestForm, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEventRequestModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suggested Friends */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="text-purple-600" size={20} />
          <h3 className="font-semibold text-gray-900">Suggested Friends</h3>
        </div>
        {loadingSuggestedFriends ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            Loading...
          </div>
        ) : suggestedFriends.length > 0 ? (
          <div className="space-y-3" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {suggestedFriends.map((user) => (
              <div key={user.id || user._id} className="flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {user.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt={user.username}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm truncate">{user.username || 'User'}</p>
                    {user.email && (
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleSendFriendRequest(user.id || user._id)}
                  disabled={user.friendRequestSent}
                  className="bg-purple-600 text-white px-4 py-1 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex-shrink-0 ml-2"
                  style={{ border: 'none' }}
                >
                  {user.friendRequestSent ? 'Sent' : 'Add'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 text-sm">
            No suggestions available
          </div>
        )}
      </div>

      {/* Trending Reels */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-pink-500" size={20} />
            <h3 className="font-semibold text-gray-900">Trending Reels</h3>
          </div>
          {trendingReels.length > 0 && (
            <button
              onClick={() => navigate('/reels')}
              className="text-xs text-purple-600 hover:text-purple-700 font-medium cursor-pointer"
              style={{ border: 'none', backgroundColor: 'transparent' }}
            >
              View All
            </button>
          )}
        </div>
        <div>
          {trendingReels.length > 0 ? (
            <div
              ref={reelsContainerRef}
              className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
              style={{
                scrollBehavior: 'smooth'
              }}
            >
              {trendingReels.map((reel, index) => (
                <div
                  key={reel.id || index}
                  className="flex-shrink-0 w-32 h-48 bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative group"
                  onClick={() => handleReelClick(index)}
                >
                  {reel.thumbnailUrl ? (
                    <img
                      src={reel.thumbnailUrl}
                      alt={reel.caption || 'Reel'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                      <Play size={24} className="text-white" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Play size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {/* Like count overlay */}
                  {reel.likes > 0 && (
                    <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1 text-white text-xs bg-black/50 rounded px-1.5 py-0.5">
                      <span>❤️</span>
                      <span>{reel.likes}</span>
                    </div>
                  )}
                </div>
              ))}
              {loadingMore && (
                <div className="flex-shrink-0 w-32 h-48 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 text-sm">
              No reels yet
            </div>
          )}
        </div>
      </div>

      {/* Reels Viewer */}
      <ReelsViewer
        isOpen={isReelsViewerOpen}
        onClose={() => setIsReelsViewerOpen(false)}
        reels={trendingReels}
        initialIndex={selectedReelIndex}
      />

      {/* Study Groups Sidebar */}
      <StudyGroupsSidebar />
    </div>
  );
};

export default DashboardSidebar;

