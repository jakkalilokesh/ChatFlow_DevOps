import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const BACKGROUND_VIDEOS = [
  { id: 'cyber-mesh', name: '💻 Cyber', url: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-and-numbers-31908-large.mp4' },
  { id: 'neon-grid', name: '⚡ Neon', url: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-loop-41851-large.mp4' },
  { id: 'space-dust', name: '🌌 Space', url: 'https://assets.mixkit.co/videos/preview/mixkit-glowing-particles-in-slow-motion-42289-large.mp4' },
  { id: 'matrix-lines', name: '📈 HUD', url: 'https://assets.mixkit.co/videos/preview/mixkit-tech-hud-element-lines-loop-43094-large.mp4' },
  { id: 'none', name: '🖤 None', url: '' }
];

export default function RoomInfoPanel({ room, onClose, onRoomDeleted, bgVideo, onBgVideoChange }) {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/chat/rooms/${room._id}`);
      
      // Fetch details of members in parallel
      const enrichedMembers = await Promise.all(
        (data.members || []).map(async (m) => {
          try {
            const userRes = await api.get(`/api/users/${m.id}`);
            return {
              ...m,
              username: userRes.data.user.username,
              avatarUrl: userRes.data.user.avatarUrl,
              bio: userRes.data.user.bio
            };
          } catch {
            return { ...m, username: `User (${m.id?.slice ? m.id.slice(0, 6) : 'Unknown'})` };
          }
        })
      );
      setMembers(enrichedMembers);

      // Fetch details of pending requests in parallel
      const pendingIds = data.room.pendingRequests || [];
      const enrichedPending = await Promise.all(
        pendingIds.map(async (uid) => {
          try {
            const userRes = await api.get(`/api/users/${uid}`);
            return {
              id: uid,
              username: userRes.data.user.username,
              avatarUrl: userRes.data.user.avatarUrl
            };
          } catch {
            return { id: uid, username: `User (${uid?.slice ? uid.slice(0, 6) : 'Unknown'})` };
          }
        })
      );
      setPendingRequests(enrichedPending);
    } catch {
      setMembers([]);
      setPendingRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [room._id]);

  const handleApproveRequest = async (userId) => {
    const loadingToast = toast.loading('Approving user...');
    try {
      await api.post(`/api/chat/rooms/${room._id}/approve-request`, { userId });
      toast.success('Approved successfully!', { id: loadingToast });
      fetchDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approve failed', { id: loadingToast });
    }
  };

  const handleDenyRequest = async (userId) => {
    const loadingToast = toast.loading('Denying request...');
    try {
      await api.post(`/api/chat/rooms/${room._id}/deny-request`, { userId });
      toast.success('Request denied', { id: loadingToast });
      fetchDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Deny failed', { id: loadingToast });
    }
  };

  const handleDeleteRoom = async () => {
    if (!window.confirm(`Are you absolutely sure you want to delete "#${room.name}"? This cannot be undone.`)) return;
    const loadingToast = toast.loading('Deleting room...');
    try {
      await api.delete(`/api/chat/rooms/${room._id}`);
      toast.success('Room deleted successfully!', { id: loadingToast });
      onRoomDeleted?.(room._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete room', { id: loadingToast });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
          Room Info
        </h3>
        <button
          id="close-info-panel"
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
        >×</button>
      </div>

      {/* Room icon + name */}
      <div style={{ padding: '24px 20px', textAlign: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
        <motion.div
          style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700, color: 'white',
            margin: '0 auto 12px'
          }}
          whileHover={{ scale: 1.05 }}
        >
          {room.name[0].toUpperCase()}
        </motion.div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-lg)', color: 'var(--text-primary)', marginBottom: 4 }}>
          # {room.name}
        </h2>
        {room.description && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {room.description}
          </p>
        )}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 14 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'var(--text-xl)', color: 'var(--accent-purple)' }}>
              {members.length}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Members</p>
          </div>
        </div>
      </div>

      {/* Members */}
      <div style={{ padding: '16px 0', flex: 1, overflowY: 'auto' }}>
        <p style={{ padding: '0 20px 8px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Members
        </p>

        {loading ? (
          [1,2,3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 48, margin: '4px 16px', borderRadius: 10 }} />
          ))
        ) : members.map((member) => (
          <motion.div
            key={member.id || member._id}
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 20px', cursor: 'default'
            }}
          >
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'var(--gradient-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 14, color: 'white', flexShrink: 0,
                overflow: 'hidden'
              }}>
                {member.avatarUrl ? (
                  <img src={member.avatarUrl} alt={member.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  member.username?.[0]?.toUpperCase()
                )}
              </div>
              {member.isOnline && (
                <span style={{
                  position: 'absolute', bottom: 1, right: 1,
                  width: 9, height: 9, background: '#22c55e',
                  borderRadius: '50%', border: '2px solid var(--bg-secondary)'
                }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {member.username}
              </p>
              <p style={{ fontSize: 11, color: member.isOnline ? '#22c55e' : 'var(--text-muted)' }}>
                {member.isOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pending Join Requests (Visible to Creator only) */}
      {room.createdBy === user?.id && pendingRequests.length > 0 && (
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)', background: 'rgba(124, 111, 247, 0.02)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent, #8b5cf6)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            🚪 Join Requests ({pendingRequests.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingRequests.map((req) => (
              <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: 'white', overflow: 'hidden' }}>
                    {req.avatarUrl ? <img src={req.avatarUrl} alt={req.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : req.username?.[0]?.toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{req.username}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleApproveRequest(req.id)}
                    style={{ background: 'rgba(16,185,129,0.15)', border: 'none', color: '#10b981', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleDenyRequest(req.id)}
                    style={{ background: 'rgba(239,68,68,0.15)', border: 'none', color: '#ef4444', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Themes (Personalization) */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.01)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #475569)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          🎨 BACKGROUND THEME
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {BACKGROUND_VIDEOS.map((v) => {
            const isSelected = v.id === bgVideo;
            return (
              <motion.button
                key={v.id}
                onClick={() => onBgVideoChange?.(v.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: '8px',
                  background: isSelected ? 'var(--gradient-primary, linear-gradient(135deg, #7c6ff7 0%, #6c63ff 100%))' : 'rgba(255,255,255,0.03)',
                  border: isSelected ? '1px solid #7c6ff7' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  color: isSelected ? 'white' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
              >
                {v.name}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Creator Room Management (Delete Room) */}
      {room.createdBy === user?.id && (
        <div style={{ padding: '20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column' }}>
          <motion.button
            onClick={handleDeleteRoom}
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(239,68,68,0.1)' }}
            whileTap={{ scale: 0.98 }}
            style={{
              padding: '12px',
              background: 'rgba(239,68,68,0.05)',
              border: '1px dashed #ef4444',
              borderRadius: 12,
              color: '#ef4444',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s'
            }}
          >
            🗑 Delete Room Forever
          </motion.button>
        </div>
      )}
    </div>
  );
}
