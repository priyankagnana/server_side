import React, { useState, useEffect, useRef } from 'react';
import { X, Heart, MessageCircle, Share2, Bookmark, MoreVertical, UserPlus, ChevronUp, ChevronDown, Volume2, VolumeX, Trash2, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './Toast.jsx';
import Dialog from './Dialog.jsx';
import ReportDialog from './ReportDialog.jsx';
import CommentSection from './CommentSection.jsx';
import ShareModal from './ShareModal.jsx';

const ReelsViewer = ({ isOpen, onClose, reels, initialIndex = 0, onReelDeleted, onReelChange }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false); // Start unmuted
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reelsState, setReelsState] = useState(reels); // Local state for optimistic updates
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState('down'); // 'up' or 'down'
  const [prevIndex, setPrevIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const videoRef = useRef(null);
  const menuRef = useRef(null);
  const containerRef = useRef(null);
  
  // Get current user
  const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
  const currentUserId = currentUser._id || currentUser.id;
  
  // Update local state when reels prop changes
  useEffect(() => {
    setReelsState(reels);
  }, [reels]);
  
  const currentReel = reelsState[currentIndex];
  const previousReel = reelsState[prevIndex];
  const isOwnReel = currentReel?.author?.id === currentUserId || 
                    currentReel?.author?.id?.toString() === currentUserId?.toString();

  // Reset to initial index when viewer opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setPrevIndex(initialIndex);
      setIsPlaying(true);
      setIsMuted(false); // Reset to unmuted
      setIsAnimating(false);
    }
  }, [isOpen, initialIndex]);

  // Handle video play/pause and autoplay
  useEffect(() => {
    if (videoRef.current && currentReel) {
      videoRef.current.muted = isMuted;
      if (isPlaying) {
        videoRef.current.play().catch(console.error);
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, currentReel, isMuted]);

  // Auto-play when reel changes
  useEffect(() => {
    if (videoRef.current && currentReel && isOpen) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = isMuted;
      videoRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  }, [currentIndex, currentReel?.id, isOpen, isMuted]);

  // Track view when video starts playing
  useEffect(() => {
    if (videoRef.current && currentReel && isPlaying) {
      const handlePlay = async () => {
        try {
          const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
          const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

          await fetch(`${API_BASE}/api/reels/${currentReel.id}/view`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        } catch (error) {
          console.error('Error tracking view:', error);
        }
      };

      videoRef.current.addEventListener('play', handlePlay, { once: true });
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('play', handlePlay);
        }
      };
    }
  }, [currentReel, isPlaying]);

  const handleLike = async () => {
    if (!currentReel) return;
    
    // Optimistic update
    const previousLiked = currentReel.likedByUser;
    const previousLikes = currentReel.likes || 0;
    const newLiked = !previousLiked;
    const newLikes = newLiked ? previousLikes + 1 : Math.max(0, previousLikes - 1);
    
    // Update local state immediately
    setReelsState(prevReels => {
      const updated = [...prevReels];
      updated[currentIndex] = {
        ...updated[currentIndex],
        likedByUser: newLiked,
        likes: newLikes
      };
      return updated;
    });

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/reels/${currentReel.id}/like`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        // Update with server response
        setReelsState(prevReels => {
          const updated = [...prevReels];
          updated[currentIndex] = {
            ...updated[currentIndex],
            likedByUser: data.liked,
            likes: data.likesCount
          };
          return updated;
        });
      } else {
        // Revert on error
        setReelsState(prevReels => {
          const updated = [...prevReels];
          updated[currentIndex] = {
            ...updated[currentIndex],
            likedByUser: previousLiked,
            likes: previousLikes
          };
          return updated;
        });
        toast.error('Failed to like reel');
      }
    } catch (error) {
      console.error('Error liking reel:', error);
      // Revert on error
      setReelsState(prevReels => {
        const updated = [...prevReels];
        updated[currentIndex] = {
          ...updated[currentIndex],
          likedByUser: previousLiked,
          likes: previousLikes
        };
        return updated;
      });
      toast.error('Failed to like reel');
    }
  };

  const handleSave = async () => {
    if (!currentReel) return;
    
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/users/reels/${currentReel.id}/save`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        toast.success(data.saved ? 'Reel saved' : 'Reel unsaved');
      } else {
        toast.error(data.message || 'Failed to save reel');
      }
    } catch (error) {
      console.error('Error saving reel:', error);
      toast.error('Failed to save reel');
    }
  };

  const handleNextReel = () => {
    if (currentIndex < reelsState.length - 1 && !isAnimating) {
      setIsAnimating(true);
      setAnimationDirection('up'); // Current reel goes up, next comes from bottom
      setPrevIndex(currentIndex);
      
      setTimeout(() => {
        const newIndex = currentIndex + 1;
        setCurrentIndex(newIndex);
        if (onReelChange) {
          onReelChange(newIndex);
        }
        // Reset animation after transition
        setTimeout(() => {
          setIsAnimating(false);
          setPrevIndex(newIndex);
        }, 300);
      }, 50);
    } else if (currentIndex >= reelsState.length - 1) {
      onClose();
    }
  };

  const handlePreviousReel = () => {
    if (currentIndex > 0 && !isAnimating) {
      setIsAnimating(true);
      setAnimationDirection('down'); // Current reel goes down, previous comes from top
      setPrevIndex(currentIndex);
      
      setTimeout(() => {
        const newIndex = currentIndex - 1;
        setCurrentIndex(newIndex);
        if (onReelChange) {
          onReelChange(newIndex);
        }
        // Reset animation after transition
        setTimeout(() => {
          setIsAnimating(false);
          setPrevIndex(newIndex);
        }, 300);
      }, 50);
    }
  };

  const handleProfileClick = () => {
    if (currentReel?.author?.id) {
      navigate(`/profile/${currentReel.author.id}`);
    }
  };

  const handleDeleteReel = () => {
    setShowMenu(false);
    setShowDeleteDialog(true);
  };

  const confirmReportReel = async (reason) => {
    try {
      const currentReel = reelsState[currentIndex];
      if (!currentReel) return;

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reportType: 'reel',
          reportedItemId: currentReel.id || currentReel._id,
          reason: reason,
          description: ''
        })
      });

      if (response.ok) {
        toast.success('Reel reported. Thank you for your feedback.');
        setShowReportDialog(false);
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to report reel');
      }
    } catch (error) {
      console.error('Error reporting reel:', error);
      toast.error('Failed to report reel');
    }
  };

  const confirmDeleteReel = async () => {
    if (!currentReel || isDeleting) return;

    setIsDeleting(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/reels/${currentReel.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Reel deleted successfully');
        
        // Remove deleted reel from the list
        const updatedReels = reelsState.filter(reel => reel.id !== currentReel.id);
        setReelsState(updatedReels);
        
        // Call onReelDeleted callback if provided
        if (onReelDeleted) {
          onReelDeleted(currentReel.id);
        }
        
        // Close dialog
        setShowDeleteDialog(false);
        
        // Handle navigation after deletion
        if (updatedReels.length === 0) {
          // No more reels, close the viewer
          onClose();
          navigate('/reels');
        } else {
          // Navigate to previous reel or next reel
          if (currentIndex > 0) {
            const newIndex = currentIndex - 1;
            setCurrentIndex(newIndex);
            if (onReelChange) {
              onReelChange(newIndex);
            }
          } else if (currentIndex < updatedReels.length) {
            // Stay at index 0 (which now has the next reel)
            setCurrentIndex(0);
            if (onReelChange) {
              onReelChange(0);
            }
          } else {
            // Last reel was deleted, close viewer
            onClose();
            navigate('/reels');
          }
        }
      } else {
        throw new Error(data.message || 'Failed to delete reel');
      }
    } catch (error) {
      console.error('Error deleting reel:', error);
      toast.error(error.message || 'Failed to delete reel');
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
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

  // Touch handlers for swipe
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    // Don't interfere with button clicks or other interactions
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea')) {
      return;
    }
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e) => {
    if (!touchStart) return;
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd || isAnimating) return;
    
    const distance = touchStart - touchEnd;
    const isUpSwipe = distance > minSwipeDistance;
    const isDownSwipe = distance < -minSwipeDistance;

    if (isUpSwipe) {
      handleNextReel();
    } else if (isDownSwipe) {
      handlePreviousReel();
    }
    
    // Reset touch state
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (e.key === 'ArrowUp' && !isAnimating) {
          handlePreviousReel();
        } else if (e.key === 'ArrowDown' && !isAnimating) {
          handleNextReel();
        }
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
  }, [isOpen, currentIndex, isAnimating]);

  if (!isOpen || !currentReel) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black"
      onClick={onClose}
      style={{ height: '100vh', width: '100vw' }}
    >
      {/* Reel Content */}
      <div
        ref={containerRef}
        className="relative w-full h-full max-w-md mx-auto flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ height: '100vh' }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-20 text-white hover:bg-white/20 rounded-full p-2 transition-colors cursor-pointer"
          style={{ backgroundColor: 'transparent', border: 'none' }}
        >
          <X size={24} />
        </button>


        {/* Reel Video Container with Animation */}
        <div 
          className="absolute inset-0 w-full h-full cursor-pointer overflow-hidden"
          onClick={(e) => {
            // Don't trigger play/pause if clicking on buttons or during animation
            if (e.target.closest('button') || isAnimating) return;
            // Click to pause/play
            setIsPlaying(!isPlaying);
          }}
        >
          {/* Previous/Current Reel - Sliding Out */}
          {previousReel && isAnimating && (
            <div
              key={`prev-${previousReel.id}`}
              className="absolute inset-0 w-full h-full transition-transform duration-300 ease-in-out"
              style={{
                transform: animationDirection === 'up' ? 'translateY(-100%)' : 'translateY(100%)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: 1
              }}
            >
              <video
                src={previousReel.videoUrl}
                className="w-full h-full"
                style={{ 
                  objectFit: 'cover',
                  objectPosition: 'center',
                  display: 'block'
                }}
                muted
                playsInline
              />
            </div>
          )}
          
          {/* Current Reel - Sliding In */}
          {currentReel && (
            <div
              key={`current-${currentReel.id}-${isAnimating}`}
              className="absolute inset-0 w-full h-full transition-transform duration-300 ease-in-out"
              style={{
                transform: isAnimating 
                  ? (animationDirection === 'up' 
                      ? 'translateY(100%)' // Coming from bottom when going up
                      : 'translateY(-100%)') // Coming from top when going down
                  : 'translateY(0)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: isAnimating ? 2 : 1
              }}
            >
              <video
                ref={videoRef}
                src={currentReel.videoUrl}
                className="w-full h-full"
                style={{ 
                  objectFit: 'cover',
                  objectPosition: 'center',
                  display: 'block'
                }}
                muted={isMuted}
                loop
                playsInline
                onEnded={() => {
                  // Auto-advance to next reel when video ends
                  if (!isAnimating) {
                    handleNextReel();
                  }
                }}
              />
              
              {/* Play/Pause Overlay - Shows when video is paused */}
              {!isPlaying && !isAnimating && (
                <div 
                  className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPlaying(true);
                  }}
                >
                  <div className="bg-black/50 rounded-full p-4 backdrop-blur-sm">
                    <Play size={48} className="text-white fill-white" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Left Side - Profile and Info */}
        <div 
          key={`left-${currentReel.id}`}
          className="absolute left-4 bottom-4 z-30 flex flex-col gap-4 transition-all duration-300 ease-in-out"
          style={{
            transform: isAnimating 
              ? (animationDirection === 'up' ? 'translateY(-100%)' : 'translateY(100%)')
              : 'translateY(0)',
            opacity: isAnimating ? 0 : 1
          }}
        >
          {/* Profile Section */}
          <div className="flex flex-col items-center gap-2">
            <div 
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleProfileClick();
              }}
            >
              {currentReel.author.profilePicture ? (
                <img
                  src={currentReel.author.profilePicture}
                  alt={currentReel.author.username}
                  className="w-14 h-14 rounded-full object-cover border-2 border-white"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-semibold border-2 border-white">
                  {currentReel.author.username?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            {!isOwnReel && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Implement follow functionality
                  toast.info('Follow functionality coming soon');
                }}
                className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded-full transition-colors cursor-pointer"
                style={{ border: 'none' }}
              >
                Follow
              </button>
            )}
          </div>

          {/* Action Buttons - Right Side */}
          <div className="flex flex-col items-center gap-4 mt-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLike();
              }}
              className="flex flex-col items-center gap-1 text-white hover:opacity-80 transition-opacity cursor-pointer"
              style={{ backgroundColor: 'transparent', border: 'none' }}
            >
              <Heart
                size={28}
                className={currentReel.likedByUser ? 'text-red-500' : 'text-white'}
                fill={currentReel.likedByUser ? 'currentColor' : 'none'}
              />
              <span className="text-xs font-semibold">{currentReel.likes || 0}</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowComments(!showComments);
              }}
              className="flex flex-col items-center gap-1 text-white hover:opacity-80 transition-opacity cursor-pointer"
              style={{ backgroundColor: 'transparent', border: 'none' }}
            >
              <MessageCircle size={28} />
              <span className="text-xs font-semibold">{currentReel.comments || 0}</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowShareModal(true);
              }}
              className="flex flex-col items-center gap-1 text-white hover:opacity-80 transition-opacity cursor-pointer"
              style={{ backgroundColor: 'transparent', border: 'none' }}
            >
              <Share2 size={28} />
              <span className="text-xs font-semibold">Share</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
              className="flex flex-col items-center gap-1 text-white hover:opacity-80 transition-opacity cursor-pointer"
              style={{ backgroundColor: 'transparent', border: 'none' }}
            >
              <Bookmark 
                size={28} 
                className={currentReel.savedByUser ? 'text-purple-400' : 'text-white'}
                fill={currentReel.savedByUser ? 'currentColor' : 'none'}
              />
              <span className="text-xs font-semibold">Save</span>
            </button>

            {/* Three Dots Menu - Below Save button, visible for all users */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="flex flex-col items-center gap-1 text-white hover:opacity-80 transition-opacity cursor-pointer"
                style={{ backgroundColor: 'transparent', border: 'none' }}
              >
                <MoreVertical size={28} />
              </button>
              
              {showMenu && (
                <div className="absolute bottom-full mb-2 right-0 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[180px] z-50">
                  {isOwnReel ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteReel();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-red-600 transition-colors cursor-pointer"
                      style={{ border: 'none' }}
                    >
                      <Trash2 size={16} />
                      <span className="text-sm">Delete Reel</span>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        setShowReportDialog(true);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-red-600 transition-colors"
                      style={{ border: 'none' }}
                    >
                      <span className="text-sm">Report Reel</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Caption and Info */}
        <div 
          key={`right-${currentReel.id}`}
          className="absolute right-4 bottom-4 z-20 max-w-[60%] transition-all duration-300 ease-in-out"
          style={{
            transform: isAnimating 
              ? (animationDirection === 'up' ? 'translateY(-100%)' : 'translateY(100%)')
              : 'translateY(0)',
            opacity: isAnimating ? 0 : 1
          }}
        >
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white">
            <div 
              className="flex items-center gap-2 mb-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                handleProfileClick();
              }}
            >
              <p className="font-bold text-sm">{currentReel.author.username}</p>
              {currentReel.author.learningJourney && (
                <span className="text-xs text-gray-300">• {currentReel.author.learningJourney}</span>
              )}
            </div>
            {currentReel.caption && (
              <p className="text-sm mb-2 break-words">{currentReel.caption}</p>
            )}
            {/* Hashtags can be extracted from caption or added separately */}
            {currentReel.caption && currentReel.caption.includes('#') && (
              <div className="flex flex-wrap gap-1 mt-2">
                {currentReel.caption.match(/#\w+/g)?.map((tag, idx) => (
                  <span key={idx} className="text-xs text-purple-300">#{tag.slice(1)}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Buttons - Left Side of Container */}
        <div className="absolute left-0 top-1/4 z-20 flex flex-col gap-2">
          {/* Up Arrow Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePreviousReel();
            }}
            disabled={currentIndex === 0 || isAnimating}
            className="bg-black/70 hover:bg-black/90 rounded-r-lg p-3 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            style={{ border: 'none' }}
          >
            <ChevronUp size={24} className="text-white" />
          </button>

          {/* Down Arrow Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNextReel();
            }}
            disabled={currentIndex === reelsState.length - 1 || isAnimating}
            className="bg-black/70 hover:bg-black/90 rounded-r-lg p-3 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            style={{ border: 'none' }}
          >
            <ChevronDown size={24} className="text-white" />
          </button>
        </div>

        {/* Comment Section Overlay */}
        {showComments && (
          <div 
            className="absolute inset-0 bg-black/80 z-30 flex items-end"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowComments(false);
              }
            }}
          >
            <div className="w-full bg-white rounded-t-2xl max-h-[70vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Comments</h3>
                <button
                  onClick={() => setShowComments(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-y-auto max-h-[calc(70vh-80px)]">
                <CommentSection 
                  reelId={currentReel.id} 
                  onCommentCountChange={(count) => {
                    // Update comment count
                    setReelsState(prevReels => {
                      const updated = [...prevReels];
                      updated[currentIndex] = {
                        ...updated[currentIndex],
                        comments: count
                      };
                      return updated;
                    });
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Mute/Unmute Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsMuted(!isMuted);
          }}
          className="absolute bottom-20 right-4 z-20 text-white hover:bg-white/20 rounded-full p-2 transition-colors cursor-pointer"
          style={{ backgroundColor: 'transparent', border: 'none' }}
        >
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>

        {/* Share Modal */}
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          reelId={currentReel?.id}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog
          isOpen={showDeleteDialog}
          onClose={() => !isDeleting && setShowDeleteDialog(false)}
          onConfirm={confirmDeleteReel}
          title="Delete Reel"
          message="Are you sure you want to delete this reel? This action cannot be undone."
          confirmText={isDeleting ? "Deleting..." : "Delete"}
          cancelText="Cancel"
          type="danger"
          preventAutoClose={true}
        />

        {/* Report Dialog */}
        <ReportDialog
          isOpen={showReportDialog}
          onClose={() => setShowReportDialog(false)}
          onConfirm={confirmReportReel}
          title="Report Reel"
          itemType="reel"
        />
      </div>
    </div>
  );
};

export default ReelsViewer;

