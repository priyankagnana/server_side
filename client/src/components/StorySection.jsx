import React, { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import StoryViewer from './StoryViewer';

const StorySection = ({ onUploadStory }) => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedUserIndex, setSelectedUserIndex] = useState(0);
  const pollingIntervalRef = useRef(null);
  const lastETagRef = useRef(null);
  
  // Get current user
  const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
  const currentUserId = currentUser._id || currentUser.id;
  
  // Find current user's stories
  const myStories = stories.find(s => s.author.id === currentUserId || s.author.id?.toString() === currentUserId?.toString());

  useEffect(() => {
    fetchStories();

    // Start polling every 15 seconds when page is visible
    const startPolling = () => {
      if (pollingIntervalRef.current) return;
      
      pollingIntervalRef.current = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchStories(true); // true = silent update
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
        fetchStories(true); // Fetch immediately when page becomes visible
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

  const fetchStories = async (silent = false) => {
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

      const response = await fetch(`${API_BASE}/api/stories?t=${Date.now()}`, {
        headers
      });

      // Handle 304 Not Modified (no changes)
      if (response.status === 304) {
        // No changes - keep existing stories
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
          setStories(data.stories || []);
        }
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const handleStoryClick = (userStories, index) => {
    // Find the index of this user in the stories array
    const userIndex = stories.findIndex(
      s => s.author.id === userStories.author.id
    );
    if (userIndex !== -1) {
      setSelectedUserIndex(userIndex);
      setIsViewerOpen(true);
    }
  };

  const handleMyStoryClick = () => {
    if (myStories) {
      // If user has stories, open viewer
      const userIndex = stories.findIndex(
        s => s.author.id === currentUserId || s.author.id?.toString() === currentUserId?.toString()
      );
      if (userIndex !== -1) {
        setSelectedUserIndex(userIndex);
        setIsViewerOpen(true);
      }
    } else {
      // If no stories, open upload modal
      onUploadStory();
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide">
          <div className="text-gray-500 text-sm">Loading stories...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex gap-4 overflow-x-auto scrollbar-hide">
        {/* Your Story Button */}
        <div 
          className="flex flex-col items-center gap-2 min-w-[80px] cursor-pointer"
          onClick={handleMyStoryClick}
        >
          {myStories && myStories.stories.length > 0 ? (
            // Show story thumbnail if user has stories
            <div className="relative w-16 h-16 rounded-full p-0.5 bg-gradient-to-r from-purple-500 to-pink-500">
              <div className="w-full h-full rounded-full bg-white p-0.5 flex items-center justify-center overflow-hidden">
                {myStories.stories[0].thumbnailUrl ? (
                  <img
                    src={myStories.stories[0].thumbnailUrl}
                    alt="Your story"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : myStories.stories[0].mediaType === 'image' ? (
                  <img
                    src={myStories.stories[0].mediaUrl}
                    alt="Your story"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-semibold text-sm">
                    {myStories.author.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Show + icon if no stories
            <div className="relative w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center border-2 border-dashed border-gray-400 hover:border-purple-500 transition-colors">
              <Plus size={24} className="text-gray-600" />
            </div>
          )}
          <span className="text-xs text-gray-600 truncate w-full text-center">Your Story</span>
        </div>

        {/* User Stories - Filter out current user's stories */}
        {stories
          .filter(userStories => {
            // Exclude current user's stories from the list (they appear in "Your Story")
            const authorId = userStories.author.id?.toString() || userStories.author.id;
            const userId = currentUserId?.toString() || currentUserId;
            return authorId !== userId;
          })
          .map((userStories, index) => {
            const hasUnviewed = userStories.stories.some(story => !story.viewedByUser);
            const firstStory = userStories.stories[0];
            
            return (
              <div
                key={userStories.author.id}
                className="flex flex-col items-center gap-2 min-w-[80px] cursor-pointer"
                onClick={() => handleStoryClick(userStories, index)}
              >
                <div className={`relative w-16 h-16 rounded-full p-0.5 ${
                  hasUnviewed ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gray-300'
                }`}>
                  <div className="w-full h-full rounded-full bg-white p-0.5 flex items-center justify-center overflow-hidden">
                    {/* Show story thumbnail if available, otherwise fall back to profile picture */}
                    {firstStory?.thumbnailUrl ? (
                      <img
                        src={firstStory.thumbnailUrl}
                        alt={`${userStories.author.username}'s story`}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : firstStory?.mediaType === 'image' && firstStory?.mediaUrl ? (
                      <img
                        src={firstStory.mediaUrl}
                        alt={`${userStories.author.username}'s story`}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : userStories.author.profilePicture ? (
                      <img
                        src={userStories.author.profilePicture}
                        alt={userStories.author.username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-semibold text-sm">
                        {userStories.author.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-600 truncate w-full text-center">
                  {userStories.author.username}
                </span>
              </div>
            );
          })}
      </div>

      {/* Story Viewer Modal */}
      <StoryViewer
        isOpen={isViewerOpen}
        onClose={() => {
          setIsViewerOpen(false);
          // Refresh stories to update viewed status
          fetchStories();
        }}
        storiesData={stories}
        initialUserIndex={selectedUserIndex}
        onStoryDeleted={() => {
          // Refresh stories after deletion
          fetchStories();
        }}
      />
    </div>
  );
};

export default StorySection;

