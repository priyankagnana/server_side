import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Video, Image, Users } from 'lucide-react';

const ActionButtons = ({ onCreatePost, onUploadReel, onUploadStory }) => {
  const navigate = useNavigate();
  const actions = [
    { 
      icon: Edit, 
      label: 'Create Post', 
      bgColor: '#E0E7FF', 
      textColor: '#4F46E5',
      iconColor: '#4F46E5',
      onClick: onCreatePost
    },
    { 
      icon: Video, 
      label: 'Upload Reel', 
      bgColor: '#F3E8FF', 
      textColor: '#9333EA',
      iconColor: '#9333EA',
      onClick: onUploadReel
    },
    { 
      icon: Image, 
      label: 'Upload Story', 
      bgColor: '#FEF3C7', 
      textColor: '#D97706',
      iconColor: '#D97706',
      onClick: onUploadStory
    },
    { 
      icon: Users, 
      label: 'Find Study Partner', 
      bgColor: '#D1FAE5', 
      textColor: '#059669',
      iconColor: '#059669',
      onClick: () => navigate('/find-study-partner')
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
        return (
          <button
            key={index}
            onClick={action.onClick}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-medium transition-all hover:shadow-md hover:scale-105"
            style={{
              backgroundColor: action.bgColor,
              color: action.textColor,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Icon size={20} style={{ color: action.iconColor }} strokeWidth={2} />
            <span className="text-sm">{action.label}</span>
          </button>
        );
        })}
      </div>
    </div>
  );
};

export default ActionButtons;

