import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, ArrowLeft, Video } from 'lucide-react';
import DashboardNavbar from '../components/DashboardNavbar';
import PostCard from '../components/PostCard';
import ReelsViewer from '../components/ReelsViewer';
import { useToast } from '../components/Toast.jsx';

const SavedPosts = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' or 'reels'
  const [posts, setPosts] = useState([]);
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isReelsViewerOpen, setIsReelsViewerOpen] = useState(false);
  const [selectedReelIndex, setSelectedReelIndex] = useState(0);

  useEffect(() => {
    if (activeTab === 'posts') {
      fetchSavedPosts();
    } else {
      fetchSavedReels();
    }
  }, [activeTab]);

  const fetchSavedPosts = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/users/saved-posts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPosts(data.posts || []);
        } else {
          toast.error(data.message || 'Failed to fetch saved posts');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to fetch saved posts');
      }
    } catch (error) {
      console.error('Error fetching saved posts:', error);
      toast.error('Failed to fetch saved posts');
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedReels = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/users/saved-reels`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setReels(data.reels || []);
        } else {
          toast.error(data.message || 'Failed to fetch saved reels');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to fetch saved reels');
      }
    } catch (error) {
      console.error('Error fetching saved reels:', error);
      toast.error('Failed to fetch saved reels');
    } finally {
      setLoading(false);
    }
  };

  const handlePostDelete = (postId) => {
    setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
  };

  const handleReelClick = (reelIndex) => {
    setSelectedReelIndex(reelIndex);
    setIsReelsViewerOpen(true);
  };

  // Transform posts for PostCard component
  const transformedPosts = posts.map(post => ({
    id: post.id,
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
    savedByUser: true, // All posts here are saved
    firstLiker: post.firstLiker || null,
    otherLikesCount: post.otherLikesCount || 0,
    comments: post.comments || 0,
    pinnedToProfile: post.pinnedToProfile || false
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back to Profile</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 rounded-full">
              <Bookmark className="text-purple-600" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Saved</h1>
              <p className="text-sm text-gray-500 mt-1">
                {activeTab === 'posts' 
                  ? `${posts.length} ${posts.length === 1 ? 'saved post' : 'saved posts'}`
                  : `${reels.length} ${reels.length === 1 ? 'saved reel' : 'saved reels'}`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('posts')}
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                activeTab === 'posts'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              style={{ backgroundColor: 'transparent', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
            >
              Posts
            </button>
            <button
              onClick={() => setActiveTab('reels')}
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                activeTab === 'reels'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              style={{ backgroundColor: 'transparent', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
            >
              Reels
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : activeTab === 'posts' ? (
          // Posts Tab
          transformedPosts.length > 0 ? (
            <div className="space-y-4">
              {transformedPosts.map((post) => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  onDelete={handlePostDelete}
                  onRefresh={fetchSavedPosts}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Bookmark className="text-gray-400" size={40} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No saved posts</h3>
              <p className="text-gray-500">Posts you save will appear here.</p>
            </div>
          )
        ) : (
          // Reels Tab
          reels.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {reels.map((reel, index) => (
                <div
                  key={reel.id}
                  className="aspect-square bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative group"
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
                      <Video size={24} className="text-white" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Video size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 text-white text-xs">
                    <span>❤️ {reel.likes || 0}</span>
                    <span>💬 {reel.comments || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Video className="text-gray-400" size={40} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No saved reels</h3>
              <p className="text-gray-500">Reels you save will appear here.</p>
            </div>
          )
        )}
      </div>

      {/* Reels Viewer */}
      <ReelsViewer
        isOpen={isReelsViewerOpen}
        onClose={() => setIsReelsViewerOpen(false)}
        reels={reels}
        initialIndex={selectedReelIndex}
        onReelDeleted={fetchSavedReels}
      />
    </div>
  );
};

export default SavedPosts;
