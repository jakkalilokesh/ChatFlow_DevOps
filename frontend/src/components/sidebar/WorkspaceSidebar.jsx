/**
 * WorkspaceSidebar — wraps the existing Sidebar component.
 * Used by AppLayout for the mobile drawer + desktop permanent sidebar.
 */
import React from 'react';
import Sidebar from '../chat/Sidebar';
import { Logo } from '../common/Logo';

export default function WorkspaceSidebar({ rooms, activeRoom, onSelectRoom, onRoomCreated, loadingRooms, currentUser, onClose }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary, #0d1428)' }}>
      {/* Logo header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 16px 12px',
        borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
      }}>
        <Logo size={28} />
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
