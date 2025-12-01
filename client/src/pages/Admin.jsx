import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardNavbar from '../components/DashboardNavbar';
import { 
  BarChart3, 
  Users, 
  FileText, 
  Video, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Trash2,
  Ban,
  Unlock,
  Plus,
  Eye,
  X
} from 'lucide-react';
import { useToast } from '../components/Toast.jsx';

const Admin = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('analytics');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Analytics
  const [analytics, setAnalytics] = useState(null);

  // Collaboration Board Requests
  const [collabRequests, setCollabRequests] = useState([]);
  const [collabLoading, setCollabLoading] = useState(false);

  // Events
  const [events, setEvents] = useState([]);
  const [eventRequests, setEventRequests] = useState([]);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: ''
  });

  // Reports
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportAction, setReportAction] = useState({
    actionTaken: 'none',
    adminNotes: ''
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchAnalytics();
      if (activeTab === 'collaboration') {
        fetchCollaborationRequests();
      } else if (activeTab === 'events') {
        fetchEvents();
        fetchEventRequests();
      } else if (activeTab === 'reports') {
        fetchReports();
      }
    }
  }, [isAdmin, activeTab]);

  const checkAdminAccess = async () => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      if (!token) {
        navigate('/login');
        return;
      }

      // First check stored user data (faster, no API call needed)
      try {
        const storedUserStr = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (storedUserStr) {
          const storedUser = JSON.parse(storedUserStr);
          if (storedUser.role === 'admin') {
            setUser(storedUser);
            setIsAdmin(true);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        // If stored user data is invalid, continue to API check
      }

      // If not found in stored data, fetch from API
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_BASE}/api/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          // Update stored user data with role
          const storage = localStorage.getItem('authToken') ? localStorage : sessionStorage;
          storage.setItem('user', JSON.stringify(data.user));
          
          if (data.user.role === 'admin') {
            setIsAdmin(true);
          } else {
            toast.error('Access denied. Admin only.');
            navigate('/feed');
          }
        } else {
          toast.error('Access denied. Admin only.');
          navigate('/feed');
        }
      } else {
        toast.error('Error checking access');
        navigate('/feed');
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      toast.error('Error checking access');
      navigate('/feed');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/admin/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAnalytics(data.analytics);
        }
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Error fetching analytics');
    }
  };

  const fetchCollaborationRequests = async () => {
    try {
      setCollabLoading(true);
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/admin/collaboration-board-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCollabRequests(data.requests);
        }
      }
    } catch (error) {
      console.error('Error fetching collaboration requests:', error);
      toast.error('Error fetching collaboration requests');
    } finally {
      setCollabLoading(false);
    }
  };

  const handleApproveCollaboration = async (id) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/admin/collaboration-board-requests/${id}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Collaboration request approved');
        fetchCollaborationRequests();
      } else {
        toast.error('Failed to approve request');
      }
    } catch (error) {
      console.error('Error approving collaboration request:', error);
      toast.error('Error approving request');
    }
  };

  const handleRejectCollaboration = async (id, reason = '') => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/admin/collaboration-board-requests/${id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        toast.success('Collaboration request rejected');
        fetchCollaborationRequests();
      } else {
        toast.error('Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting collaboration request:', error);
      toast.error('Error rejecting request');
    }
  };

  const fetchEvents = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/admin/events`, {
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
      toast.error('Error fetching events');
    }
  };

  const fetchEventRequests = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/admin/event-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEventRequests(data.requests);
        }
      }
    } catch (error) {
      console.error('Error fetching event requests:', error);
      toast.error('Error fetching event requests');
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/admin/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newEvent)
      });

      if (response.ok) {
        toast.success('Event created successfully');
        setIsCreateEventOpen(false);
        setNewEvent({ title: '', description: '', date: '', time: '', location: '' });
        fetchEvents();
      } else {
        toast.error('Failed to create event');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Error creating event');
    }
  };

  const handleApproveEventRequest = async (id) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/admin/event-requests/${id}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Event request approved');
        fetchEvents();
        fetchEventRequests();
      } else {
        toast.error('Failed to approve event request');
      }
    } catch (error) {
      console.error('Error approving event request:', error);
      toast.error('Error approving event request');
    }
  };

  const handleRejectEventRequest = async (id, reason = '') => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/admin/event-requests/${id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        toast.success('Event request rejected');
        fetchEventRequests();
      } else {
        toast.error('Failed to reject event request');
      }
    } catch (error) {
      console.error('Error rejecting event request:', error);
      toast.error('Error rejecting event request');
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/admin/events/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Event deleted successfully');
        fetchEvents();
      } else {
        toast.error('Failed to delete event');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Error deleting event');
    }
  };

  const fetchReports = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/admin/reports`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setReports(data.reports);
        }
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Error fetching reports');
    }
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setIsReportModalOpen(true);
  };

  const handleReviewReport = async () => {
    if (!selectedReport) return;

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/admin/reports/${selectedReport._id}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reportAction)
      });

      if (response.ok) {
        toast.success('Report reviewed');
        setIsReportModalOpen(false);
        setSelectedReport(null);
        setReportAction({ actionTaken: 'none', adminNotes: '' });
        fetchReports();
      } else {
        toast.error('Failed to review report');
      }
    } catch (error) {
      console.error('Error reviewing report:', error);
      toast.error('Error reviewing report');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/admin/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Post deleted successfully');
        fetchReports();
      } else {
        toast.error('Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Error deleting post');
    }
  };

  const handleDeleteReel = async (reelId) => {
    if (!window.confirm('Are you sure you want to delete this reel?')) return;

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/admin/reels/${reelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Reel deleted successfully');
        fetchReports();
      } else {
        toast.error('Failed to delete reel');
      }
    } catch (error) {
      console.error('Error deleting reel:', error);
      toast.error('Error deleting reel');
    }
  };

  const handleBanUser = async (userId, reason = '') => {
    if (!window.confirm('Are you sure you want to ban this user?')) return;

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/admin/users/${userId}/ban`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        toast.success('User banned successfully');
        fetchReports();
      } else {
        toast.error('Failed to ban user');
      }
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Error banning user');
    }
  };

  const handleUnbanUser = async (userId) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/admin/users/${userId}/unban`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('User unbanned successfully');
        fetchReports();
      } else {
        toast.error('Failed to unban user');
      }
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error('Error unbanning user');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Admin Panel</h1>

        {/* Tabs */}
        <div className="flex space-x-1 bg-white rounded-lg p-1 mb-6 shadow-sm">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="inline mr-2" size={18} />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('collaboration')}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'collaboration'
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText className="inline mr-2" size={18} />
            Collaboration Requests
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'events'
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Calendar className="inline mr-2" size={18} />
            Events
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'reports'
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <AlertTriangle className="inline mr-2" size={18} />
            Reports
          </button>
        </div>

        {/* Analytics Tab */}
        {activeTab === 'analytics' && analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900">{analytics.totalUsers}</p>
                </div>
                <Users className="text-purple-600" size={32} />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Posts</p>
                  <p className="text-3xl font-bold text-gray-900">{analytics.totalPosts}</p>
                </div>
                <FileText className="text-blue-600" size={32} />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Reels</p>
                  <p className="text-3xl font-bold text-gray-900">{analytics.totalReels}</p>
                </div>
                <Video className="text-pink-600" size={32} />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Engagement</p>
                  <p className="text-3xl font-bold text-gray-900">{analytics.totalEngagement}</p>
                </div>
                <BarChart3 className="text-green-600" size={32} />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Events</p>
                  <p className="text-3xl font-bold text-gray-900">{analytics.totalEvents}</p>
                </div>
                <Calendar className="text-orange-600" size={32} />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Banned Users</p>
                  <p className="text-3xl font-bold text-gray-900">{analytics.bannedUsers}</p>
                </div>
                <Ban className="text-red-600" size={32} />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Likes</p>
                  <p className="text-3xl font-bold text-gray-900">{analytics.totalLikes}</p>
                </div>
                <span className="text-2xl">❤️</span>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Comments</p>
                  <p className="text-3xl font-bold text-gray-900">{analytics.totalComments}</p>
                </div>
                <span className="text-2xl">💬</span>
              </div>
            </div>
          </div>
        )}

        {/* Collaboration Requests Tab */}
        {activeTab === 'collaboration' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Collaboration Board Requests</h2>
            {collabLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            ) : collabRequests.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No requests found</p>
            ) : (
              <div className="space-y-4">
                {collabRequests.map((request) => (
                  <div key={request._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {request.requester?.profilePicture ? (
                            <img
                              src={request.requester.profilePicture}
                              alt={request.requester.name}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white text-xs">
                              {request.requester?.name?.[0] || 'U'}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">{request.requester?.name || 'User'}</p>
                            <p className="text-xs text-gray-500">{request.requester?.email}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">Field:</span> {request.field}
                        </p>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">Category:</span> {request.category}
                        </p>
                        <p className="text-sm font-semibold text-gray-900 mb-1">{request.title}</p>
                        <p className="text-sm text-gray-600 mb-2">{request.description}</p>
                        {request.tags && request.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {request.tags.map((tag, idx) => (
                              <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-500">
                          Status: <span className={`font-medium ${
                            request.status === 'approved' ? 'text-green-600' :
                            request.status === 'rejected' ? 'text-red-600' :
                            'text-yellow-600'
                          }`}>{request.status}</span>
                        </p>
                      </div>
                      {request.status === 'pending' && (
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleApproveCollaboration(request._id)}
                            className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                          >
                            <CheckCircle size={16} className="inline mr-1" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectCollaboration(request._id)}
                            className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                          >
                            <XCircle size={16} className="inline mr-1" />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            {/* Create Event Button */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Events Management</h2>
              <button
                onClick={() => setIsCreateEventOpen(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <Plus size={18} />
                Create Event
              </button>
            </div>

            {/* Event Requests */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Requests</h3>
              {eventRequests.filter(r => r.status === 'pending').length === 0 ? (
                <p className="text-center py-4 text-gray-500">No pending event requests</p>
              ) : (
                <div className="space-y-4">
                  {eventRequests.filter(r => r.status === 'pending').map((request) => (
                    <div key={request._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 mb-1">{request.title}</p>
                          <p className="text-sm text-gray-600 mb-1">{request.description}</p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Date:</span> {new Date(request.date).toLocaleDateString()} at {request.time}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Location:</span> {request.location}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            Requested by: {request.requester?.name || 'User'}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleApproveEventRequest(request._id)}
                            className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                          >
                            <CheckCircle size={16} className="inline mr-1" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectEventRequest(request._id)}
                            className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                          >
                            <XCircle size={16} className="inline mr-1" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Existing Events */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Existing Events</h3>
              {events.length === 0 ? (
                <p className="text-center py-4 text-gray-500">No events found</p>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => (
                    <div key={event._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 mb-1">{event.title}</p>
                          <p className="text-sm text-gray-600 mb-1">{event.description}</p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Date:</span> {new Date(event.date).toLocaleDateString()} at {event.time}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Location:</span> {event.location}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteEvent(event._id)}
                          className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors ml-4"
                        >
                          <Trash2 size={16} className="inline mr-1" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Reports</h2>
            {reports.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No reports found</p>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            report.reportType === 'post' ? 'bg-blue-100 text-blue-700' :
                            report.reportType === 'reel' ? 'bg-pink-100 text-pink-700' :
                            report.reportType === 'chat' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {report.reportType.toUpperCase()}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            report.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            report.status === 'reviewed' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {report.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">Reason:</span> {report.reason}
                        </p>
                        {report.description && (
                          <p className="text-sm text-gray-600 mb-1">
                            <span className="font-medium">Description:</span> {report.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          Reported by: {report.reporter?.name || 'User'} • {new Date(report.createdAt).toLocaleString()}
                        </p>
                        {report.actionTaken !== 'none' && (
                          <p className="text-xs text-gray-500 mt-1">
                            Action: {report.actionTaken} • {report.adminNotes}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleViewReport(report)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                        >
                          <Eye size={16} className="inline mr-1" />
                          Review
                        </button>
                        {report.reportType === 'post' && report.reportedItem?._id && (
                          <button
                            onClick={() => handleDeletePost(report.reportedItem._id)}
                            className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                          >
                            <Trash2 size={16} className="inline mr-1" />
                            Delete Post
                          </button>
                        )}
                        {report.reportType === 'reel' && report.reportedItem?._id && (
                          <button
                            onClick={() => handleDeleteReel(report.reportedItem._id)}
                            className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                          >
                            <Trash2 size={16} className="inline mr-1" />
                            Delete Reel
                          </button>
                        )}
                        {report.reportType === 'user' && report.reportedItem?._id && (
                          <>
                            {report.reportedItem.isBanned ? (
                              <button
                                onClick={() => handleUnbanUser(report.reportedItem._id)}
                                className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                              >
                                <Unlock size={16} className="inline mr-1" />
                                Unban
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBanUser(report.reportedItem._id)}
                                className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                              >
                                <Ban size={16} className="inline mr-1" />
                                Ban
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {isCreateEventOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsCreateEventOpen(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Create Event</h3>
              <button
                onClick={() => setIsCreateEventOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateEvent}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    required
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    required
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreateEventOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Review Modal */}
      {isReportModalOpen && selectedReport && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsReportModalOpen(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Review Report</h3>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4 mb-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Report Type</p>
                <p className="text-sm text-gray-900">{selectedReport.reportType}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Reason</p>
                <p className="text-sm text-gray-900">{selectedReport.reason}</p>
              </div>
              {selectedReport.description && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                  <p className="text-sm text-gray-900">{selectedReport.description}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action Taken</label>
                <select
                  value={reportAction.actionTaken}
                  onChange={(e) => setReportAction({ ...reportAction, actionTaken: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                >
                  <option value="none">None</option>
                  <option value="deleted">Deleted</option>
                  <option value="user_banned">User Banned</option>
                  <option value="user_warned">User Warned</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
                <textarea
                  value={reportAction.adminNotes}
                  onChange={(e) => setReportAction({ ...reportAction, adminNotes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReviewReport}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;

