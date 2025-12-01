import React, { useState, useEffect } from 'react';
import { Lightbulb, Code } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './Toast.jsx';
import { useSocket } from '../contexts/SocketContext.jsx';

const CollaborationBoard = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [interestedLoading, setInterestedLoading] = useState({});
  const [interestedPosts, setInterestedPosts] = useState(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem('collaborationInterestedPosts');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [requestForm, setRequestForm] = useState({
    field: '',
    category: '',
    title: '',
    description: '',
    tags: ''
  });

  useEffect(() => {
    fetchCollaborationPosts();
  }, []);

  const fetchCollaborationPosts = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/collaboration/posts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPosts(data.posts);
        }
      }
    } catch (error) {
      console.error('Error fetching collaboration posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const tagsArray = requestForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag);

      const response = await fetch(`${API_BASE}/api/collaboration/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          field: requestForm.field,
          category: requestForm.category,
          title: requestForm.title,
          description: requestForm.description,
          tags: tagsArray
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Collaboration request submitted! Admin will review it.');
          setIsRequestModalOpen(false);
          setRequestForm({ field: '', category: '', title: '', description: '', tags: '' });
        }
      } else {
        toast.error('Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting collaboration request:', error);
      toast.error('Error submitting request');
    }
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const then = new Date(date);
    const diffInSeconds = Math.floor((now - then) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getIcon = (category) => {
    if (category.toLowerCase().includes('code') || category.toLowerCase().includes('developer')) {
      return Code;
    }
    return Lightbulb;
  };

  const getIconColor = (category) => {
    if (category.toLowerCase().includes('code') || category.toLowerCase().includes('developer')) {
      return 'text-blue-600';
    }
    if (category.toLowerCase().includes('creative')) {
      return 'text-purple-600';
    }
    return 'text-yellow-600';
  };

  const handleInterested = async (post) => {
    const postId = post._id;
    
    // Check if user has already clicked interested on this post
    if (interestedPosts.has(postId)) {
      return;
    }

    const requesterId = post.requester?._id || post.requester?.id;
    if (!requesterId) {
      toast.error('Unable to find requester information');
      return;
    }

    setInterestedLoading(prev => ({ ...prev, [postId]: true }));

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      // Step 1: Create or get direct chat
      const chatResponse = await fetch(`${API_BASE}/api/chat/direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          otherUserId: requesterId
        })
      });

      if (!chatResponse.ok) {
        const errorData = await chatResponse.json();
        throw new Error(errorData.message || 'Failed to create chat');
      }

      const chatData = await chatResponse.json();
      if (!chatData.success || !chatData.room) {
        throw new Error('Failed to create chat');
      }

      const roomId = chatData.room._id || chatData.room.id;

      // Step 2: Join the room via socket if connected
      if (socket && isConnected) {
        socket.emit('join_room', roomId);
      }

      // Step 3: Send the message
      const messageContent = `I am interested in collaboration with you`;
      
      if (socket && isConnected) {
        // Send via socket
        socket.emit('send_message', {
          roomId: roomId,
          content: messageContent,
          messageType: 'text'
        });
        
        // Mark post as interested
        const newInterestedPosts = new Set(interestedPosts);
        newInterestedPosts.add(postId);
        setInterestedPosts(newInterestedPosts);
        // Save to localStorage
        localStorage.setItem('collaborationInterestedPosts', JSON.stringify(Array.from(newInterestedPosts)));
        
        toast.success('Message sent! Opening chat...');
        // Navigate to chat page after a short delay
        setTimeout(() => {
          navigate('/chat');
        }, 500);
      } else {
        // Fallback: Send via REST API
        const messageResponse = await fetch(`${API_BASE}/api/chat/conversations/${roomId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            content: messageContent,
            messageType: 'text'
          })
        });

        if (messageResponse.ok) {
          // Mark post as interested
          const newInterestedPosts = new Set(interestedPosts);
          newInterestedPosts.add(postId);
          setInterestedPosts(newInterestedPosts);
          // Save to localStorage
          localStorage.setItem('collaborationInterestedPosts', JSON.stringify(Array.from(newInterestedPosts)));
          
          toast.success('Message sent! Opening chat...');
          setTimeout(() => {
            navigate('/chat');
          }, 500);
        } else {
          throw new Error('Failed to send message');
        }
      }
    } catch (error) {
      console.error('Error handling interested:', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setInterestedLoading(prev => ({ ...prev, [postId]: false }));
    }
  };

  return (
    <>
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="text-red-600" size={20} />
          <h3 className="font-semibold text-gray-900">Collaboration Board</h3>
        </div>
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="text-sm text-purple-600 hover:underline cursor-pointer"
          >
            Post Request
          </button>
      </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No collaboration posts yet</div>
        ) : (
      <div className="space-y-4">
        {posts.map((post) => {
              const Icon = getIcon(post.category);
              const iconColor = getIconColor(post.category);
          return (
                <div key={post._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow relative">
              <div className="absolute top-3 right-3">
                    <Icon className={iconColor} size={20} />
              </div>
              
              <div className="flex items-start gap-3 mb-3">
                    {post.requester?.profilePicture ? (
                <img
                        src={post.requester.profilePicture}
                        alt={post.requester?.username || post.requester?.name || 'User'}
                  className="w-10 h-10 rounded-full object-cover"
                />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-semibold text-sm">
                        {(post.requester?.username || post.requester?.name || 'U')?.[0]?.toUpperCase()}
                      </div>
                    )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">
                          {post.requester?.username || post.requester?.name || 'User'}
                        </h4>
                    <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">{getTimeAgo(post.reviewedAt || post.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-600">{post.field}</p>
                  <span className="inline-block text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full mt-1">
                    {post.category}
                  </span>
                </div>
              </div>

              <h5 className="font-semibold text-gray-900 mb-2">{post.title}</h5>
              <p className="text-sm text-gray-600 mb-3">{post.description}</p>

                  {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {post.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
                  )}

                  <button 
                    onClick={() => handleInterested(post)}
                    disabled={interestedPosts.has(post._id) || interestedLoading[post._id]}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      interestedPosts.has(post._id)
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    {interestedLoading[post._id] 
                      ? 'Sending...' 
                      : interestedPosts.has(post._id) 
                        ? 'Message Sent' 
                        : 'Interested'}
              </button>
            </div>
          );
        })}
      </div>
        )}
      </div>

      {/* Request Modal */}
      {isRequestModalOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsRequestModalOpen(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Post Collaboration Request</h3>
            <form onSubmit={handleSubmitRequest}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Field</label>
                  <input
                    type="text"
                    required
                    value={requestForm.field}
                    onChange={(e) => setRequestForm({ ...requestForm, field: e.target.value })}
                    placeholder="e.g., Computer Science"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    required
                    value={requestForm.category}
                    onChange={(e) => setRequestForm({ ...requestForm, category: e.target.value })}
                    placeholder="e.g., Project Partner"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={requestForm.title}
                    onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })}
                    placeholder="e.g., Looking for Mobile App Developer"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    required
                    value={requestForm.description}
                    onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                    placeholder="Describe your collaboration need..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={requestForm.tags}
                    onChange={(e) => setRequestForm({ ...requestForm, tags: e.target.value })}
                    placeholder="React Native, Firebase, UI/UX"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
    </div>
      )}
    </>
  );
};

export default CollaborationBoard;

