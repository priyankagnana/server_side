import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useToast } from '../components/Toast.jsx';
import DashboardNavbar from '../components/DashboardNavbar';
import ConversationItem from '../components/ConversationItem';
import MessageBubble from '../components/MessageBubble';
import SystemMessage from '../components/SystemMessage';
import MessageInput from '../components/MessageInput';
import TypingIndicator from '../components/TypingIndicator';
import CreateGroupModal from '../components/CreateGroupModal';
import InviteLinkModal from '../components/InviteLinkModal';
import GroupInfoModal from '../components/GroupInfoModal';
import Dialog from '../components/Dialog';
import ReportDialog from '../components/ReportDialog';
import VideoCallModal from '../components/VideoCallModal';
import { Plus, Phone, Video, Info, MoreVertical, Users, Ban, Trash2, X } from 'lucide-react';

const Chat = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const toast = useToast();
  const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
  const currentUserId = currentUser._id || currentUser.id;
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showInviteLinkModal, setShowInviteLinkModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [onlineUsersInChat, setOnlineUsersInChat] = useState(new Set()); // Polled online status
  const [userLastSeen, setUserLastSeen] = useState(new Map()); // Map of userId -> lastSeen timestamp
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, message: null });
  const [reportDialog, setReportDialog] = useState({ isOpen: false, message: null });
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [blockDialog, setBlockDialog] = useState({ isOpen: false, userId: null, isBlocked: false });
  const [clearChatDialog, setClearChatDialog] = useState({ isOpen: false, roomId: null });
  const [blockedUsers, setBlockedUsers] = useState(new Set());
  const headerMenuRef = useRef(null);
  
  // Call state
  const [callState, setCallState] = useState({
    isActive: false,
    meetingId: null,
    token: null,
    callType: 'video', // 'voice' or 'video'
    isIncoming: false,
    callerInfo: null,
    isCalling: false,
    isGroup: false,
    apiKey: null // Store API key from server if provided
  });

  // Timeout refs for call timeouts
  const oneOnOneCallTimeoutRef = useRef(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  
  // Audio refs for call sounds
  const callingAudioRef = useRef(null); // Sound for caller (outgoing call)
  const ringingAudioRef = useRef(null); // Sound for receiver (incoming call)
  const audioUnlockedRef = useRef(false); // Track if audio has been unlocked by user interaction

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  
  // Unlock audio on first user interaction
  useEffect(() => {
    const unlockAudio = async () => {
      if (!audioUnlockedRef.current && (callingAudioRef.current || ringingAudioRef.current)) {
        try {
          // Try to play a very short silent audio to unlock audio context
          const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
          await silentAudio.play();
          silentAudio.pause();
          audioUnlockedRef.current = true;
          console.log('[Audio] Audio unlocked');
        } catch (error) {
          console.log('[Audio] Could not unlock audio:', error);
        }
      }
    };

    // Unlock on any user interaction
    const events = ['click', 'touchstart', 'keydown'];
    const handlers = events.map(event => {
      const handler = () => {
        unlockAudio();
        events.forEach(e => document.removeEventListener(e, handlers[events.indexOf(e)]));
      };
      return handler;
    });

    events.forEach((event, index) => {
      document.addEventListener(event, handlers[index], { once: true });
    });

    return () => {
      events.forEach((event, index) => {
        document.removeEventListener(event, handlers[index]);
      });
    };
  }, []);

  // Fetch conversations
  useEffect(() => {
    fetchConversations();
  }, []);

  // Poll for online users when on chat page
  useEffect(() => {
    const isOnChatRoute = location.pathname === '/chat' || location.pathname.startsWith('/chat/');
    
    if (!isOnChatRoute) {
      // Not on chat page, clear online users
      setOnlineUsersInChat(new Set());
      return;
    }

    // Function to fetch online users and last seen info
    const fetchOnlineUsers = async () => {
      try {
        const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const response = await fetch(`${API_BASE}/api/chat/online-users`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setOnlineUsersInChat(new Set(data.onlineUsers));
            
            // Update lastSeen map
            if (data.friendsStatus) {
              const lastSeenMap = new Map();
              data.friendsStatus.forEach(friend => {
                lastSeenMap.set(friend.userId, friend.lastSeen);
              });
              setUserLastSeen(lastSeenMap);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch online users:', error);
      }
    };

    // Fetch immediately
    fetchOnlineUsers();

    // Set up polling interval (every 10 seconds)
    const interval = setInterval(fetchOnlineUsers, 10000);

    // Notify server we're on chat page (for server-side tracking)
    if (socket && isConnected) {
      socket.emit('chat_page_enter');
    }

    // Cleanup
    return () => {
      clearInterval(interval);
      // Notify server we left chat page
      if (socket && socket.connected) {
        socket.emit('chat_page_leave');
      }
    };
  }, [location.pathname, socket, isConnected, API_BASE]); // Depend on pathname and socket connection

  // Socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Join user's rooms when connected
    const roomIds = conversations.map(c => c.id);
    if (roomIds.length > 0) {
      socket.emit('join_rooms', roomIds);
    }

    // Message received
    const handleMessageReceived = (message) => {
      console.log('Message received:', message);
      
      // Update messages if this is the active conversation
      if (message.roomId === activeConversation?.id) {
        setMessages(prev => {
          // Check if message already exists (avoid duplicates)
          const exists = prev.some(m => m.id === message.id);
          if (exists) {
            // Update existing message if read status changed
            return prev.map(m => m.id === message.id ? { ...m, ...message } : m);
          }
          
          // Check if this is a message we just sent (replace temp message)
          const isOwnMessage = message.sender?.id?.toString() === (currentUserId?.toString() || currentUser._id?.toString());
          if (isOwnMessage) {
            // Find and replace temp message with real message
            const tempMessageIndex = prev.findIndex(m => 
              m.id?.toString().startsWith('temp-') && 
              m.sender?.id?.toString() === (currentUserId?.toString() || currentUser._id?.toString()) &&
              m.content === message.content &&
              Math.abs(new Date(m.createdAt).getTime() - new Date(message.createdAt).getTime()) < 5000 // Within 5 seconds
            );
            
            if (tempMessageIndex !== -1) {
              // Replace temp message with real message
              const newMessages = [...prev];
              newMessages[tempMessageIndex] = { 
                ...message, 
                isRead: message.messageType === 'system' ? true : (message.isRead || false) 
              };
              return newMessages;
            }
          }
          
          // Add isRead field if not present (defaults to false for new messages)
          // System messages don't need read status
          return [...prev, { 
            ...message, 
            isRead: message.messageType === 'system' ? true : (message.isRead || false) 
          }];
        });
        scrollToBottom();
      }
      // Update conversation list immediately (optimistic update)
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv.id === message.roomId) {
            return {
              ...conv,
              lastMessage: {
                id: message.id,
                content: message.content,
                sender: message.sender,
                createdAt: message.createdAt
              },
              lastMessageAt: message.createdAt,
              unreadCount: conv.id === activeConversation?.id 
                ? conv.unreadCount 
                : conv.unreadCount + 1
            };
          }
          return conv;
        });
        
        // Sort by lastMessageAt (most recent first)
        return updated.sort((a, b) => {
          const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return bTime - aTime;
        });
      });
    };

    // Typing indicators
    const handleUserTyping = ({ userId, roomId }) => {
      if (roomId === activeConversation?.id && userId !== currentUserId) {
        setTypingUsers(prev => new Set([...prev, userId]));
      }
    };

    const handleUserStoppedTyping = ({ userId, roomId }) => {
      if (roomId === activeConversation?.id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }
    };

    // Handle messages read event (when receiver reads sender's messages)
    const handleMessagesRead = ({ roomId, userId, messageIds }) => {
      if (roomId === activeConversation?.id) {
        // Update read status for messages sent by current user
        setMessages(prev =>
          prev.map(msg => {
            // Only update read status for messages sent by current user
            if (msg.sender?.id === currentUserId && messageIds.includes(msg.id)) {
              return { ...msg, isRead: true };
            }
            return msg;
          })
        );
        // Also refresh conversations to update unread count
        fetchConversations();
      }
    };

    // Handle new conversation (when group is created or joined)
    const handleNewConversation = (conversation) => {
      setConversations(prev => {
        // Check if conversation already exists
        const exists = prev.some(c => c.id === conversation.id);
        if (exists) {
          // Update existing conversation
          return prev.map(c => c.id === conversation.id ? { ...c, ...conversation } : c);
        }
        // Add new conversation at the top
        return [conversation, ...prev];
      });
    };

    // Handle conversation updates (when direct chat is created)
    const handleConversationUpdated = (conversation) => {
      setConversations(prev => {
        const exists = prev.some(c => c.id === conversation.id);
        if (exists) {
          return prev.map(c => c.id === conversation.id ? { ...c, ...conversation } : c);
        }
        return [conversation, ...prev];
      });
    };

    // Handle message deleted event
    const handleMessageDeleted = ({ messageId, roomId }) => {
      if (roomId === activeConversation?.id) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
    };

        // Handle chat cleared
        const handleChatCleared = ({ roomId }) => {
          if (roomId === activeConversation?.id) {
            setMessages([]);
          }
          // Update conversation last message
          setConversations(prev => prev.map(conv => {
            if (conv.id === roomId) {
              return { ...conv, lastMessage: null, lastMessageAt: null };
            }
            return conv;
          }));
        };

        // Handle admin added
        const handleAdminAdded = ({ roomId }) => {
          setConversations(prev => prev.map(conv => {
            if (conv.id === roomId) {
              // Refresh conversations to get updated admin list
              fetchConversations();
            }
            return conv;
          }));
        };

        // Handle member joined - system message will come via message_received event
        const handleMemberJoined = ({ roomId, userId, username }) => {
          fetchConversations();
        };

        // Handle member removed - system message will come via message_received event
        const handleMemberRemoved = ({ roomId, userId, username }) => {
          fetchConversations();
        };

        // Handle member left
        const handleMemberLeft = ({ roomId, userId, username }) => {
          if (userId === currentUserId?.toString()) {
            // Current user left, close the conversation
            setActiveConversation(null);
          }
          // System message will come via message_received event
          fetchConversations();
        };

        // Handle room updated (group name, description, profile picture changes)
        const handleRoomUpdated = ({ roomId, name, description, profilePicture }) => {
          setConversations(prev => prev.map(conv => {
            if (conv.id === roomId) {
              return {
                ...conv,
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(profilePicture !== undefined && { profilePicture })
              };
            }
            return conv;
          }));
          
          // Update active conversation if it's the updated room
          if (activeConversation?.id === roomId) {
            setActiveConversation(prev => ({
              ...prev,
              ...(name && { name }),
              ...(description !== undefined && { description }),
              ...(profilePicture !== undefined && { profilePicture })
            }));
          }
        };

        // Handle incoming call (1-on-1)
        const handleIncomingCall = (data) => {
          console.log('Received incoming call:', data);
          const { meetingId, token, callerId, callerName, callerProfilePicture, callType, apiKey } = data;
          
          if (!meetingId || !token) {
            console.error('Invalid incoming call data:', data);
            return;
          }
          
          setCallState({
            isActive: true,
            meetingId,
            token,
            callType: callType || 'video',
            isIncoming: true,
            callerInfo: {
              id: callerId,
              name: callerName,
              profilePicture: callerProfilePicture
            },
            isCalling: false,
            isGroup: false,
            apiKey: apiKey // API key from backend (required)
          });
        };

        // Handle incoming group call
        const handleIncomingGroupCall = (data) => {
          const { meetingId, token, roomId, callerId, callerName, callType, apiKey } = data;
          
          setCallState({
            isActive: true,
            meetingId,
            token,
            callType: callType || 'video',
            isIncoming: true,
            callerInfo: {
              id: callerId,
              name: callerName
            },
            isCalling: false,
            isGroup: true,
            roomId: roomId,
            apiKey: apiKey || null // Store API key from server
          });
        };

        // Handle call accepted (when other user accepts our call)
        const handleCallAccepted = ({ meetingId }) => {
          console.log('[Call] Call accepted by other user:', meetingId);
          console.log('[Call] Current call state before update:', callState);
          console.log('[Call] Socket connected:', socket?.connected, 'Socket ID:', socket?.id);
          
          // Clear timeout if call is accepted
          if (oneOnOneCallTimeoutRef.current) {
            clearTimeout(oneOnOneCallTimeoutRef.current);
            oneOnOneCallTimeoutRef.current = null;
          }
          
          // Stop calling sound when call is accepted
          if (callingAudioRef.current) {
            callingAudioRef.current.pause();
            callingAudioRef.current.currentTime = 0;
          }
          
          // Preserve all call state but stop the calling indicator
          setCallState(prev => {
            const newState = {
              ...prev,
              isCalling: false,
              isIncoming: false // Ensure this is false for caller
            };
            console.log('[Call] New call state after acceptance:', newState);
            console.log('[Call] Will VideoCallModal render?', newState.isActive && !newState.isIncoming && !newState.isCalling && newState.meetingId && newState.token);
            return newState;
          });
        };

        // Handle call rejected (when other user rejects our call)
        const handleCallRejected = () => {
          setCallState({
            isActive: false,
            meetingId: null,
            token: null,
            callType: 'video',
            isIncoming: false,
            callerInfo: null,
            isCalling: false,
            isGroup: false
          });
          toast.error('Call was rejected');
        };

        // Handle call ended (socket event)
        const handleCallEndedSocket = () => {
          // Stop all call sounds
          if (callingAudioRef.current) {
            callingAudioRef.current.pause();
            callingAudioRef.current.currentTime = 0;
          }
          if (ringingAudioRef.current) {
            ringingAudioRef.current.pause();
            ringingAudioRef.current.currentTime = 0;
          }
          
          setCallState({
            isActive: false,
            meetingId: null,
            token: null,
            callType: 'video',
            isIncoming: false,
            callerInfo: null,
            isCalling: false,
            isGroup: false,
            apiKey: null
          });
        };

        socket.on('message_received', handleMessageReceived);
        socket.on('user_typing', handleUserTyping);
        socket.on('user_stopped_typing', handleUserStoppedTyping);
        socket.on('messages_read', handleMessagesRead);
        socket.on('new_conversation', handleNewConversation);
        socket.on('conversation_updated', handleConversationUpdated);
        socket.on('message_deleted', handleMessageDeleted);
        socket.on('chat_cleared', handleChatCleared);
        socket.on('admin_added', handleAdminAdded);
        socket.on('member_joined', handleMemberJoined);
        socket.on('member_removed', handleMemberRemoved);
        socket.on('member_left', handleMemberLeft);
        socket.on('room_updated', handleRoomUpdated);
        socket.on('incoming_call', handleIncomingCall);
        socket.on('incoming_group_call', handleIncomingGroupCall);
        socket.on('call_accepted', handleCallAccepted);
        socket.on('call_rejected', handleCallRejected);
        socket.on('call_ended', handleCallEndedSocket);

    return () => {
      socket.off('message_received', handleMessageReceived);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stopped_typing', handleUserStoppedTyping);
      socket.off('messages_read', handleMessagesRead);
      socket.off('new_conversation', handleNewConversation);
      socket.off('conversation_updated', handleConversationUpdated);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('chat_cleared', handleChatCleared);
      socket.off('admin_added', handleAdminAdded);
      socket.off('member_joined', handleMemberJoined);
      socket.off('member_removed', handleMemberRemoved);
      socket.off('member_left', handleMemberLeft);
      socket.off('room_updated', handleRoomUpdated);
      socket.off('incoming_call', handleIncomingCall);
      socket.off('incoming_group_call', handleIncomingGroupCall);
      socket.off('call_accepted', handleCallAccepted);
      socket.off('call_rejected', handleCallRejected);
      socket.off('call_ended', handleCallEndedSocket);
    };
  }, [socket, isConnected, activeConversation, conversations, currentUserId]);

  // Join room and fetch messages when active conversation changes
  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return;
    }

    if (socket && isConnected && activeConversation.id) {
      // Join the room
      socket.emit('join_room', activeConversation.id);
    }

    // Always fetch messages when conversation changes (even if socket not connected)
    if (activeConversation.id) {
      fetchMessages(activeConversation.id, 1);
    } else if (activeConversation.isPlaceholder) {
      // For placeholder conversations, create the direct chat first
      handleCreateDirectChat(activeConversation);
    }
  }, [activeConversation?.id]);

  // Mark messages as read when viewing them
  useEffect(() => {
    if (!activeConversation?.id || !messages.length) return;

    // Get unread messages (messages not sent by current user and not read)
    const unreadMessages = messages.filter(
      msg => msg.sender?.id !== currentUserId && !msg.isRead
    );

    if (unreadMessages.length > 0) {
      // Mark messages as read
      const messageIds = unreadMessages.map(msg => msg.id);
      // Use a debounce to avoid marking too frequently
      const timeoutId = setTimeout(() => {
        markMessagesAsRead(activeConversation.id, messageIds);
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [messages, activeConversation?.id, currentUserId]);

  const markMessagesAsRead = async (roomId, messageIds) => {
    try {
      if (!socket || !isConnected) {
        // Fallback to REST API if socket not connected
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        await Promise.all(
          messageIds.map(messageId =>
            fetch(`${API_BASE}/api/chat/messages/${messageId}/read`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
          )
        );
      } else {
        // Use socket for real-time updates
        // Filter out system messages (they don't have valid ObjectIds and shouldn't be marked as read)
        const validMessageIds = messageIds.filter(id => !id.toString().startsWith('system_'));
        if (validMessageIds.length > 0) {
          socket.emit('mark_read', { roomId, messageIds: validMessageIds });
        }
      }

      // Optimistically update message read status
      setMessages(prev =>
        prev.map(msg =>
          messageIds.includes(msg.id)
            ? { ...msg, isRead: true }
            : msg
        )
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleCreateDirectChat = async (conversation) => {
    // Get the other participant (friend)
    const otherParticipant = conversation.participants?.find(p => p.id !== currentUserId);
    if (!otherParticipant) return;

    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/api/chat/direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          otherUserId: otherParticipant.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Create conversation object
          const newConversation = {
            ...conversation,
            id: data.room.id,
            type: data.room.type,
            name: data.room.name,
            avatar: data.room.avatar,
            participants: data.room.participants,
            lastMessage: null,
            lastMessageAt: null,
            unreadCount: 0
          };
          
          // Update active conversation
          setActiveConversation(newConversation);
          
          // Add to conversations list immediately if not already there
          setConversations(prev => {
            const exists = prev.some(c => c.id === newConversation.id);
            if (exists) {
              return prev.map(c => c.id === newConversation.id ? newConversation : c);
            }
            return [newConversation, ...prev];
          });
          
          // Join room via socket
          if (socket && isConnected) {
            socket.emit('join_room', data.room.id);
          }
        }
      }
    } catch (error) {
      console.error('Error creating direct chat:', error);
      toast.error('Failed to start conversation');
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/api/chat/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('Fetched conversations:', data.conversations.length);
          console.log('Conversations:', data.conversations);
          setConversations(data.conversations);
        }
      } else {
        const errorData = await response.json();
        console.error('Error fetching conversations:', errorData);
        toast.error(errorData.message || 'Failed to load conversations');
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (roomId, page = 1) => {
    try {
      setMessagesLoading(true);
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/api/chat/conversations/${roomId}/messages?page=${page}&limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log(`Fetched ${data.messages.length} messages for room ${roomId}`);
          if (page === 1) {
            setMessages(data.messages);
          } else {
            setMessages(prev => [...data.messages, ...prev]);
          }
          setHasMoreMessages(data.hasMore);
          setCurrentPage(page);
        }
      } else {
        const errorData = await response.json();
        console.error('Error fetching messages:', errorData);
        toast.error(errorData.message || 'Failed to load messages');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendMessage = async (content, messageType = 'text', fileUrl = '') => {
    if (!activeConversation) {
      toast.error('No conversation selected');
      return;
    }

    // If it's a placeholder conversation, create the chat first
    if (!activeConversation.id) {
      await handleCreateDirectChat(activeConversation);
      // Wait a bit for the conversation to be created
      setTimeout(() => {
        handleSendMessage(content, messageType, fileUrl);
      }, 500);
      return;
    }

    if (!socket || !isConnected) {
      toast.error('Not connected to chat');
      return;
    }

    // Determine content to display
    let displayContent = content;
    if (!content && fileUrl) {
      displayContent = messageType === 'image' ? '📷 Photo' : '📎 File';
    }

    try {
      // Optimistic update
      const tempMessageId = `temp-${Date.now()}`;
      const tempMessage = {
        id: tempMessageId,
        content: displayContent,
        sender: {
          id: currentUserId,
          username: currentUser.username || currentUser.email?.split('@')[0] || 'User',
          profilePicture: currentUser.profilePicture || ''
        },
        createdAt: new Date(),
        isRead: false,
        messageType: messageType || 'text',
        fileUrl: fileUrl || ''
      };
      setMessages(prev => [...prev, tempMessage]);
      scrollToBottom();

      // Update conversation list immediately with the new message
      setConversations(prev => {
        return prev.map(conv => {
          if (conv.id === activeConversation.id) {
            return {
              ...conv,
              lastMessage: {
                id: tempMessageId,
                content: displayContent,
                sender: tempMessage.sender,
                createdAt: tempMessage.createdAt
              },
              lastMessageAt: tempMessage.createdAt
            };
          }
          return conv;
        }).sort((a, b) => {
          const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return bTime - aTime;
        });
      });

      // Send via socket
      socket.emit('send_message', {
        roomId: activeConversation.id,
        content: displayContent,
        messageType: messageType || 'text',
        fileUrl: fileUrl || ''
      });

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleCopyMessage = (message) => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      toast.success('Message copied to clipboard');
    }
  };

  const handleDeleteMessage = async (message) => {
    if (!message.id) {
      toast.error('Cannot delete this message');
      return;
    }

    // Open delete confirmation dialog
    setDeleteDialog({ isOpen: true, message });
  };

  const confirmDeleteMessage = async () => {
    if (!deleteDialog.message) return;

    try {
      const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/api/chat/messages/${deleteDialog.message.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        // Remove message from state
        setMessages(prev => prev.filter(m => m.id !== deleteDialog.message.id));
        toast.success('Message deleted');
        setDeleteDialog({ isOpen: false, message: null });
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleReportMessage = async (message) => {
    if (!message.id) {
      toast.error('Cannot report this message');
      return;
    }

    // Open report confirmation dialog
    setReportDialog({ isOpen: true, message });
  };

  const confirmReportMessage = async (reason) => {
    if (!reportDialog.message) return;

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      const response = await fetch(`${API_BASE}/api/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reportType: 'chat',
          reportedItemId: reportDialog.message._id || reportDialog.message.id,
          reason: reason,
          description: ''
        })
      });

      if (response.ok) {
      toast.success('Message reported. Thank you for your feedback.');
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to report message');
      }
      setReportDialog({ isOpen: false, message: null });
    } catch (error) {
      console.error('Error reporting message:', error);
      toast.error('Failed to report message');
    }
  };

  const handleSaveToDownloads = async (message) => {
    if (!message.fileUrl) {
      toast.error('No file to download');
      return;
    }

    try {
      // Fetch the file
      const response = await fetch(message.fileUrl);
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Determine filename
      const extension = message.messageType === 'image' ? 'jpg' : 'file';
      const filename = `message-${message.id || Date.now()}.${extension}`;
      a.download = filename;
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('File saved to downloads');
    } catch (error) {
      console.error('Error saving file:', error);
      toast.error('Failed to save file');
    }
  };

  const getOtherParticipant = (conversation) => {
    if (!conversation || conversation.type !== 'direct') return null;
    const currentUserIdStr = currentUserId?.toString();
    return conversation.participants?.find(p => {
      const participantId = p.id?.toString() || p._id?.toString();
      return participantId !== currentUserIdStr;
    });
  };

  // Fetch block status for the other user
  useEffect(() => {
    const fetchBlockStatus = async () => {
      if (!activeConversation || activeConversation.type !== 'direct') return;
      
      const otherUser = getOtherParticipant(activeConversation);
      const otherUserId = otherUser?.id?.toString() || otherUser?._id?.toString();
      if (!otherUserId) return;

      try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const response = await fetch(`${API_BASE}/api/chat/users/${otherUserId}/block-status`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (data.success) {
          setBlockedUsers(prev => {
            const newSet = new Set(prev);
            if (data.blocked) {
              newSet.add(otherUserId);
            } else {
              newSet.delete(otherUserId);
            }
            return newSet;
          });
        }
      } catch (error) {
        console.error('Error fetching block status:', error);
      }
    };

    fetchBlockStatus();
  }, [activeConversation?.id, API_BASE]);

  // Close header menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target)) {
        setShowHeaderMenu(false);
      }
    };

    if (showHeaderMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHeaderMenu]);

  const handleBlockUser = async () => {
    if (!blockDialog.userId) return;

    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/api/chat/users/${blockDialog.userId}/block`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setBlockedUsers(prev => {
          const newSet = new Set(prev);
          if (data.blocked) {
            newSet.add(blockDialog.userId);
          } else {
            newSet.delete(blockDialog.userId);
          }
          return newSet;
        });
        toast.success(data.message);
        setBlockDialog({ isOpen: false, userId: null, isBlocked: false });
        setShowHeaderMenu(false);
      } else {
        toast.error(data.message || 'Failed to block/unblock user');
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error('Failed to block/unblock user');
    }
  };

  const handleClearChat = async () => {
    if (!clearChatDialog.roomId) return;

    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/api/chat/conversations/${clearChatDialog.roomId}/messages`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setMessages([]);
        toast.success('Chat cleared successfully');
        setClearChatDialog({ isOpen: false, roomId: null });
        setShowHeaderMenu(false);
      } else {
        toast.error(data.message || 'Failed to clear chat');
      }
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast.error('Failed to clear chat');
    }
  };

  const handleProfileClick = () => {
    if (!activeConversation || activeConversation.type !== 'direct') return;
    
    const otherUser = getOtherParticipant(activeConversation);
    const otherUserId = otherUser?.id?.toString() || otherUser?._id?.toString();
    if (otherUserId) {
      navigate(`/profile/${otherUserId}`);
    }
  };

  const handleInitiateCall = async (callType) => {
    if (!activeConversation) {
      toast.error('No conversation selected');
      return;
    }

    const isGroup = activeConversation.type === 'group';
    
    // For 1-on-1 calls
    if (!isGroup) {
      const otherUser = getOtherParticipant(activeConversation);
      const otherUserId = otherUser?.id?.toString() || otherUser?._id?.toString();
      
      if (!otherUserId) {
        toast.error('Unable to find user');
        return;
      }

      // Check if user is blocked
      if (blockedUsers.has(otherUserId)) {
        toast.error('Cannot call blocked user');
        return;
      }
    }

    try {
      setCallState(prev => ({ ...prev, isCalling: true }));
      
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/api/calls/create-room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          otherUserId: !isGroup ? getOtherParticipant(activeConversation)?.id?.toString() || getOtherParticipant(activeConversation)?._id?.toString() : null,
          roomId: isGroup ? activeConversation.id : null,
          callType,
          isGroup
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to initiate call');
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('[Call] Call initiated successfully:', {
          meetingId: data.meeting.meetingId,
          callType: data.callType || callType,
          isGroup,
          isCalling: !isGroup,
          currentUserId: currentUserId?.toString()
        });
        
        setCallState({
          isActive: true,
          meetingId: data.meeting.meetingId,
          token: data.meeting.token,
          callType: data.callType || callType,
          isIncoming: false,
          callerInfo: null,
          isCalling: !isGroup, // For groups, no need to wait for acceptance
          isGroup: isGroup,
          apiKey: data.apiKey || import.meta.env.VITE_VIDEOSDK_API_KEY || null // API key from backend response or env
        });
        
        // For 1-on-1 calls, log that we're waiting for acceptance
        if (!isGroup) {
          console.log('[Call] Waiting for receiver to accept call...');
        }
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      toast.error(error.message || 'Failed to initiate call');
      setCallState(prev => ({ ...prev, isCalling: false }));
    }
  };

  const handleAcceptCall = async () => {
    if (!callState.meetingId || !callState.token) {
      toast.error('Invalid call data');
      return;
    }

    console.log('[Call] Accepting call:', { 
      meetingId: callState.meetingId, 
      callerId: callState.callerInfo?.id,
      socketConnected: socket && isConnected 
    });

    // Notify caller that call was accepted (only for 1-on-1 calls)
    if (socket && isConnected && callState.callerInfo && !callState.isGroup) {
      const callerId = callState.callerInfo.id?.toString() || callState.callerInfo.id;
      console.log('[Call] Emitting call_accepted event to caller:', {
        callerId,
        callerIdType: typeof callerId,
        meetingId: callState.meetingId,
        socketId: socket.id,
        socketConnected: socket.connected
      });
      socket.emit('call_accepted', {
        meetingId: callState.meetingId,
        callerId: callerId
      });
    } else {
      console.warn('[Call] Cannot emit call_accepted:', {
        hasSocket: !!socket,
        isConnected,
        hasCallerInfo: !!callState.callerInfo,
        isGroup: callState.isGroup
      });
    }

    // Stop ringing sound when call is accepted
    if (ringingAudioRef.current) {
      ringingAudioRef.current.pause();
      ringingAudioRef.current.currentTime = 0;
    }
    
    // Switch from incoming call notification to active call
    // Keep isActive=true, meetingId, token, and callType
    setCallState(prev => {
      const newState = {
        ...prev,
        isIncoming: false,
        isCalling: false
        // All other state (isActive, meetingId, token, callType) is preserved
      };
      console.log('[Call] Receiver state after accepting:', newState);
      return newState;
    });
  };

  const handleRejectCall = () => {
    // Stop ringing sound
    if (ringingAudioRef.current) {
      ringingAudioRef.current.pause();
      ringingAudioRef.current.currentTime = 0;
    }
    
    // Notify caller that call was rejected
    if (socket && isConnected && callState.callerInfo) {
      socket.emit('call_rejected', {
        callerId: callState.callerInfo.id
      });
    }

    setCallState({
      isActive: false,
      meetingId: null,
      token: null,
      callType: 'video',
      isIncoming: false,
      callerInfo: null,
      isCalling: false,
      isGroup: false,
      apiKey: null
    });
  };

  const handleCallEnded = async () => {
    // Clear timeout if it exists
    if (oneOnOneCallTimeoutRef.current) {
      clearTimeout(oneOnOneCallTimeoutRef.current);
      oneOnOneCallTimeoutRef.current = null;
    }

    // End the VideoSDK session on server (proper cleanup)
    if (callState.meetingId) {
      try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const response = await fetch(`${API_BASE}/api/calls/end-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            meetingId: callState.meetingId
          })
        });
        
        if (response.ok) {
          console.log('[Call] Session ended successfully on server');
        } else {
          const errorData = await response.json();
          console.log('[Call] Session end response (might be expected):', errorData);
          // Continue even if this fails - session might already be ended or client-side leave() handles it
        }
      } catch (error) {
        console.error('[Call] Error ending session on server:', error);
        // Continue even if this fails - client-side leave() should handle it
      }
    }

    // Notify other user(s) that call ended
    if (socket && isConnected) {
      if (callState.isGroup) {
        // For group calls, notify all participants in the room
        if (activeConversation?.id) {
          socket.emit('call_ended', {
            roomId: activeConversation.id
          });
        }
      } else {
        // For 1-on-1 calls, notify the other user
        const otherUser = getOtherParticipant(activeConversation);
        const otherUserId = otherUser?.id?.toString() || otherUser?._id?.toString();
        
        if (otherUserId) {
          // Determine who is caller and receiver based on who initiated
          // If we were receiving (isIncoming=true), we were the receiver, other was caller
          // If we were calling (isIncoming=false), we were the caller, other was receiver
          socket.emit('call_ended', {
            callerId: callState.isIncoming ? otherUserId : currentUserId?.toString(),
            receiverId: callState.isIncoming ? currentUserId?.toString() : otherUserId
          });
        }
      }
    }

    // Clear all call state to ensure fresh meeting on next call
    setCallState({
      isActive: false,
      meetingId: null,
      token: null,
      callType: 'video',
      isIncoming: false,
      callerInfo: null,
      isCalling: false,
      isGroup: false,
      apiKey: null // Clear API key as well
    });
    
    console.log('[Call] Call ended - all state cleared, ready for new call');
  };

  const handleTypingStart = () => {
    if (socket && isConnected && activeConversation) {
      socket.emit('typing_start', { roomId: activeConversation.id });
    }
  };

  const handleTypingStop = () => {
    if (socket && isConnected && activeConversation) {
      socket.emit('typing_stop', { roomId: activeConversation.id });
    }
  };

  // Play/stop calling sound when caller is waiting
  useEffect(() => {
    if (callState.isCalling && !callState.isIncoming && !callState.isGroup) {
      // Caller is waiting for receiver to accept
      const playCallingSound = async () => {
        if (callingAudioRef.current) {
          try {
            await callingAudioRef.current.play();
            audioUnlockedRef.current = true; // Mark as unlocked if successful
          } catch (error) {
            console.log('Could not play calling sound:', error);
            // If autoplay is blocked, audio should be unlocked by user interaction (calling is user-initiated)
            if (error.name === 'NotAllowedError' && !audioUnlockedRef.current) {
              // Try to unlock by playing a silent audio first
              try {
                const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
                await silentAudio.play();
                silentAudio.pause();
                audioUnlockedRef.current = true;
                // Retry playing calling sound
                if (callingAudioRef.current) {
                  await callingAudioRef.current.play();
                }
              } catch (retryError) {
                console.log('Could not unlock and play calling sound:', retryError);
              }
            }
          }
        }
      };
      playCallingSound();
    } else {
      // Stop calling sound
      if (callingAudioRef.current) {
        callingAudioRef.current.pause();
        callingAudioRef.current.currentTime = 0;
      }
    }
  }, [callState.isCalling, callState.isIncoming, callState.isGroup]);

  // 60-second timeout for one-on-one calls
  useEffect(() => {
    // Clear any existing timeout
    if (oneOnOneCallTimeoutRef.current) {
      clearTimeout(oneOnOneCallTimeoutRef.current);
      oneOnOneCallTimeoutRef.current = null;
    }

    // Start timeout only for one-on-one outgoing calls
    if (callState.isCalling && !callState.isIncoming && !callState.isGroup && activeConversation) {
      const otherUser = getOtherParticipant(activeConversation);
      const otherUserName = otherUser?.username || otherUser?.name || otherUser?.email?.split('@')[0] || 'User';
      
      console.log('[Call] Starting 60-second timeout for one-on-one call');
      
      oneOnOneCallTimeoutRef.current = setTimeout(() => {
        console.log('[Call] 60-second timeout reached - user unavailable');
        
        // Stop calling sound
        if (callingAudioRef.current) {
          callingAudioRef.current.pause();
          callingAudioRef.current.currentTime = 0;
        }
        
        // Show unavailable message
        toast.error(`${otherUserName} is unavailable`);
        
        // End the call
        setCallState({
          isActive: false,
          meetingId: null,
          token: null,
          callType: 'video',
          isIncoming: false,
          callerInfo: null,
          isCalling: false,
          isGroup: false,
          apiKey: null
        });
        
        // Clear timeout ref
        oneOnOneCallTimeoutRef.current = null;
      }, 60000); // 60 seconds
    }

    // Cleanup timeout on unmount or when call state changes
    return () => {
      if (oneOnOneCallTimeoutRef.current) {
        clearTimeout(oneOnOneCallTimeoutRef.current);
        oneOnOneCallTimeoutRef.current = null;
      }
    };
  }, [callState.isCalling, callState.isIncoming, callState.isGroup, activeConversation, toast]);

  // Play/stop ringing sound when receiver gets incoming call
  useEffect(() => {
    if (callState.isIncoming && callState.isActive) {
      // Receiver got incoming call
      const playRingingSound = async () => {
        if (ringingAudioRef.current) {
          try {
            await ringingAudioRef.current.play();
            audioUnlockedRef.current = true; // Mark as unlocked if successful
          } catch (error) {
            console.log('Could not play ringing sound:', error);
            // If autoplay is blocked, try to unlock audio and retry
            if (error.name === 'NotAllowedError') {
              // Try to unlock by playing a silent audio first
              try {
                const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
                await silentAudio.play();
                silentAudio.pause();
                audioUnlockedRef.current = true;
                // Retry playing ringing sound
                if (ringingAudioRef.current) {
                  await ringingAudioRef.current.play();
                }
              } catch (retryError) {
                console.log('Could not unlock and play ringing sound:', retryError);
                // Show a visual indicator that sound is blocked
                toast.error('Please click anywhere to enable call sounds');
              }
            }
          }
        }
      };
      playRingingSound();
    } else {
      // Stop ringing sound
      if (ringingAudioRef.current) {
        ringingAudioRef.current.pause();
        ringingAudioRef.current.currentTime = 0;
      }
    }
  }, [callState.isIncoming, callState.isActive]);

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format last seen time in human-readable format
  const formatLastSeen = (lastSeenDate) => {
    if (!lastSeenDate) return 'Offline';
    
    const now = new Date();
    const lastSeen = new Date(lastSeenDate);
    const diffMs = now - lastSeen;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `Last seen ${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `Last seen ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 7) return `Last seen ${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    
    // Format as date
    return `Last seen ${lastSeen.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <DashboardNavbar />
      
      {/* Chat Interface */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left Sidebar - Conversations */}
      <div className="w-full md:w-1/3 lg:w-1/4 border-r border-gray-200 bg-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">Chats</h1>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowCreateGroupModal(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                title="Create group"
              >
                <Plus size={20} className="text-gray-600" />
              </button>
            </div>
          </div>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 text-black placeholder-gray-500 bg-white"
            style={{ color: '#000000' }}
          />
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading conversations...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </div>
          ) : (
            filteredConversations.map(conversation => {
              const otherUser = getOtherParticipant(conversation);
              // Use a unique key - if no id (placeholder), use participant id
              const uniqueKey = conversation.id || `placeholder-${conversation.participants?.[0]?.id || 'unknown'}`;
              // Convert userId to string for comparison - handle both id and _id
              const otherUserId = otherUser?.id?.toString() || otherUser?._id?.toString();
              const isOnline = conversation.type === 'direct' && otherUserId && onlineUsersInChat.has(otherUserId);
              
              return (
                          <ConversationItem
                            key={uniqueKey}
                            conversation={{
                              ...conversation,
                              isOnline: isOnline
                            }}
                            isActive={activeConversation?.id === conversation.id || 
                              (conversation.isPlaceholder && activeConversation?.participants?.[0]?.id === conversation.participants?.[0]?.id)}
                            onClick={() => setActiveConversation(conversation)}
                            currentUserId={currentUserId}
                          />
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel - Chat Window */}
      <div className="flex-1 flex flex-col bg-white">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                {(() => {
                  const otherUser = getOtherParticipant(activeConversation);
                  return activeConversation.type === 'group' ? (
                    activeConversation.profilePicture ? (
                      <img
                        src={activeConversation.profilePicture}
                        alt={activeConversation.name}
                        className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setShowGroupInfoModal(true)}
                        title="Group info"
                      />
                    ) : (
                      <div 
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setShowGroupInfoModal(true)}
                        title="Group info"
                      >
                        <Users size={20} className="text-white" />
                      </div>
                    )
                  ) : (
                    otherUser?.profilePicture ? (
                      <img
                        src={otherUser.profilePicture}
                        alt={activeConversation.name}
                        className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={handleProfileClick}
                        title="View profile"
                      />
                    ) : (
                      <div 
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-semibold cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={handleProfileClick}
                        title="View profile"
                      >
                        {activeConversation.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )
                  );
                })()}
                <div 
                  className={activeConversation.type === 'group' ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
                  onClick={() => activeConversation.type === 'group' && setShowGroupInfoModal(true)}
                  title={activeConversation.type === 'group' ? 'Group info' : ''}
                >
                  <h2 className="font-semibold text-gray-900 text-base">{activeConversation.name}</h2>
                            {activeConversation.type === 'direct' &&                             (() => {
                              const otherUser = getOtherParticipant(activeConversation);
                              const otherUserId = otherUser?.id?.toString() || otherUser?._id?.toString();
                              const isOnline = otherUserId && onlineUsersInChat.has(otherUserId);
                              const lastSeen = otherUserId ? userLastSeen.get(otherUserId) : null;
                              return (
                                <p className="text-sm text-gray-500">
                                  {isOnline ? 'Online' : formatLastSeen(lastSeen)}
                                </p>
                              );
                            })()}
                  {activeConversation.type === 'group' && (
                    <p className="text-sm text-gray-500">
                      {activeConversation.subtitle || 'Group Chat'}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Call buttons for both direct and group chats */}
                <button 
                  onClick={() => handleInitiateCall('voice')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  title="Voice call"
                  disabled={callState.isCalling || callState.isActive}
                >
                  <Phone size={20} className="text-gray-600" />
                </button>
                <button 
                  onClick={() => handleInitiateCall('video')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  title="Video call"
                  disabled={callState.isCalling || callState.isActive}
                >
                  <Video size={20} className="text-gray-600" />
                </button>
                {activeConversation.type === 'group' && (
                  <button 
                    onClick={() => setShowGroupInfoModal(true)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    title="Group info"
                  >
                    <Info size={20} className="text-gray-600" />
                  </button>
                )}
                <div className="relative" ref={headerMenuRef}>
                  <button 
                    onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    title="More options"
                  >
                    <MoreVertical size={20} className="text-gray-600" />
                  </button>
                  
                  {showHeaderMenu && activeConversation && (
                    <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 min-w-[200px] z-50 py-1">
                      {activeConversation.type === 'direct' && (() => {
                        const otherUser = getOtherParticipant(activeConversation);
                        const otherUserId = otherUser?.id?.toString() || otherUser?._id?.toString();
                        const isBlocked = otherUserId && blockedUsers.has(otherUserId);
                        
                        return (
                          <button
                            onClick={() => {
                              setBlockDialog({ isOpen: true, userId: otherUserId, isBlocked });
                              setShowHeaderMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-3 transition-colors cursor-pointer text-gray-700"
                            type="button"
                          >
                            <Ban size={16} />
                            <span>{isBlocked ? 'Unblock User' : 'Block User'}</span>
                          </button>
                        );
                      })()}
                      
                      <button
                        onClick={() => {
                          setClearChatDialog({ isOpen: true, roomId: activeConversation.id });
                          setShowHeaderMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-3 transition-colors cursor-pointer text-red-600"
                        type="button"
                      >
                        <Trash2 size={16} />
                        <span>Clear Chat</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-6 bg-gray-50"
            >
              {messagesLoading && messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">Loading messages...</div>
              ) : (
                <>
                  {messages.map((message, index) => {
                    // Check if this is a system message
                    if (message.messageType === 'system') {
                      return (
                        <SystemMessage
                          key={message.id}
                          message={message}
                        />
                      );
                    }

                    const isOwn = message.sender?.id?.toString() === (currentUserId?.toString() || currentUser._id?.toString());
                    // Show avatar if it's the first message, or if previous message was from different sender
                    const showAvatar = activeConversation.type === 'group' && !isOwn && (
                      index === 0 || messages[index - 1].sender?.id !== message.sender?.id
                    );
                    return (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isOwn={isOwn}
                        showAvatar={showAvatar}
                        isGroupChat={activeConversation.type === 'group'}
                        onCopy={handleCopyMessage}
                        onDelete={handleDeleteMessage}
                        onReport={handleReportMessage}
                        onSaveToDownloads={handleSaveToDownloads}
                      />
                    );
                  })}
                  {Array.from(typingUsers).map(userId => (
                    <TypingIndicator key={userId} />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
              
              {/* Blocked User Card */}
              {activeConversation.type === 'direct' && (() => {
                const otherUser = getOtherParticipant(activeConversation);
                const otherUserId = otherUser?.id?.toString() || otherUser?._id?.toString();
                const isBlocked = otherUserId && blockedUsers.has(otherUserId);
                
                if (isBlocked) {
                  return (
                    <div className="px-6 pb-4">
                      <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 flex flex-col items-center gap-3">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Ban size={20} className="text-gray-600" />
                          <p className="text-sm font-medium">You have blocked this contact</p>
                        </div>
                        <p className="text-xs text-gray-600 text-center">
                          Unblock to start chatting again
                        </p>
                        <button
                          onClick={() => {
                            setBlockDialog({ isOpen: true, userId: otherUserId, isBlocked: true });
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer"
                          type="button"
                        >
                          Unblock
                        </button>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Message Input */}
            {(() => {
              const otherUser = getOtherParticipant(activeConversation);
              const otherUserId = otherUser?.id?.toString() || otherUser?._id?.toString();
              const isBlocked = activeConversation.type === 'direct' && otherUserId && blockedUsers.has(otherUserId);
              
              return (
                <MessageInput
                  onSendMessage={handleSendMessage}
                  onTypingStart={handleTypingStart}
                  onTypingStop={handleTypingStop}
                  disabled={!isConnected || isBlocked}
                  onError={(message) => toast.error(message)}
                />
              );
            })()}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500 text-lg">Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <Dialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, message: null })}
        onConfirm={confirmDeleteMessage}
        title="Delete Message"
        message="Are you sure you want to delete this message? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      <ReportDialog
        isOpen={reportDialog.isOpen}
        onClose={() => setReportDialog({ isOpen: false, message: null })}
        onConfirm={confirmReportMessage}
        title="Report Message"
        itemType="message"
      />

      <Dialog
        isOpen={blockDialog.isOpen}
        onClose={() => setBlockDialog({ isOpen: false, userId: null, isBlocked: false })}
        onConfirm={handleBlockUser}
        title={blockDialog.isBlocked ? "Unblock User" : "Block User"}
        message={blockDialog.isBlocked 
          ? "Are you sure you want to unblock this user? You will be able to receive messages from them again."
          : "Are you sure you want to block this user? You will not receive messages from them and they will not be able to see your messages."}
        confirmText={blockDialog.isBlocked ? "Unblock" : "Block"}
        cancelText="Cancel"
        type="danger"
      />

      <Dialog
        isOpen={clearChatDialog.isOpen}
        onClose={() => setClearChatDialog({ isOpen: false, roomId: null })}
        onConfirm={handleClearChat}
        title="Clear Chat"
        message="Are you sure you want to clear all messages in this chat? This action cannot be undone."
        confirmText="Clear"
        cancelText="Cancel"
        type="danger"
      />

      {/* Modals */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onGroupCreated={async (group) => {
          // Immediately add the new group to conversations
          const newConversation = {
            id: group.id,
            name: group.name,
            type: 'group',
            participants: group.participants,
            lastMessage: null,
            lastMessageAt: new Date(),
            unreadCount: 0,
            isAdmin: true,
            createdBy: true,
            avatar: ''
          };
          
          // Add to conversations list immediately
          setConversations(prev => [newConversation, ...prev]);
          
          // Set as active conversation
          setActiveConversation(newConversation);
          
          // Join the room via socket
          if (socket && isConnected) {
            socket.emit('join_room', group.id);
          }
          
          // Refresh conversations to get latest data
          fetchConversations();
        }}
      />
      {activeConversation?.type === 'group' && (
        <>
          <GroupInfoModal
            isOpen={showGroupInfoModal}
            onClose={() => setShowGroupInfoModal(false)}
            groupId={activeConversation.id}
            currentUserId={currentUserId}
            onGroupUpdated={() => {
              fetchConversations();
              if (activeConversation) {
                // Refresh active conversation
                const updatedConv = conversations.find(c => c.id === activeConversation.id);
                if (updatedConv) {
                  setActiveConversation(updatedConv);
                }
              }
            }}
            onGroupLeft={() => {
              setActiveConversation(null);
              fetchConversations();
            }}
          />
          <InviteLinkModal
            isOpen={showInviteLinkModal}
            onClose={() => setShowInviteLinkModal(false)}
            groupId={activeConversation.id}
          />
        </>
      )}

      {/* Calling Modal - waiting for other person to accept */}
      {callState.isActive && !callState.isIncoming && callState.isCalling && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)'
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="mb-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-semibold text-3xl mx-auto animate-pulse">
                  {getOtherParticipant(activeConversation)?.username?.[0]?.toUpperCase() || 
                   getOtherParticipant(activeConversation)?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {getOtherParticipant(activeConversation)?.username || 
                 getOtherParticipant(activeConversation)?.email?.split('@')[0] || 'User'}
              </h3>
              <p className="text-gray-600 mb-8 text-lg">
                {callState.callType === 'video' ? 'Video calling...' : 'Calling...'}
              </p>
              <div className="flex items-center justify-center mb-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
              <button
                onClick={handleCallEnded}
                className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold cursor-pointer"
              >
                Cancel Call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Call Modal - Active Call (after both parties are ready) */}
      {callState.isActive && !callState.isIncoming && !callState.isCalling && callState.meetingId && callState.token && (
        <VideoCallModal
          isOpen={true}
          onClose={handleCallEnded}
          meetingId={callState.meetingId}
          token={callState.token}
          callType={callState.callType}
          isIncoming={false}
          callerInfo={null}
          currentUserName={currentUser.username || currentUser.name || currentUser.email?.split('@')[0] || 'User'}
          onCallEnded={handleCallEnded}
          apiKey={callState.apiKey}
          isGroup={callState.isGroup}
          onTimeoutMessage={(message) => {
            toast.error(message);
          }}
        />
      )}

      {/* Incoming Call Notification */}
      {callState.isActive && callState.isIncoming && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)'
            }}
            onClick={async () => {
              // Unlock audio when user clicks anywhere on the incoming call modal
              if (!audioUnlockedRef.current && ringingAudioRef.current) {
                try {
                  await ringingAudioRef.current.play();
                  ringingAudioRef.current.pause();
                  ringingAudioRef.current.currentTime = 0;
                  audioUnlockedRef.current = true;
                  // Now play the ringing sound
                  await ringingAudioRef.current.play();
                } catch (error) {
                  console.log('Could not unlock audio:', error);
                }
              }
            }}
          >
            <div 
              className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="mb-4">
                  {callState.callerInfo?.profilePicture ? (
                    <img
                      src={callState.callerInfo.profilePicture}
                      alt={callState.callerInfo.name}
                      className="w-20 h-20 rounded-full object-cover mx-auto animate-pulse"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-semibold text-2xl mx-auto animate-pulse">
                      {callState.callerInfo?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {callState.isGroup ? 'Group ' : ''}{callState.callerInfo?.name || 'Incoming Call'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {callState.callType === 'video' ? 'Video call' : 'Voice call'}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleRejectCall}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold cursor-pointer"
                  >
                    Decline
                  </button>
                  <button
                    onClick={async () => {
                      // Try to unlock audio on button click if not already unlocked
                      if (!audioUnlockedRef.current && ringingAudioRef.current) {
                        try {
                          await ringingAudioRef.current.play();
                          ringingAudioRef.current.pause();
                          ringingAudioRef.current.currentTime = 0;
                          audioUnlockedRef.current = true;
                        } catch (error) {
                          console.log('Could not unlock audio:', error);
                        }
                      }
                      handleAcceptCall();
                    }}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold cursor-pointer"
                  >
                    Accept
                  </button>
                </div>
              </div>
            </div>
          </div>
      )}

      </div>

      {/* Audio elements for call sounds */}
      <audio 
        ref={callingAudioRef} 
        src="/sounds/calling.mp3" 
        loop 
        preload="auto"
      />
      <audio 
        ref={ringingAudioRef} 
        src="/sounds/ringing.mp3" 
        loop 
        preload="auto"
      />
    </div>
  );
};

export default Chat;

