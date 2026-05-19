import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import WorkspaceSidebar from '../components/sidebar/WorkspaceSidebar';
import ChatArea from '../components/chat/ChatArea';
import RoomInfoPanel from '../components/chat/RoomInfoPanel';
import AIAssistantButton from '../components/ai/AIAssistantButton';
import { Logo } from '../components/common/Logo';
import api from '../services/api';
import './ChatPage.css';

export default function ChatPage() {
  const { roomId }   = useParams();
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const { joinRoom, leaveRoom, on } = useSocket();
  const isMobile     = useMediaQuery('(max-width: 768px)');
  const mainRef      = useRef(null);

  const [rooms,          setRooms]          = useState([]);
  const [activeRoom,     setActiveRoom]     = useState(null);
  const [messages,       setMessages]       = useState([]);
  const [loadingRooms,   setLoadingRooms]   = useState(true);
  const [loadingMessages,setLoadingMessages] = useState(false);
  const [sidebarOpen,    setSidebarOpen]    = useState(!isMobile);
  const [infoPanelOpen,  setInfoPanelOpen]  = useState(false);
  const [page,           setPage]           = useState(1);
  const [hasMore,        setHasMore]        = useState(true);

  // Close sidebar on mobile when route changes
  useEffect(() => { if (isMobile) setSidebarOpen(false); }, [roomId, isMobile]);

  // ── Fetch rooms ─────────────────────────────────────────
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const { data } = await api.get('/api/chat/rooms');
        const roomList = data.rooms || [];
        setRooms(roomList);
        if (roomId) {
          const found = roomList.find((r) => r._id === roomId);
          if (found) setActiveRoom(found);
        } else if (roomList.length > 0) {
          navigate(`/chat/${roomList[0]._id}`, { replace: true });
        }
      } catch (err) {
        console.error('Failed to fetch rooms:', err.message);
      } finally {
        setLoadingRooms(false);
      }
    };
    fetchRooms();
  }, []); // eslint-disable-line

  // ── Socket room join/leave ───────────────────────────────
  useEffect(() => {
    if (!activeRoom) return;
    joinRoom?.(activeRoom._id);
    return () => leaveRoom?.(activeRoom._id);
  }, [activeRoom?._id]); // eslint-disable-line

  // ── Fetch messages ───────────────────────────────────────
  useEffect(() => {
    if (!activeRoom) return;
    const fetch = async () => {
      setLoadingMessages(true);
      setMessages([]);
      setPage(1);
      setHasMore(true);
      try {
        const { data } = await api.get(
          `/api/chat/rooms/${activeRoom._id}/messages?page=1&limit=50`
        );
        setMessages(data.messages || []);
        setHasMore(data.hasMore || false);
      } catch (err) {
        console.error('Failed to fetch messages:', err.message);
      } finally {
        setLoadingMessages(false);
      }
    };
    fetch();
  }, [activeRoom?._id]); // eslint-disable-line

  // ── Infinite scroll (load older) ────────────────────────
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
    } catch {}
  }, [activeRoom, hasMore, loadingMessages, page]);

  // ── Real-time new messages ───────────────────────────────
  useEffect(() => {
    if (!on) return;
    const unsub = on('new-message', (msg) => {
      if (msg.roomId === activeRoom?._id) {
        setMessages((prev) => [...prev, msg]);
      }
      setRooms((prev) =>
        prev.map((r) =>
          r._id === msg.roomId
            ? { ...r, lastMessage: msg.content, lastMessageAt: msg.createdAt }
            : r
        )
      );
    });
    return unsub;
  }, [on, activeRoom?._id]); // eslint-disable-line

  // ── Room select ──────────────────────────────────────────
  const selectRoom = useCallback((room) => {
    setActiveRoom(room);
    navigate(`/chat/${room._id}`);
    if (isMobile) setSidebarOpen(false);
  }, [navigate, isMobile]);

  const handleRoomCreated = (newRoom) => {
    setRooms((prev) => [newRoom, ...prev]);
    selectRoom(newRoom);
  };

  // ── Layout ───────────────────────────────────────────────
  return (
    <div className="chat-layout" style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>

      {/* ── Mobile overlay ──────────────────────────────── */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            className="chat-layout__sidebar"
            initial={isMobile ? { x: -280 } : { x: 0 }}
            animate={{ x: 0 }}
            exit={isMobile ? { x: -280 } : { x: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            style={{
              width: 272,
              flexShrink: 0,
              ...(isMobile ? {
                position: 'fixed', left: 0, top: 0,
                height: '100%', zIndex: 50,
              } : {
                position: 'relative',
              }),
            }}
          >
            <WorkspaceSidebar
              rooms={rooms}
              activeRoom={activeRoom}
              onSelectRoom={selectRoom}
              onRoomCreated={handleRoomCreated}
              loadingRooms={loadingRooms}
              currentUser={user}
              onClose={() => setSidebarOpen(false)}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main area ───────────────────────────────────── */}
      <main
        ref={mainRef}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          minWidth: 0, overflow: 'hidden',
          paddingBottom: isMobile ? 'calc(60px + env(safe-area-inset-bottom))' : 0,
        }}
      >
        {/* Mobile header */}
        {isMobile && (
          <header style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-secondary)', flexShrink: 0,
          }}>
            <button
              onClick={() => setSidebarOpen(true)}
              className="touch-target"
              aria-label="Open sidebar"
              style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              ☰
            </button>
            {activeRoom ? (
              <span style={{ fontWeight: 600 }}># {activeRoom.name}</span>
            ) : (
              <Logo size={24} />
            )}
            {activeRoom && (
              <button
                onClick={() => setInfoPanelOpen(!infoPanelOpen)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}
                aria-label="Room info"
              >
                ℹ️
              </button>
            )}
          </header>
        )}

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
      </main>

      {/* ── Info panel ──────────────────────────────────── */}
      <AnimatePresence>
        {infoPanelOpen && activeRoom && (
          <motion.div
            key="info-panel"
            className="chat-layout__info"
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            style={{
              width: 300, flexShrink: 0,
              ...(isMobile ? {
                position: 'fixed', right: 0, top: 0,
                height: '100%', zIndex: 50,
              } : {}),
            }}
          >
            <RoomInfoPanel
              room={activeRoom}
              onClose={() => setInfoPanelOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AI FAB ──────────────────────────────────────── */}
      <AIAssistantButton currentRoom={activeRoom} />

      {/* ── Mobile bottom nav ───────────────────────────── */}
      {isMobile && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
          background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          padding: '4px 0', paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {[
            { icon: '💬', label: 'Chat',     path: '/chat' },
            { icon: '⚙️', label: 'Settings', path: '/settings' },
            { icon: '👤', label: 'Profile',  path: '/profile' },
          ].map(({ icon, label, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="touch-target"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 2, background: 'none', border: 'none',
                color: window.location.pathname.startsWith(path) ? 'var(--accent-purple)' : 'var(--text-secondary)',
                fontSize: 10, fontWeight: 500, cursor: 'pointer', minWidth: 44, minHeight: 44,
              }}
            >
              <span style={{ fontSize: 20 }}>{icon}</span>
              {label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
