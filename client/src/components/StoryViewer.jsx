import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, MoreVertical, Trash2 } from 'lucide-react';
import { useToast } from './Toast.jsx';
import Dialog from './Dialog.jsx';

const StoryViewer = ({ isOpen, onClose, storiesData, initialUserIndex = 0, onStoryDeleted }) => {
  const toast = useToast();
  const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [storyDuration, setStoryDuration] = useState(5000); // Default 5 seconds for images
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const progressIntervalRef = useRef(null);
  const viewTrackedRef = useRef(false);
  const videoRef = useRef(null);
  const hasAdvancedRef = useRef(false);
  const menuRef = useRef(null);

  const currentUserStories = storiesData[currentUserIndex];
  const currentStory = currentUserStories?.stories[currentStoryIndex];
  
  // Get current user
  const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
  const currentUserId = currentUser._id || currentUser.id;
  const isOwnStory = currentUserStories?.author?.id === currentUserId || 
                     currentUserStories?.author?.id?.toString() === currentUserId?.toString();

  // Reset to first story when viewer opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStoryIndex(0);
      setCurrentUserIndex(initialUserIndex);
    }
  }, [isOpen, initialUserIndex]);

  const handleNextStory = useCallback(() => {
    if (!currentUserStories) return;
    if (currentStoryIndex < currentUserStories.stories.length - 1) {
      // Next story in same user's stories
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else if (currentUserIndex < storiesData.length - 1) {
      // Next user's first story
      setCurrentUserIndex(currentUserIndex + 1);
      setCurrentStoryIndex(0);
    } else {
      // Last story, close viewer
      onClose();
    }
  }, [currentUserStories, currentStoryIndex, currentUserIndex, storiesData.length, onClose]);

  // Get video duration when video loads
  useEffect(() => {
    if (!currentStory || currentStory.mediaType !== 'video') {
      // For images, use 5 seconds
      setStoryDuration(5000);
      return;
    }

    if (videoRef.current) {
      const handleLoadedMetadata = () => {
        if (videoRef.current) {
          let duration = videoRef.current.duration * 1000; // Convert to milliseconds
          
          // Cap duration between 15-30 seconds (15000-30000ms)
          if (duration < 15000) {
            duration = 15000; // Minimum 15 seconds
          } else if (duration > 30000) {
            duration = 30000; // Maximum 30 seconds
          }
          
          setStoryDuration(duration);
        }
      };

      videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      
      // If metadata is already loaded
      if (videoRef.current.readyState >= 1) {
        handleLoadedMetadata();
      }

      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        }
      };
    }
  }, [currentStory]);

  // Track view when story first loads
  useEffect(() => {
    if (!isOpen || !currentStory) return;

    const trackView = async () => {
      if (viewTrackedRef.current) return;
      viewTrackedRef.current = true;

      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

        await fetch(`${API_BASE}/api/stories/${currentStory.id}/view`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        console.error('Error tracking view:', error);
      }
    };

    trackView();
  }, [isOpen, currentUserIndex, currentStoryIndex, currentStory]);

  // Reset story when it changes (new story index)
  useEffect(() => {
    if (!isOpen || !currentStory) return;

    // Reset progress and flags when story changes
    setProgress(0);
    viewTrackedRef.current = false;
    hasAdvancedRef.current = false;
    setIsPlaying(true);

    // Reset video to start when story changes
    if (videoRef.current && currentStory.mediaType === 'video') {
      videoRef.current.currentTime = 0;
    }
  }, [isOpen, currentUserIndex, currentStoryIndex, currentStory?.id]);

  // Sync progress bar with video playback time
  useEffect(() => {
    if (!isOpen || !currentStory) return;

    // For images, use timer-based progress
    if (currentStory.mediaType === 'image') {
      if (isPlaying) {
        const duration = storyDuration;
        const interval = 100;
        let elapsed = 0;

        progressIntervalRef.current = setInterval(() => {
          elapsed += interval;
          const newProgress = (elapsed / duration) * 100;
          setProgress(newProgress);

          if (newProgress >= 100) {
            clearInterval(progressIntervalRef.current);
            if (!hasAdvancedRef.current) {
              hasAdvancedRef.current = true;
              handleNextStory();
            }
          }
        }, interval);
      } else {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      }
    } else {
      // For videos, sync with video's currentTime
      if (videoRef.current) {
        const updateProgress = () => {
          if (videoRef.current && currentStory.mediaType === 'video') {
            const currentTime = videoRef.current.currentTime;
            const duration = videoRef.current.duration || storyDuration / 1000;
            const newProgress = (currentTime / duration) * 100;
            setProgress(newProgress);

            // Check if video ended
            if (videoRef.current.ended && !hasAdvancedRef.current) {
              hasAdvancedRef.current = true;
              handleNextStory();
            }
          }
        };

        // Update progress based on video timeupdate event
        videoRef.current.addEventListener('timeupdate', updateProgress);

        return () => {
          if (videoRef.current) {
            videoRef.current.removeEventListener('timeupdate', updateProgress);
          }
        };
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isOpen, currentStory, isPlaying, storyDuration, handleNextStory]);

  const handlePreviousStory = () => {
    if (currentStoryIndex > 0) {
      // Previous story in same user's stories
      setCurrentStoryIndex(currentStoryIndex - 1);
    } else if (currentUserIndex > 0) {
      // Previous user's last story
      const prevUserIndex = currentUserIndex - 1;
      setCurrentUserIndex(prevUserIndex);
      setCurrentStoryIndex(storiesData[prevUserIndex].stories.length - 1);
    }
  };

  const handleJumpToStory = (storyIndex) => {
    if (storyIndex >= 0 && storyIndex < currentUserStories.stories.length) {
      setCurrentStoryIndex(storyIndex);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleMuteToggle = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if (videoRef.current && currentStory?.mediaType === 'video') {
      videoRef.current.muted = newMutedState;
    }
  };

  const handleDeleteStory = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/stories/${currentStory.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Story deleted successfully');
        setShowDeleteDialog(false);
        setShowMenu(false);
        
        // Notify parent to refresh stories
        if (onStoryDeleted) {
          onStoryDeleted();
        }
        
        // If there are more stories from this user, go to next one
        // Otherwise, go to next user or close
        if (currentStoryIndex < currentUserStories.stories.length - 1) {
          // Move to next story in same user's collection
          setCurrentStoryIndex(currentStoryIndex + 1);
        } else if (currentUserIndex < storiesData.length - 1) {
          // Move to next user's first story
          setCurrentUserIndex(currentUserIndex + 1);
          setCurrentStoryIndex(0);
        } else {
          // No more stories, close viewer
          onClose();
        }
      } else {
        toast.error(data.message || 'Failed to delete story');
      }
    } catch (error) {
      console.error('Error deleting story:', error);
      toast.error('Failed to delete story');
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // Sync video play/pause and mute state (without resetting position)
  useEffect(() => {
    if (videoRef.current && currentStory?.mediaType === 'video') {
      videoRef.current.muted = isMuted;
      if (isPlaying) {
        videoRef.current.play().catch(console.error);
      } else {
        videoRef.current.pause();
      }
    }
  }, [currentStory?.id, isMuted, isPlaying]);

  const handleStoryClick = (e) => {
    // Click on center area to play/pause
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    
    // Left third: previous story
    if (clickX < width / 3) {
      handlePreviousStory();
    }
    // Right third: next story
    else if (clickX > (width * 2) / 3) {
      handleNextStory();
    }
    // Center third: play/pause
    else {
      handlePlayPause();
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft') {
        handlePreviousStory();
      } else if (e.key === 'ArrowRight') {
        handleNextStory();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, currentUserIndex, currentStoryIndex]);

  if (!isOpen || !currentUserStories || !currentStory) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onClick={onClose}
    >
      {/* Story Content */}
      <div
        className="relative w-full h-full max-w-md mx-auto flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bars */}
        <div className="absolute top-4 left-4 right-4 z-10 flex gap-1">
          {currentUserStories.stories.map((story, index) => (
            <div
              key={story.id}
              className="flex-1 h-1 bg-gray-600 rounded-full overflow-hidden cursor-pointer hover:bg-gray-500 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleJumpToStory(index);
              }}
              title={`Story ${index + 1} of ${currentUserStories.stories.length}`}
            >
              <div
                className="h-full bg-white transition-all duration-100"
                style={{
                  width: index < currentStoryIndex
                    ? '100%'
                    : index === currentStoryIndex
                    ? `${progress}%`
                    : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* User Info */}
        <div className="absolute top-12 left-4 right-4 z-10 flex items-center gap-3">
          {currentUserStories.author.profilePicture ? (
            <img
              src={currentUserStories.author.profilePicture}
              alt={currentUserStories.author.username}
              className="w-10 h-10 rounded-full object-cover border-2 border-white"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-semibold border-2 border-white">
              {currentUserStories.author.username?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <div>
            <p className="text-white font-semibold">{currentUserStories.author.username}</p>
            <p className="text-white text-xs opacity-75">
              {new Date(currentStory.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {/* Play/Pause Button */}
          <button
            onClick={handlePlayPause}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors cursor-pointer"
            style={{ backgroundColor: 'transparent', border: 'none' }}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
          
          {/* Mute/Unmute Button */}
          {currentStory.mediaType === 'video' && (
            <button
              onClick={handleMuteToggle}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors cursor-pointer"
              style={{ backgroundColor: 'transparent', border: 'none' }}
            >
              {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
          )}
          
          {/* Three Dots Menu - Only show for own stories */}
          {isOwnStory && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors cursor-pointer"
                style={{ backgroundColor: 'transparent', border: 'none' }}
              >
                <MoreVertical size={24} />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[180px] z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      setShowDeleteDialog(true);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-red-600 transition-colors"
                    style={{ border: 'none' }}
                  >
                    <Trash2 size={16} />
                    <span className="text-sm">Delete Story</span>
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors cursor-pointer"
            style={{ backgroundColor: 'transparent', border: 'none' }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Story Media */}
        <div 
          className="absolute inset-0 w-full h-full cursor-pointer"
          onClick={handleStoryClick}
        >
          {currentStory.mediaType === 'image' ? (
            <img
              src={currentStory.mediaUrl}
              alt="Story"
              className="w-full h-full"
              style={{ 
                objectFit: 'cover',
                objectPosition: 'center',
                display: 'block'
              }}
            />
          ) : (
            <video
              ref={videoRef}
              src={currentStory.mediaUrl}
              autoPlay={isPlaying}
              muted={isMuted}
              playsInline
              className="w-full h-full"
              style={{ 
                objectFit: 'cover',
                objectPosition: 'center',
                display: 'block'
              }}
              onError={(e) => {
                console.error('Error loading video:', e);
                toast.error('Failed to load video');
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => {
                // When video ends, move to next story (only if not already advanced)
                if (!hasAdvancedRef.current) {
                  hasAdvancedRef.current = true;
                  handleNextStory();
                }
              }}
            />
          )}
        </div>

        {/* Caption Overlay */}
        {currentStory.caption && currentStory.caption.trim() && (
          <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-4">
            <div 
              className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-3 text-white text-sm"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            >
              <p className="break-words">{currentStory.caption}</p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <button
          onClick={handlePreviousStory}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 rounded-full p-2 transition-colors cursor-pointer"
          style={{ backgroundColor: 'transparent', border: 'none' }}
          disabled={currentUserIndex === 0 && currentStoryIndex === 0}
        >
          <ChevronLeft size={32} />
        </button>

        <button
          onClick={handleNextStory}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 rounded-full p-2 transition-colors cursor-pointer"
          style={{ backgroundColor: 'transparent', border: 'none' }}
        >
          <ChevronRight size={32} />
        </button>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteStory}
        title="Delete Story"
        message="Are you sure you want to delete this story? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default StoryViewer;

