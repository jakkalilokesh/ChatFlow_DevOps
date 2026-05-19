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

export default function Sidebar({ rooms, activeRoom, onSelectRoom, onRoomCreated, loading, currentUser }) {
  const { connected } = useSocket();
  const { logout } = useAuth();
  const [search, setSearch] = useState('');
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [creating, setCreating] = useState(false);

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
        type: 'public',
      });
      onRoomCreated(data.room);
      setNewRoomName('');
      setNewRoomDesc('');
      setShowNewRoom(false);
      toast.success(`Room "${data.room.name}" created!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create room');
    } finally {
      setCreating(false);
    }
  }, [newRoomName, newRoomDesc, onRoomCreated]);

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
      <div className="sidebar__new-room-btn-wrap">
        <motion.button
          id="new-room-btn"
          className="sidebar__new-room-btn"
          onClick={() => setShowNewRoom(!showNewRoom)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          <span>+</span> New Room
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

      {/* Room list */}
      <div className="sidebar__rooms">
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
