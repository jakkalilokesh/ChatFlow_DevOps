import React, { useState, useRef, useEffect } from 'react';
import { useMediaQuery, useVisualViewport } from '../hooks/useMediaQuery';
import { useGesture } from '@use-gesture/react';
import WorkspaceSidebar from '../components/sidebar/WorkspaceSidebar';
import ChatArea from '../components/chat/ChatArea';
import AIAssistantButton from '../components/ai/AIAssistantButton';
import { useLocation, Link } from 'react-router-dom';

// Mobile bottom nav item
const NavItem = ({ icon, label, to, active }) => (
  <Link to={to} style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 2, padding: '6px 12px', minWidth: 44, minHeight: 44,
    color: active ? 'var(--accent-purple)' : 'var(--text-secondary)',
    textDecoration: 'none', fontSize: 10, fontWeight: active ? 600 : 400,
    transition: 'color 0.2s',
  }}>
    <span style={{ fontSize: 20 }}>{icon}</span>
    {label}
  </Link>
);

export default function AppLayout({ currentRoom }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile   = useMediaQuery('(max-width: 768px)');
  const isTablet   = useMediaQuery('(max-width: 1024px)');
  const mainRef    = useRef(null);
  const location   = useLocation();
  useVisualViewport();

  // Close sidebar on route change on mobile
  useEffect(() => { if (isMobile) setSidebarOpen(false); }, [location.pathname, isMobile]);

  // Swipe-right to open sidebar, swipe-left to close
  useGesture({
    onDrag: ({ movement: [mx], direction: [dx], velocity: [vx] }) => {
      if (dx > 0 && mx > 60 && vx > 0.3) setSidebarOpen(true);
      if (dx < 0 && mx < -60)              setSidebarOpen(false);
    },
  }, { target: mainRef, eventOptions: { passive: true } });

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg-primary)' }}>

      {/* ── Mobile overlay ────────────────────────────────── */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────── */}
      <aside style={{
        ...(isMobile ? {
          position: 'fixed', left: 0, top: 0, height: '100%', zIndex: 50,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        } : isTablet ? {
          position: 'relative', flexShrink: 0,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
        } : {
          position: 'relative', flexShrink: 0,
        }),
        width: 272,
        display: 'flex', flexDirection: 'column',
      }}>
        <WorkspaceSidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* ── Main content ──────────────────────────────────── */}
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
              style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-primary)' }}
              aria-label="Open sidebar"
            >
              ☰
            </button>
            <span style={{ fontWeight: 600, fontSize: '1rem' }}>
              {currentRoom ? `# ${currentRoom.name}` : 'ChatFlow'}
            </span>
          </header>
        )}

        <ChatArea currentRoom={currentRoom} />
      </main>

      {/* ── AI FAB ────────────────────────────────────────── */}
      <AIAssistantButton currentRoom={currentRoom} />

      {/* ── Mobile bottom nav ────────────────────────────── */}
      {isMobile && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
          background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          padding: '4px 0', paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          <NavItem icon="💬" label="Chat"     to="/chat"          active={location.pathname.startsWith('/chat')} />
          <NavItem icon="🔍" label="Search"   to="/search"        active={location.pathname === '/search'} />
          <NavItem icon="🔔" label="Alerts"   to="/notifications" active={location.pathname === '/notifications'} />
          <NavItem icon="👤" label="Profile"  to="/profile"       active={location.pathname === '/profile'} />
        </nav>
      )}
    </div>
  );
}
