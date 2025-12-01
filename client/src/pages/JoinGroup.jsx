import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast.jsx';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const JoinGroup = () => {
  const { inviteLink } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    if (inviteLink) {
      joinGroup();
    }
  }, [inviteLink]);

  const joinGroup = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      if (!token) {
        setError('Please login to join the group');
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      const response = await fetch(`${API_BASE}/api/chat/groups/join/${inviteLink}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSuccess(true);
          toast.success('Successfully joined the group!');
          setTimeout(() => {
            navigate('/chat');
          }, 2000);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to join group');
        toast.error(errorData.message || 'Failed to join group');
      }
    } catch (error) {
      console.error('Error joining group:', error);
      setError('An error occurred while joining the group');
      toast.error('Failed to join group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
        {loading && (
          <>
            <Loader2 className="w-16 h-16 text-purple-600 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Joining Group...</h2>
            <p className="text-gray-600">Please wait while we add you to the group</p>
          </>
        )}
        {success && (
          <>
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Successfully Joined!</h2>
            <p className="text-gray-600">Redirecting to chat...</p>
          </>
        )}
        {error && !loading && !success && (
          <>
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to Join</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/chat')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Go to Chat
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default JoinGroup;

