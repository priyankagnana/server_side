import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    if (!token) {
      return;
    }

    // Connect to socket server
    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    // Remove /api prefix if present for socket connection
    const socketUrl = serverUrl.replace('/api', '');
    const newSocket = io(socketUrl, {
      auth: {
        token
      },
      transports: ['websocket', 'polling']
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    // Online/offline status (general connection)
    newSocket.on('user_online', ({ userId }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.add(userId?.toString());
        return newSet;
      });
    });

    newSocket.on('user_offline', ({ userId }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId?.toString());
        return newSet;
      });
    });

    // Note: Online status is now handled via polling in Chat.jsx
    // The socket enter/leave events still fire for server-side tracking,
    // but the client uses polling to get the list of online users

    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  // Reconnect if token changes
  useEffect(() => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    if (!token && socketRef.current) {
      socketRef.current.disconnect();
      setSocket(null);
      setIsConnected(false);
    } else if (token && !socketRef.current?.connected) {
      // Reconnect if token is available but socket is not connected
      const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const socketUrl = serverUrl.replace('/api', '');
      const newSocket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling']
      });
      socketRef.current = newSocket;
      setSocket(newSocket);
    }
  }, [localStorage.getItem('authToken'), sessionStorage.getItem('authToken')]);

  const value = {
    socket,
    isConnected,
    onlineUsers,
    isUserOnline: (userId) => {
      if (!userId) return false;
      return onlineUsers.has(userId.toString());
    }
    // Note: isUserOnChatPage removed - use polling in Chat.jsx instead
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

