import React from 'react';
import { Users } from 'lucide-react';

const ConversationItem = ({ conversation, isActive, onClick, currentUserId }) => {
  const formatTime = (date) => {
    if (!date) return '';
    const messageDate = new Date(date);
    const now = new Date();
    const diffInMinutes = (now - messageDate) / (1000 * 60);
    const diffInHours = diffInMinutes / 60;

    if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)}m`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays === 1) return '1d';
      return `${diffInDays}d`;
    }
  };

  const getLastMessagePreview = () => {
    if (!conversation.lastMessage) return 'No messages yet';
    
    // For group chats, show sender name
    if (conversation.type === 'group') {
      const senderName = conversation.lastMessage.sender?.id === currentUserId 
        ? 'You' 
        : conversation.lastMessage.sender?.username || 'User';
      return `${senderName}: ${conversation.lastMessage.content}`;
    }
    
    // For direct chats, just show the message
    return conversation.lastMessage.content;
  };

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
        isActive 
          ? 'bg-purple-50' 
          : 'hover:bg-gray-50'
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {conversation.type === 'group' ? (
          conversation.profilePicture ? (
            <img
              src={conversation.profilePicture}
              alt={conversation.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
              <Users size={20} className="text-white" />
            </div>
          )
        ) : (
          conversation.avatar ? (
            <img
              src={conversation.avatar}
              alt={conversation.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-semibold">
              {conversation.name?.[0]?.toUpperCase() || 'U'}
            </div>
          )
        )}
        {/* Online indicator for direct chats */}
        {conversation.type === 'direct' && conversation.isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900 truncate text-sm">
            {conversation.name}
          </h3>
          {conversation.lastMessageAt && (
            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
              {formatTime(conversation.lastMessageAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 truncate flex-1">
            {getLastMessagePreview()}
          </p>
          {conversation.unreadCount > 0 && (
            <span className="ml-2 bg-purple-600 text-white text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
              {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationItem;

