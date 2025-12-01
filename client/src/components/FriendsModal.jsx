import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FriendsModal = ({ isOpen, onClose, userId }) => {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      fetchFriends();
    }
  }, [isOpen, userId]);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/users/${userId}/friends`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFriends(data.friends || []);
        }
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleUserClick = (friendUserId) => {
    navigate(`/profile/${friendUserId}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)'
      }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Friends</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Friends List */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0 modal-scrollable">
          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading...</div>
          ) : friends.length > 0 ? (
            <div className="space-y-3">
              {friends.map((friend) => {
                const friendId = friend._id || friend.id;
                const username = friend.username || friend.email?.split('@')[0] || 'User';
                const profilePicture = friend.profilePicture || '';

                return (
                  <div
                    key={friendId}
                    onClick={() => handleUserClick(friendId)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    {profilePicture && profilePicture.trim() !== '' ? (
                      <img
                        src={profilePicture}
                        alt={username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white text-lg font-semibold">
                        {username[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{username}</p>
                      {friend.email && (
                        <p className="text-sm text-gray-500">{friend.email}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">No friends yet</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendsModal;

