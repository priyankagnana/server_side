import React, { useState, useEffect, useRef } from 'react';
import DashboardNavbar from '../components/DashboardNavbar';
import StorySection from '../components/StorySection';
import ActionButtons from '../components/ActionButtons';
import CollaborationBoard from '../components/CollaborationBoard';
import PostCard from '../components/PostCard';
import DashboardSidebar from '../components/DashboardSidebar';
import CreatePostModal from '../components/CreatePostModal';
import UploadReelModal from '../components/UploadReelModal';
import UploadStoryModal from '../components/UploadStoryModal';
import { useToast } from '../components/Toast.jsx';

const Feed = () => {
  const toast = useToast();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isUploadReelOpen, setIsUploadReelOpen] = useState(false);
  const [isUploadStoryOpen, setIsUploadStoryOpen] = useState(false);
  const pollingIntervalRef = useRef(null);
  const lastETagRef = useRef(null);

  // Initial fetch and setup polling
  useEffect(() => {
    fetchPosts();

    // Start polling every 10 seconds when page is visible
    const startPolling = () => {
      if (pollingIntervalRef.current) return;
      
      pollingIntervalRef.current = setInterval(() => {
        // Only poll if page is visible (not in background tab)
        if (document.visibilityState === 'visible') {
          fetchPosts(true); // true = silent update
        }
      }, 10000); // Poll every 10 seconds
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
        fetchPosts(true); // Fetch immediately when page becomes visible
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

  const fetchPosts = async (silent = false) => {
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

      const response = await fetch(`${API_BASE}/api/posts?t=${Date.now()}`, {
        headers
      });

      // Handle 304 Not Modified (no changes)
      if (response.status === 304) {
        // No changes - keep existing posts
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
          setPosts(prevPosts => {
            // Smart merge: only update if there are actual changes
            const newPostIds = new Set(data.posts.map(p => p.id));
            const prevPostIds = new Set(prevPosts.map(p => p.id));
            
            // Check if there are new or deleted posts
            const hasNewPosts = data.posts.some(p => !prevPostIds.has(p.id));
            const hasDeletedPosts = prevPosts.some(p => !newPostIds.has(p.id));
            
            // Only update if there are changes (avoid unnecessary re-renders)
            if (hasNewPosts || hasDeletedPosts || !silent) {
              return data.posts;
            }
            return prevPosts;
          });
        }
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const handleCreatePost = async (postData) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(postData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Post created successfully!');
          // Refresh posts to show new post
          fetchPosts();
        }
      }
    } catch (error) {
      console.error('Error creating post:', error);
    }
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
    savedByUser: post.savedByUser || false,
    firstLiker: post.firstLiker || null,
    otherLikesCount: post.otherLikesCount || 0,
    comments: post.comments || 0,
    pinnedToProfile: post.pinnedToProfile || false
  }));

  const handlePostDelete = (postId) => {
    setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
  };

  const handleUploadReel = async (reelData) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/reels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reelData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Reel uploaded successfully!');
          // Optionally refresh or navigate to reels page
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to upload reel');
      }
    } catch (error) {
      console.error('Error uploading reel:', error);
      toast.error('Failed to upload reel');
    }
  };

  const handleUploadStory = async (storyData) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(storyData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Story uploaded successfully!');
          // Story will be added via socket event, no need to refresh
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to upload story');
      }
    } catch (error) {
      console.error('Error uploading story:', error);
      toast.error('Failed to upload story');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <DashboardNavbar />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Feed */}
          <div className="lg:col-span-2">
            {/* Stories */}
            <StorySection onUploadStory={() => setIsUploadStoryOpen(true)} />

            {/* Action Buttons */}
            <ActionButtons 
              onCreatePost={() => setIsCreatePostOpen(true)}
              onUploadReel={() => setIsUploadReelOpen(true)}
              onUploadStory={() => setIsUploadStoryOpen(true)}
            />

            {/* Collaboration Board */}
            <CollaborationBoard />

            {/* Feed Posts */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Feed</h2>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading posts...</div>
              ) : transformedPosts.length > 0 ? (
                transformedPosts.map((post) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    onDelete={handlePostDelete}
                    onRefresh={fetchPosts}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">No posts yet. Be the first to share!</div>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1">
            <DashboardSidebar />
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onSubmit={handleCreatePost}
      />

      {/* Upload Reel Modal */}
      <UploadReelModal
        isOpen={isUploadReelOpen}
        onClose={() => setIsUploadReelOpen(false)}
        onSubmit={handleUploadReel}
      />

      {/* Upload Story Modal */}
      <UploadStoryModal
        isOpen={isUploadStoryOpen}
        onClose={() => setIsUploadStoryOpen(false)}
        onSubmit={handleUploadStory}
      />
    </div>
  );
};

export default Feed;

