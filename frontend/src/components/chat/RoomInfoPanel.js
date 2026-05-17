import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';

export default function RoomInfoPanel({ room, onClose }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/api/chat/rooms/${room._id}`);
        setMembers(data.members || []);
      } catch {
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [room._id]);

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
    </div>
  );
}
