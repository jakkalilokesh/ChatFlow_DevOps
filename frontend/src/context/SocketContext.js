import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user }    = useAuth();
  const socketRef   = useRef(null);
  const [isConnected,    setIsConnected]    = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [onlineUsers,    setOnlineUsers]    = useState([]);

  const token = localStorage.getItem('chatflow_token');

  useEffect(() => {
    if (!token || !user) return;

    const socket = io(
      process.env.REACT_APP_WS_URL || process.env.REACT_APP_SOCKET_URL || window.location.origin,
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
      connectionError,
      onlineUsers,
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
