import React, { useState, useEffect } from 'react';
import { BookOpen, Hash, Loader2, Globe, Lock, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const StudyGroupsSidebar = () => {
  const navigate = useNavigate();
  const [studyGroups, setStudyGroups] = useState([]);
  const [loadingStudyGroups, setLoadingStudyGroups] = useState(true);

  const loadStudyGroups = async () => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    try {
      const response = await fetch(`${API_BASE}/api/study-groups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setStudyGroups(data.studyGroups);
      }
    } catch (error) {
      console.error('Error fetching study groups:', error);
    } finally {
      setLoadingStudyGroups(false);
    }
  };

  useEffect(() => {
    loadStudyGroups();

    // this listens for refresh command from StudyRooms.jsx
    window.addEventListener('studyGroupCreated', loadStudyGroups);

    return () => {
      window.removeEventListener('studyGroupCreated', loadStudyGroups);
    };
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
            <BookOpen className="text-green-600" size={18} />
          </div>
          <h3 className="font-semibold text-gray-900">Study Groups to Join</h3>
        </div>
        <button
          onClick={() => navigate('/study-rooms')}
          className="text-xs text-green-600 hover:text-green-700 font-medium transition-colors"
        >
          Access All
        </button>
      </div>

      {loadingStudyGroups ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-green-600" />
        </div>
      ) : studyGroups.length > 0 ? (
        <div className="space-y-3">
          {studyGroups.map((group) => (
            <div
              key={group._id}
              onClick={() => navigate(`/study-rooms/${group._id}`)}
              className="cursor-pointer bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 hover:border-green-300 transition-all duration-300 hover:shadow-md group"
            >
              <div className="flex items-start gap-3 mb-3">
                {group.icon ? (
                  <img
                    src={group.icon}
                    alt={group.name}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {group.name[0]?.toUpperCase() || 'G'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 text-sm mb-1 truncate group-hover:text-green-700 transition-colors">
                    {group.name}
                  </h4>
                  {group.description && (
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">{group.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-white/60 rounded-md font-medium">
                      {group.category || 'General'}
                    </span>
                    <span>•</span>
                    <span>{group.members?.length || 0} members</span>
                    {group.joinType && (
                      <>
                        <span>•</span>
                        <span className={`px-2 py-0.5 rounded-md font-medium flex items-center gap-1 ${
                          group.joinType === 'public' ? 'bg-green-100 text-green-700' :
                          group.joinType === 'invite-only' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {group.joinType === 'public' && <Globe size={10} />}
                          {group.joinType === 'invite-only' && <Lock size={10} />}
                          {group.joinType === 'request-to-join' && <UserPlus size={10} />}
                          {group.joinType === 'public' ? 'Public' :
                           group.joinType === 'invite-only' ? 'Invite Only' :
                           'Request to Join'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate(`/study-rooms/${group._id}`)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-[1.02]"
              >
                <Hash size={14} />
                <span>View Group</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="inline-block p-4 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full mb-3">
            <BookOpen className="text-green-600" size={24} />
          </div>
          <p className="text-gray-500 text-sm mb-2">No study groups available</p>
        </div>
      )}
    </div>
  );
};

export default StudyGroupsSidebar;
