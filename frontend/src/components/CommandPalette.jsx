import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

const ACTIONS = [
  { id: 'search',        icon: '🔍', label: 'Search Messages',       shortcut: 'Ctrl+F',   route: '/search' },
  { id: 'settings',      icon: '⚙️',  label: 'Open Settings',         shortcut: 'Ctrl+,',   route: '/settings' },
  { id: 'admin',         icon: '📊', label: 'Admin Dashboard',        shortcut: null,        route: '/admin' },
  { id: 'profile',       icon: '👤', label: 'View Profile',           shortcut: null,        route: '/profile' },
  { id: 'theme',         icon: '🎨', label: 'Change Theme',           shortcut: null,        route: '/settings?tab=appearance' },
  { id: 'shortcuts',     icon: '⌨️',  label: 'Keyboard Shortcuts',    shortcut: 'Ctrl+/',   action: 'shortcuts' },
  { id: 'notif',         icon: '🔔', label: 'Toggle Notifications',   shortcut: 'Alt+N',    action: 'notifications' },
  { id: 'dnd',           icon: '🔇', label: 'Toggle Do Not Disturb',  shortcut: 'Ctrl+Shift+D', action: 'dnd' },
  { id: 'pinned',        icon: '📌', label: 'View Pinned Messages',   shortcut: null,        action: 'pinned' },
  { id: 'bookmarks',     icon: '🔖', label: 'My Bookmarks',           shortcut: null,        route: '/bookmarks' },
];

function fuzzyMatch(str, query) {
  str = str.toLowerCase();
  query = query.toLowerCase();
  if (!query) return true;
  let si = 0;
  for (let i = 0; i < str.length && si < query.length; i++) {
    if (str[i] === query[si]) si++;
  }
  return si === query.length;
}

export default function CommandPalette({ onClose, rooms = [], dms = [] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Ctrl+K to toggle
  useKeyboardShortcuts({
    'Ctrl+k': () => setOpen((o) => !o),
    'Ctrl+K': () => setOpen((o) => !o),
  });

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelected(0);
    }
  }, [open]);

  const allItems = useMemo(() => {
    const roomItems = rooms.map((r) => ({
      id: `room-${r._id}`,
      icon: '#',
      label: r.name,
      description: r.description,
      group: 'Channels',
      action: () => navigate(`/chat/${r._id}`),
    }));

    const dmItems = dms.map((u) => ({
      id: `dm-${u.id}`,
      icon: '💬',
      label: u.username,
      description: 'Direct Message',
      group: 'Direct Messages',
      action: () => navigate(`/dm/${u.id}`),
    }));

    const actionItems = ACTIONS.map((a) => ({
      id: a.id,
      icon: a.icon,
      label: a.label,
      description: a.shortcut || '',
      group: 'Actions',
      action: a.route ? () => navigate(a.route) : () => {},
    }));

    return [...roomItems, ...dmItems, ...actionItems];
  }, [rooms, dms, navigate]);

  const filtered = useMemo(() => {
    if (!query) return allItems.slice(0, 12);
    return allItems.filter((item) => fuzzyMatch(item.label, query)).slice(0, 12);
  }, [query, allItems]);

  const handleSelect = useCallback(
    (item) => {
      item.action?.();
      setOpen(false);
      onClose?.();
    },
    [onClose]
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && filtered[selected]) { handleSelect(filtered[selected]); }
  };

  // Group items
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach((item) => {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    });
    return groups;
  }, [filtered]);

  let globalIndex = 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="cmd-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999,
            }}
          />

          {/* Modal */}
          <motion.div
            className="cmd-modal"
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: '20vh',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              maxWidth: 600,
              zIndex: 10000,
              background: 'rgba(15,20,40,0.97)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 16,
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
              backdropFilter: 'blur(24px)',
              overflow: 'hidden',
            }}
          >
            {/* Search input */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: 18, marginRight: 12, opacity: 0.5 }}>🔍</span>
              <input
                ref={inputRef}
                id="command-palette-input"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
                onKeyDown={handleKeyDown}
                placeholder="Search channels, DMs, or actions…"
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: '#f9fafb', fontSize: 16, fontFamily: "'Inter', sans-serif",
                }}
              />
              <kbd style={{ fontSize: 11, padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: 4, color: '#9ca3af', border: '1px solid rgba(255,255,255,0.15)' }}>ESC</kbd>
            </div>

            {/* Results */}
            <div style={{ maxHeight: 400, overflowY: 'auto', padding: '8px 0' }}>
              {Object.entries(grouped).map(([group, items]) => (
                <div key={group}>
                  <div style={{ padding: '6px 20px 4px', fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {group}
                  </div>
                  {items.map((item) => {
                    const idx = globalIndex++;
                    const isSelected = idx === selected;
                    return (
                      <motion.button
                        key={item.id}
                        id={`cmd-item-${item.id}`}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelected(idx)}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 20px', border: 'none', cursor: 'pointer',
                          background: isSelected ? 'rgba(139,92,246,0.15)' : 'transparent',
                          borderLeft: isSelected ? '2px solid var(--accent, #8b5cf6)' : '2px solid transparent',
                          transition: 'background 0.1s, border 0.1s',
                        }}
                      >
                        <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{item.icon}</span>
                        <span style={{ flex: 1, color: '#f9fafb', fontSize: 14, textAlign: 'left', fontFamily: "'Inter', sans-serif" }}>{item.label}</span>
                        {item.description && (
                          <kbd style={{ fontSize: 11, padding: '2px 6px', background: 'rgba(255,255,255,0.08)', borderRadius: 4, color: '#9ca3af', border: '1px solid rgba(255,255,255,0.12)', whiteSpace: 'nowrap' }}>
                            {item.description}
                          </kbd>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              ))}

              {filtered.length === 0 && (
                <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                  <p style={{ fontSize: 14 }}>No results for "{query}"</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '10px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 16, fontSize: 12, color: '#6b7280' }}>
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>ESC Close</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
