import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import WorkspaceSidebar from '../components/sidebar/WorkspaceSidebar';
import ChatArea from '../components/chat/ChatArea';
import RoomInfoPanel from '../components/chat/RoomInfoPanel';
import { Logo } from '../components/common/Logo';
import api from '../services/api';
import toast from 'react-hot-toast';
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
  const [bgVideo,        setBgVideo]        = useState(() => {
    return localStorage.getItem('chat-bg-video') || 'cyber-mesh';
  });

  const BACKGROUND_VIDEOS = [
    { id: 'cyber-mesh', name: '💻 Cyber', url: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-and-numbers-31908-large.mp4' },
    { id: 'neon-grid', name: '⚡ Neon', url: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-loop-41851-large.mp4' },
    { id: 'space-dust', name: '🌌 Space', url: 'https://assets.mixkit.co/videos/preview/mixkit-glowing-particles-in-slow-motion-42289-large.mp4' },
    { id: 'matrix-lines', name: '📈 HUD', url: 'https://assets.mixkit.co/videos/preview/mixkit-tech-hud-element-lines-loop-43094-large.mp4' },
    { id: 'none', name: '🖤 None', url: '' }
  ];

  const handleBgVideoChange = (videoId) => {
    setBgVideo(videoId);
    localStorage.setItem('chat-bg-video', videoId);
    toast.success('Background theme updated!', { icon: '🎨' });
  };

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

  // ── Real-time join requests & approvals ───────────────────
  useEffect(() => {
    if (!on || !user) return;

    // Listen for room join approval notification
    const unsubApproved = on(`room:approved:${user.id}`, ({ roomId }) => {
      toast.success('Your request to join has been approved!');
      setRooms((prev) =>
        prev.map((r) =>
          r._id === roomId
            ? { ...r, members: [...(r.members || []), user.id] }
            : r
        )
      );
      setActiveRoom((prev) =>
        prev && prev._id === roomId
          ? { ...prev, members: [...(prev.members || []), user.id] }
          : prev
      );
    });

    // Listen for incoming join requests (for room creators)
    const unsubRequest = on(`room:join-request:${user.id}`, ({ roomName, username }) => {
      toast(`🚪 ${username} requested to join room #${roomName}`, {
        duration: 6000,
        icon: '🔑',
        style: {
          background: 'rgba(13,20,40,0.95)',
          color: '#fff',
          border: '1px solid rgba(124,111,247,0.3)',
        }
      });
    });

    return () => {
      unsubApproved();
      unsubRequest();
    };
  }, [on, user?.id]); // eslint-disable-line

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

  const handleRoomDeleted = (deletedRoomId) => {
    setRooms((prev) => prev.filter((r) => r._id !== deletedRoomId));
    setActiveRoom(null);
    setInfoPanelOpen(false);
    navigate('/chat');
  };

  // ── Layout ───────────────────────────────────────────────
  return (
    <div className="chat-layout" style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)', position: 'relative' }}>

      {/* Ambient Video Background */}
      {(() => {
        const currentVideo = BACKGROUND_VIDEOS.find((v) => v.id === bgVideo) || BACKGROUND_VIDEOS[0];
        return currentVideo.url ? (
          <video
            key={currentVideo.url}
            className="chat-layout__bg-video"
            src={currentVideo.url}
            autoPlay
            loop
            muted
            playsInline
          />
        ) : null;
      })()}

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
            initial={isMobile ? { x: -300 } : { x: 0 }}
            animate={{ x: 0 }}
            exit={isMobile ? { x: -300 } : { x: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            style={{
              width: 290,
              flexShrink: 0,
              ...(isMobile ? {
                position: 'fixed', left: 0, top: 0,
                height: '100%', zIndex: 250,
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
          paddingBottom: (isMobile && !activeRoom) ? 'calc(60px + env(safe-area-inset-bottom))' : 0,
        }}
      >
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
              onRoomDeleted={handleRoomDeleted}
              bgVideo={bgVideo}
              onBgVideoChange={handleBgVideoChange}
            />
          </motion.div>
        )}
      </AnimatePresence>



      {/* ── Mobile bottom nav ───────────────────────────── */}
      {isMobile && !activeRoom && (
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
