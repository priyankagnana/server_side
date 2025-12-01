import React, { useState, useEffect } from 'react';
import DashboardNavbar from '../components/DashboardNavbar';
import { ArrowLeft, Video, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../components/Toast.jsx';
import UploadReelModal from '../components/UploadReelModal';
import ReelsViewer from '../components/ReelsViewer';

const Reels = () => {
  const navigate = useNavigate();
  const { reelId } = useParams();
  const toast = useToast();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploadReelOpen, setIsUploadReelOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedReelIndex, setSelectedReelIndex] = useState(0);

  useEffect(() => {
    fetchReels();
  }, []);

  // Open viewer if reelId is in URL
  useEffect(() => {
    if (reelId && reels.length > 0) {
      const index = reels.findIndex(reel => reel.id === reelId);
      if (index !== -1) {
        setSelectedReelIndex(index);
        setIsViewerOpen(true);
      }
    }
  }, [reelId, reels]);

  const fetchReels = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/reels`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setReels(data.reels || []);
        }
      }
    } catch (error) {
      console.error('Error fetching reels:', error);
      toast.error('Failed to load reels');
    } finally {
      setLoading(false);
    }
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
          fetchReels(); // Refresh reels
          setIsUploadReelOpen(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNavbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-500">Loading reels...</div>
        </div>
      </div>
    );
  }

  const handleReelClick = (reelId) => {
    const index = reels.findIndex(reel => reel.id === reelId);
    if (index !== -1) {
      setSelectedReelIndex(index);
      setIsViewerOpen(true);
      navigate(`/reels/${reelId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNavbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-500">Loading reels...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/feed')}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} />
            <span>Back to Feed</span>
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reels</h1>
              <p className="text-sm text-gray-500 mt-1">
                {reels.length} {reels.length === 1 ? 'reel' : 'reels'}
              </p>
            </div>
            <button
              onClick={() => setIsUploadReelOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium cursor-pointer"
              style={{ border: 'none' }}
            >
              <Plus size={20} />
              <span>Upload Reel</span>
            </button>
          </div>
        </div>

        {/* Reels Grid */}
        {reels.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {reels.map((reel) => (
              <div
                key={reel.id}
                className="aspect-[9/16] bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative group"
                onClick={() => handleReelClick(reel.id)}
              >
                {reel.thumbnailUrl ? (
                  <img 
                    src={reel.thumbnailUrl} 
                    alt={reel.caption || 'Reel'} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                    <Video size={32} className="text-white" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Video size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="absolute bottom-2 left-2 right-2 flex items-center gap-3 text-white text-xs">
                  <span className="flex items-center gap-1">
                    <span>❤️</span>
                    <span>{reel.likes || 0}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span>💬</span>
                    <span>{reel.comments || 0}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Video className="text-gray-400" size={40} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No reels yet</h3>
            <p className="text-gray-500 mb-4">Be the first to upload a reel!</p>
            <button
              onClick={() => setIsUploadReelOpen(true)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium cursor-pointer"
              style={{ border: 'none' }}
            >
              Upload Your First Reel
            </button>
          </div>
        )}
      </div>

      {/* Reels Viewer */}
      <ReelsViewer
        isOpen={isViewerOpen}
        onClose={() => {
          setIsViewerOpen(false);
          navigate('/reels');
        }}
        reels={reels}
        initialIndex={selectedReelIndex}
        onReelDeleted={fetchReels}
        onReelChange={(index) => {
          if (reels[index]) {
            navigate(`/reels/${reels[index].id}`, { replace: true });
          }
        }}
      />

      <UploadReelModal
        isOpen={isUploadReelOpen}
        onClose={() => setIsUploadReelOpen(false)}
        onSubmit={handleUploadReel}
      />
    </div>
  );
};

export default Reels;

