import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const WS_URL = process.env.REACT_APP_WS_URL || '';

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const listenersRef = useRef({});

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('chatflow_token');
    const socket = io(`${WS_URL}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('user-typing', ({ userId, username, roomId }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [roomId]: { ...(prev[roomId] || {}), [userId]: username },
      }));
    });

    socket.on('user-stopped-typing', ({ userId, roomId }) => {
      setTypingUsers((prev) => {
        const updated = { ...(prev[roomId] || {}) };
        delete updated[userId];
        return { ...prev, [roomId]: updated };
      });
    });

    socket.on('user-joined', ({ userId }) => {
      setOnlineUsers((prev) => new Set([...prev, userId]));
    });

    socket.on('user-left', ({ userId }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    // Forward generic events to registered listeners
    const genericEvents = ['new-message', 'message-updated', 'message-deleted', 'error'];
    genericEvents.forEach((event) => {
      socket.on(event, (data) => {
        const listeners = listenersRef.current[event] || [];
        listeners.forEach((cb) => cb(data));
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user]);

  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const on = useCallback((event, callback) => {
    listenersRef.current[event] = listenersRef.current[event] || [];
    listenersRef.current[event].push(callback);
    return () => {
      listenersRef.current[event] = (listenersRef.current[event] || []).filter(
        (cb) => cb !== callback
      );
    };
  }, []);

  const joinRoom = useCallback(
    (roomId) => emit('join-room', { roomId }),
    [emit]
  );

  const leaveRoom = useCallback(
    (roomId) => emit('leave-room', { roomId }),
    [emit]
  );

  const sendMessage = useCallback(
    (roomId, content, type = 'text', replyTo = null) =>
      emit('send-message', { roomId, content, type, replyTo }),
    [emit]
  );

  const startTyping = useCallback(
    (roomId) => emit('typing-start', { roomId }),
    [emit]
  );

  const stopTyping = useCallback(
    (roomId) => emit('typing-stop', { roomId }),
    [emit]
  );

  const markRead = useCallback(
    (roomId) => emit('mark-read', { roomId }),
    [emit]
  );

  return (
    <SocketContext.Provider
      value={{
        connected,
        typingUsers,
        onlineUsers,
        emit,
        on,
        joinRoom,
        leaveRoom,
        sendMessage,
        startTyping,
        stopTyping,
        markRead,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
