import React, { useState, useRef, useEffect } from 'react';
import { Check, CheckCheck, ChevronDown, Copy, Trash2, Flag, Download, MoreVertical } from 'lucide-react';

const MessageBubble = ({ message, isOwn, showAvatar = true, isGroupChat = false, onCopy, onDelete, onReport, onSaveToDownloads }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ side: 'auto', top: 'auto', bottom: 'auto' });
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  const formatTime = (date) => {
    if (!date) return '';
    const messageDate = new Date(date);
    return messageDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  // Close menu when clicking outside and handle overflow
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && 
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu && menuRef.current && buttonRef.current) {
      document.addEventListener('mousedown', handleClickOutside);
      
      // Calculate optimal position to prevent overflow
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const menu = menuRef.current;
      const menuWidth = 200; // min-w-[180px] + padding
      const menuHeight = menu.offsetHeight || 200; // Approximate height
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 8; // Margin between button and menu
      
      let newPosition = { side: 'auto', top: 'auto', bottom: 'auto' };
      
      // Determine horizontal position
      if (isOwn) {
        // For own messages (right side), try to open to the left first
        if (buttonRect.left - menuWidth - padding < 0) {
          // Not enough space on left, open to the right
          newPosition.side = 'right';
        } else {
          // Enough space on left
          newPosition.side = 'left';
        }
      } else {
        // For other messages (left side), try to open to the right first
        if (buttonRect.right + menuWidth + padding > viewportWidth) {
          // Not enough space on right, open to the left
          newPosition.side = 'left';
        } else {
          // Enough space on right
          newPosition.side = 'right';
        }
      }
      
      // Determine vertical position
      if (buttonRect.bottom + menuHeight + padding > viewportHeight) {
        // Not enough space below, align to bottom
        newPosition.bottom = '0';
        newPosition.top = 'auto';
      } else {
        // Enough space below, align to top
        newPosition.top = '0';
        newPosition.bottom = 'auto';
      }
      
      setMenuPosition(newPosition);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu, isOwn, message.content, message.fileUrl]);

  const handleCopy = () => {
    if (onCopy) {
      onCopy(message);
    } else {
      // Fallback: copy message content to clipboard
      if (message.content) {
        navigator.clipboard.writeText(message.content);
      }
    }
    setShowMenu(false);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(message);
    }
    setShowMenu(false);
  };

  const handleReport = () => {
    if (onReport) {
      onReport(message);
    }
    setShowMenu(false);
  };

  const handleSaveToDownloads = () => {
    if (onSaveToDownloads) {
      onSaveToDownloads(message);
    }
    setShowMenu(false);
  };

  const isImageOrVideo = message.messageType === 'image' || message.messageType === 'file';

  return (
    <div 
      className={`flex items-end gap-2 mb-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} group`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar - only show for other users' messages in groups */}
      {!isOwn && showAvatar && (
        <div className="flex-shrink-0 w-8 h-8">
          {message.sender?.profilePicture ? (
            <img
              src={message.sender.profilePicture}
              alt={message.sender.username}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white text-xs font-semibold">
              {message.sender?.username?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
        </div>
      )}

      {/* Message Bubble */}
      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col relative`}>
        <div className={`flex items-start gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} relative`}>
          {/* Dropdown Menu Button - beside message */}
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className={`flex-shrink-0 mt-1 p-1.5 rounded-full transition-all cursor-pointer z-10 ${
                isOwn 
                  ? showMenu 
                    ? 'bg-gray-800 text-white shadow-md' 
                    : 'bg-gray-800 text-white hover:bg-gray-700 shadow-sm'
                  : showMenu
                    ? 'bg-gray-200 text-gray-700 shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-700 shadow-sm'
              }`}
              type="button"
              title="More options"
            >
              <MoreVertical size={16} />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div
                ref={menuRef}
                className="absolute bg-gray-800 text-white rounded-lg shadow-xl min-w-[180px] max-w-[200px] z-50 py-1"
                style={{
                  maxHeight: 'calc(100vh - 100px)',
                  overflowY: 'auto',
                  // Dynamic positioning based on available space
                  ...(menuPosition.side === 'right' 
                    ? { 
                        left: '100%',
                        right: 'auto',
                        marginLeft: '8px'
                      }
                    : {
                        right: '100%',
                        left: 'auto',
                        marginRight: '8px'
                      }
                  ),
                  ...(menuPosition.top === 'auto'
                    ? {
                        bottom: menuPosition.bottom,
                        top: 'auto'
                      }
                    : {
                        top: menuPosition.top,
                        bottom: 'auto'
                      }
                  )
                }}
              >
              <button
                onClick={handleCopy}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-3 transition-colors cursor-pointer"
                type="button"
              >
                <Copy size={16} />
                <span>Copy</span>
              </button>
              
              {isImageOrVideo && message.fileUrl && (
                <button
                  onClick={handleSaveToDownloads}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-3 transition-colors cursor-pointer"
                  type="button"
                >
                  <Download size={16} />
                  <span>Save to Downloads</span>
                </button>
              )}

              {isOwn && (
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-3 transition-colors cursor-pointer text-red-400"
                  type="button"
                >
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              )}

              {!isOwn && (
                <button
                  onClick={handleReport}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-3 transition-colors cursor-pointer text-red-400"
                  type="button"
                >
                  <Flag size={16} />
                  <span>Report</span>
                </button>
              )}
              </div>
            )}
          </div>

          <div
            className={`px-4 py-2.5 rounded-2xl shadow-sm relative flex-1 ${
              isOwn
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                : 'bg-white text-gray-900 border border-gray-200'
            }`}
          >
            {message.messageType === 'image' && message.fileUrl ? (
              <div>
                <img
                  src={message.fileUrl}
                  alt="Shared image"
                  className="max-w-full h-auto rounded-lg mb-1 cursor-pointer"
                  onClick={() => window.open(message.fileUrl, '_blank')}
                />
                {message.content && message.content !== '📷 Photo' && (
                  <p className="text-sm break-words whitespace-pre-wrap leading-relaxed mt-2">{message.content}</p>
                )}
              </div>
            ) : message.messageType === 'file' && message.fileUrl ? (
              <div>
                <a
                  href={message.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-black/10 rounded-lg hover:bg-black/20 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-medium">
                    {message.content && message.content !== '📎 File' ? message.content : 'Download File'}
                  </span>
                </a>
              </div>
            ) : (
              <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">{message.content}</p>
            )}
          </div>
        </div>
        <div className={`flex items-center gap-2 mt-1 px-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-xs text-gray-500">{formatTime(message.createdAt)}</span>
          {isOwn && (
            <div className="flex items-center">
              {message.isRead ? (
                <CheckCheck size={16} className="text-blue-500" />
              ) : (
                <Check size={16} className="text-gray-400" />
              )}
            </div>
          )}
        </div>
        {/* Sender username for group chats */}
        {isGroupChat && message.sender?.username && (
          <div className={`mt-0.5 px-1 ${isOwn ? 'text-right' : 'text-left'}`}>
            <span className="text-xs text-gray-400 font-medium">
              {isOwn ? 'You' : message.sender.username}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;

