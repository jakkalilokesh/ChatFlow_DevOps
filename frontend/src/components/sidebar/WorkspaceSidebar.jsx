/**
 * WorkspaceSidebar — wraps the existing Sidebar component.
 * Used by AppLayout for the mobile drawer + desktop permanent sidebar.
 */
import React from 'react';
import Sidebar from '../chat/Sidebar';
import { Logo } from '../common/Logo';
import { useSocket } from '../../context/SocketContext';

export default function WorkspaceSidebar({ rooms, activeRoom, onSelectRoom, onRoomCreated, loadingRooms, currentUser, onClose }) {
  const { connected } = useSocket();

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary, #0d1428)' }}>
      {/* Logo header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 16px 12px',
        borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo size={28} />
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: connected ? '#22c55e' : 'var(--text-muted, #475569)',
            boxShadow: connected ? '0 0 8px #22c55e' : 'none',
            transition: 'background-color 0.3s, box-shadow 0.3s',
            marginTop: 4,
          }} title={connected ? 'Connected to real-time chat server' : 'Disconnected from chat server'} />
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="touch-target"
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 18, cursor: 'pointer' }}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        )}
      </div>

      {/* Sidebar content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Sidebar
          rooms={rooms}
          activeRoom={activeRoom}
          onSelectRoom={onSelectRoom}
          onRoomCreated={onRoomCreated}
          loading={loadingRooms}
          currentUser={currentUser}
        />
      </div>
    </div>
  );
}
