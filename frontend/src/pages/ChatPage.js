import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Sidebar from '../components/chat/Sidebar';
import ChatArea from '../components/chat/ChatArea';
import RoomInfoPanel from '../components/chat/RoomInfoPanel';
import api from '../services/api';
import './ChatPage.css';

export default function ChatPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { joinRoom, leaveRoom, on } = useSocket();

  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch all rooms on mount
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const { data } = await api.get('/api/chat/rooms');
        setRooms(data.rooms || []);
        // Auto-select room from URL param or first room
        if (roomId) {
          const found = data.rooms?.find((r) => r._id === roomId);
          if (found) setActiveRoom(found);
        } else if (data.rooms?.length > 0) {
          navigate(`/chat/${data.rooms[0]._id}`, { replace: true });
        }
      } catch {
        // Rooms load error — handled silently, user sees empty state
      } finally {
        setLoadingRooms(false);
      }
    };
    fetchRooms();
  }, [roomId, navigate]);

  // Join/leave socket room when activeRoom changes
  useEffect(() => {
    if (!activeRoom) return;
    joinRoom(activeRoom._id);
    return () => leaveRoom(activeRoom._id);
  }, [activeRoom, joinRoom, leaveRoom]);

  // Fetch messages for active room
  useEffect(() => {
    if (!activeRoom) return;
    const fetchMessages = async () => {
      setLoadingMessages(true);
      setMessages([]);
      setPage(1);
      setHasMore(true);
      try {
        const { data } = await api.get(`/api/chat/rooms/${activeRoom._id}/messages?page=1&limit=50`);
        setMessages(data.messages || []);
        setHasMore(data.hasMore || false);
      } catch {
        // Message load error
      } finally {
        setLoadingMessages(false);
      }
    };
    fetchMessages();
  }, [activeRoom]);

  // Load more (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!activeRoom || !hasMore || loadingMessages) return;
    const nextPage = page + 1;
    try {
      const { data } = await api.get(
        `/api/chat/rooms/${activeRoom._id}/messages?page=${nextPage}&limit=50`
      );
      setMessages((prev) => [...(data.messages || []), ...prev]);
      setHasMore(data.hasMore || false);
      setPage(nextPage);
    } catch {
      // Pagination error
    }
  }, [activeRoom, hasMore, loadingMessages, page]);

  // Listen for new messages via socket
  useEffect(() => {
    const unsub = on('new-message', (msg) => {
      if (msg.roomId === activeRoom?._id) {
        setMessages((prev) => [...prev, msg]);
      }
      // Update room last message preview
      setRooms((prev) =>
        prev.map((r) =>
          r._id === msg.roomId
            ? { ...r, lastMessage: msg.content, lastMessageAt: msg.createdAt }
            : r
        )
      );
    });
    return unsub;
  }, [on, activeRoom]);

  const selectRoom = useCallback(
    (room) => {
      setActiveRoom(room);
      navigate(`/chat/${room._id}`);
    },
    [navigate]
  );

  const handleRoomCreated = (newRoom) => {
    setRooms((prev) => [newRoom, ...prev]);
    selectRoom(newRoom);
  };

  return (
    <div className="chat-layout">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="chat-layout__sidebar"
            initial={{ x: -260, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -260, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <Sidebar
              rooms={rooms}
              activeRoom={activeRoom}
              onSelectRoom={selectRoom}
              onRoomCreated={handleRoomCreated}
              loading={loadingRooms}
              currentUser={user}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main chat area */}
      <div className="chat-layout__main">
        <ChatArea
          room={activeRoom}
          messages={messages}
          loading={loadingMessages}
          hasMore={hasMore}
          onLoadMore={loadMoreMessages}
          currentUser={user}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onToggleInfo={() => setInfoPanelOpen(!infoPanelOpen)}
          sidebarOpen={sidebarOpen}
        />
      </div>

      {/* Info panel */}
      <AnimatePresence>
        {infoPanelOpen && activeRoom && (
          <motion.div
            className="chat-layout__info"
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <RoomInfoPanel
              room={activeRoom}
              onClose={() => setInfoPanelOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
