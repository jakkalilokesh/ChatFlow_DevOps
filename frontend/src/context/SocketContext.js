import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SOCKET_URL } from '../config';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user }    = useAuth();
  const socketRef   = useRef(null);
  const listenersRef = useRef([]);
  const [isConnected,    setIsConnected]    = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [onlineUsers,    setOnlineUsers]    = useState([]);
  const [typingUsers,    setTypingUsers]    = useState({});

  const token = localStorage.getItem('chatflow_token');

  const on = useCallback((event, callback) => {
    listenersRef.current.push({ event, callback });
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
    return () => {
      listenersRef.current = listenersRef.current.filter(
        (l) => !(l.event === event && l.callback === callback)
      );
      if (socketRef.current) {
        socketRef.current.off(event, callback);
      }
    };
  }, []);

  const sendMessage = useCallback((roomId, content, type = 'text', replyTo = null) => {
    if (socketRef.current) {
      socketRef.current.emit('send-message', { roomId, content, type, replyTo });
    }
  }, []);

  const joinRoom = useCallback((roomId) => {
    if (socketRef.current) {
      socketRef.current.emit('join-room', { roomId });
    }
  }, []);

  const leaveRoom = useCallback((roomId) => {
    if (socketRef.current) {
      socketRef.current.emit('leave-room', { roomId });
    }
  }, []);

  const startTyping = useCallback((roomId) => {
    if (socketRef.current) {
      socketRef.current.emit('typing-start', { roomId });
    }
  }, []);

  const stopTyping = useCallback((roomId) => {
    if (socketRef.current) {
      socketRef.current.emit('typing-stop', { roomId });
    }
  }, []);

  useEffect(() => {
    if (!token || !user) return;

    const socket = io(
      SOCKET_URL || window.location.origin,
      {
        path:        '/socket.io/',
        auth:        { token },
        transports:  ['websocket', 'polling'],
        reconnection:         true,
        reconnectionAttempts: 5,
        reconnectionDelay:    1000,
        reconnectionDelayMax: 5000,
        timeout:              20000,
        forceNew:             true,
      }
    );

    socketRef.current = socket;

    // Re-bind all active dynamic listeners
    listenersRef.current.forEach(({ event, callback }) => {
      socket.on(event, callback);
    });

    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      console.log('✅ Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.warn('Socket disconnected:', reason);
      // Auto-reconnect on server-side disconnect
      if (reason === 'io server disconnect') socket.connect();
    });

    socket.on('connect_error', (err) => {
      setConnectionError(err.message);
      console.error('Socket error:', err.message);
    });

    socket.on('users:online', (users) => setOnlineUsers(users));
    socket.on('user:online',  (userId) => setOnlineUsers((p) => [...new Set([...p, userId])]));
    socket.on('user:offline', (userId) => setOnlineUsers((p) => p.filter((id) => id !== userId)));

    socket.on('user-typing', ({ userId: typingUserId, username: typingUsername, roomId }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [roomId]: {
          ...(prev[roomId] || {}),
          [typingUserId]: typingUsername,
        },
      }));
    });

    socket.on('user-stopped-typing', ({ userId: typingUserId, roomId }) => {
      setTypingUsers((prev) => {
        const roomTyping = { ...(prev[roomId] || {}) };
        delete roomTyping[typingUserId];
        return {
          ...prev,
          [roomId]: roomTyping,
        };
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [token, user?.id]); // eslint-disable-line

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      isConnected,
      connected: isConnected,
      connectionError,
      onlineUsers,
      typingUsers,
      on,
      sendMessage,
      joinRoom,
      leaveRoom,
      startTyping,
      stopTyping,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
