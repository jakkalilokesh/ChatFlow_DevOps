import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import Logo from '../common/Logo';
import './Sidebar.css';

export default function Sidebar({ rooms, activeRoom, onSelectRoom, onRoomCreated, dmConversations = [], onDmCreated, loading, currentUser }) {
  const { connected } = useSocket();
  const { logout } = useAuth();
  const [search, setSearch] = useState('');
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomType, setNewRoomType] = useState('public');
  const [creating, setCreating] = useState(false);

  // DM States
  const [showNewDm, setShowNewDm] = useState(false);
  const [dmSearch, setDmSearch] = useState('');
  const [dmResults, setDmResults] = useState([]);
  const [searchingDm, setSearchingDm] = useState(false);

  const filteredRooms = rooms.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateRoom = useCallback(async () => {
    if (!newRoomName.trim()) { toast.error('Room name is required'); return; }
    setCreating(true);
    try {
      const { data } = await api.post('/api/chat/rooms', {
        name: newRoomName.trim(),
        description: newRoomDesc.trim(),
        type: newRoomType,
      });
      onRoomCreated(data.room);
      setNewRoomName('');
      setNewRoomDesc('');
      setNewRoomType('public');
      setShowNewRoom(false);
      toast.success(`Room "${data.room.name}" created!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create room');
    } finally {
      setCreating(false);
    }
  }, [newRoomName, newRoomDesc, newRoomType, onRoomCreated]);

  const handleDmSearchChange = async (val) => {
    setDmSearch(val);
    if (val.trim().length < 2) {
      setDmResults([]);
      return;
    }
    setSearchingDm(true);
    try {
      const { data } = await api.get(`/api/users/search?q=${val.trim()}`);
      setDmResults((data.users || []).filter((u) => u.id !== currentUser?.id));
    } catch {
      setDmResults([]);
    } finally {
      setSearchingDm(false);
    }
  };

  const handleStartDm = async (otherUser) => {
    const loadingToast = toast.loading(`Starting DM with ${otherUser.username}...`);
    try {
      const { data } = await api.post('/api/dm/conversations', { userId: otherUser.id });
      const enrichedDm = {
        ...data.conversation,
        _id: data.conversation._id,
        name: otherUser.username,
        avatarUrl: otherUser.avatarUrl,
        isOnline: otherUser.isOnline,
        isDM: true,
        otherUser: otherUser
      };
      onDmCreated(enrichedDm);
      setShowNewDm(false);
      setDmSearch('');
      setDmResults([]);
      toast.success(`DM started!`, { id: loadingToast });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start DM', { id: loadingToast });
    }
  };

  return (
    <div className="sidebar">
      {/* Search */}
      <div className="sidebar__search">
        <span className="sidebar__search-icon">🔍</span>
        <input
          type="text"
          id="room-search"
          placeholder="Search rooms..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sidebar__search-input"
        />
      </div>

      {/* New Room button */}
      <div className="sidebar__new-room-btn-wrap" style={{ display: 'flex', gap: 8, padding: '0 16px', marginBottom: 12 }}>
        <motion.button
          id="new-room-btn"
          className="sidebar__new-room-btn"
          style={{ flex: 1 }}
          onClick={() => { setShowNewRoom(!showNewRoom); setShowNewDm(false); }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          <span>+</span> Room
        </motion.button>
        <motion.button
          id="new-dm-btn"
          className="sidebar__new-room-btn"
          style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          onClick={() => { setShowNewDm(!showNewDm); setShowNewRoom(false); }}
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.06)' }}
          whileTap={{ scale: 0.97 }}
        >
          <span>+</span> Direct Msg
        </motion.button>
      </div>

      {/* New Room Form */}
      <AnimatePresence>
        {showNewRoom && (
          <motion.div
            className="sidebar__new-room-form"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <input
              id="new-room-name"
              type="text"
              placeholder="Room name"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              className="sidebar__form-input"
              maxLength={30}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
            />
            <input
              id="new-room-desc"
              type="text"
              placeholder="Description (optional)"
              value={newRoomDesc}
              onChange={(e) => setNewRoomDesc(e.target.value)}
              className="sidebar__form-input"
              maxLength={100}
            />
            <div className="sidebar__form-type" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button
                type="button"
                style={{
                  flex: 1, padding: '8px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  border: newRoomType === 'public' ? '1px solid #7c6ff7' : '1px solid rgba(255,255,255,0.08)',
                  background: newRoomType === 'public' ? 'rgba(124, 111, 247, 0.15)' : 'none',
                  color: newRoomType === 'public' ? '#8b5cf6' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
                onClick={() => setNewRoomType('public')}
              >
                🌍 Public
              </button>
              <button
                type="button"
                style={{
                  flex: 1, padding: '8px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  border: newRoomType === 'private' ? '1px solid #7c6ff7' : '1px solid rgba(255,255,255,0.08)',
                  background: newRoomType === 'private' ? 'rgba(124, 111, 247, 0.15)' : 'none',
                  color: newRoomType === 'private' ? '#8b5cf6' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
                onClick={() => setNewRoomType('private')}
              >
                🔒 Private
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1, padding: '8px', fontSize: 13 }} onClick={() => setShowNewRoom(false)}>
                Cancel
              </button>
              <button
                id="create-room-submit"
                className="btn btn-primary"
                style={{ flex: 2, padding: '8px', fontSize: 13 }}
                onClick={handleCreateRoom}
                disabled={creating}
              >
                {creating ? '...' : 'Create'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New DM Search Form */}
      <AnimatePresence>
        {showNewDm && (
          <motion.div
            className="sidebar__new-room-form"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
          >
            <input
              type="text"
              placeholder="Type username (min 2 chars)..."
              value={dmSearch}
              onChange={(e) => handleDmSearchChange(e.target.value)}
              className="sidebar__form-input"
              style={{ marginBottom: 8 }}
            />
            {searchingDm && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0' }}>🔍 Searching users...</p>}
            
            {dmResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 150, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 4 }}>
                {dmResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleStartDm(user)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '6px 10px', background: 'none', border: 'none',
                      borderRadius: 6, cursor: 'pointer', textAlign: 'left', color: 'white'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10, color: 'white', overflow: 'hidden' }}>
                      {user.avatarUrl ? <img src={user.avatarUrl} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.username[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{user.username}</span>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: user.isOnline ? '#22c55e' : 'var(--text-muted)', marginLeft: 'auto' }} />
                  </button>
                ))}
              </div>
            )}
            
            {dmSearch.trim().length >= 2 && dmResults.length === 0 && !searchingDm && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0', textAlign: 'center' }}>No users found</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Room list */}
      <div className="sidebar__rooms" style={{ maxHeight: '35vh', overflowY: 'auto' }}>
        <p className="sidebar__section-label">Rooms</p>

        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 64, margin: '4px 12px', borderRadius: 10 }} />
          ))
        ) : filteredRooms.length === 0 ? (
          <div className="sidebar__empty">
            {search ? 'No rooms match your search' : 'No rooms yet. Create one!'}
          </div>
        ) : (
          filteredRooms.map((room) => (
            <RoomItem
              key={room._id}
              room={room}
              isActive={activeRoom?._id === room._id}
              onSelect={() => onSelectRoom(room)}
            />
          ))
        )}
      </div>

      {/* DM List */}
      <div className="sidebar__rooms" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 12, marginTop: 12, maxHeight: '35vh', overflowY: 'auto' }}>
        <p className="sidebar__section-label">Direct Messages</p>
        {dmConversations.length === 0 ? (
          <div className="sidebar__empty">No active conversations. Start a DM!</div>
        ) : (
          dmConversations.map((dm) => (
            <RoomItem
              key={dm._id}
              room={dm}
              isActive={activeRoom?._id === dm._id}
              onSelect={() => onSelectRoom(dm)}
            />
          ))
        )}
      </div>

      {/* User section at bottom */}
      <div className="sidebar__user">
        <Link to="/profile" className="sidebar__user-info">
          <div className="sidebar__user-avatar">
            {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt={currentUser.username} />
            ) : (
              <span>{currentUser?.username?.[0]?.toUpperCase()}</span>
            )}
            <span className="sidebar__user-online" />
          </div>
          <div className="sidebar__user-meta">
            <span className="sidebar__user-name">{currentUser?.username}</span>
            <span className="sidebar__user-status">Online</span>
          </div>
        </Link>
        <div className="sidebar__user-actions">
          <Link to="/settings" id="sidebar-settings-btn" className="sidebar__icon-btn" title="Settings">
            <motion.span whileHover={{ rotate: 60 }} transition={{ type: 'spring', stiffness: 200 }}>⚙️</motion.span>
          </Link>
          <button id="sidebar-logout-btn" className="sidebar__icon-btn" title="Sign out" onClick={() => logout()}>
            🚪
          </button>
        </div>
      </div>
    </div>
  );
}

function RoomItem({ room, isActive, onSelect }) {
  const timeAgo = room.lastMessageAt
    ? formatDistanceToNow(new Date(room.lastMessageAt), { addSuffix: false })
    : null;

  return (
    <motion.button
      className={`room-item ${isActive ? 'room-item--active' : ''}`}
      onClick={onSelect}
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <div className="room-item__icon">{room.name[0].toUpperCase()}</div>
      <div className="room-item__content">
        <div className="room-item__top">
          <span className="room-item__name">{room.name}</span>
          {timeAgo && <span className="room-item__time">{timeAgo}</span>}
        </div>
        <div className="room-item__bottom">
          <span className="room-item__preview">
            {room.lastMessage || room.description || 'No messages yet'}
          </span>
          {room.unreadCount > 0 && (
            <motion.span
              className="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              {room.unreadCount > 9 ? '9+' : room.unreadCount}
            </motion.span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
