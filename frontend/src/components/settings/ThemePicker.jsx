import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

const THEMES = [
  { id: 'dark',   label: 'Dark',   icon: '🌙', preview: { bg: '#0a0f1e', card: '#111827', text: '#f9fafb' } },
  { id: 'light',  label: 'Light',  icon: '☀️',  preview: { bg: '#ffffff', card: '#f3f4f6', text: '#111827' } },
  { id: 'amoled', label: 'AMOLED', icon: '⚫', preview: { bg: '#000000', card: '#0a0a0a', text: '#ffffff' } },
];

const ACCENTS = [
  { name: 'Neon Purple',   color: '#8b5cf6' },
  { name: 'Ocean Blue',    color: '#3b82f6' },
  { name: 'Emerald Green', color: '#10b981' },
  { name: 'Coral Red',     color: '#ef4444' },
  { name: 'Rose Pink',     color: '#ec4899' },
  { name: 'Amber Gold',    color: '#f59e0b' },
];

function ThemePreview({ theme, accentColor }) {
  return (
    <div style={{
      width: 64, height: 48, borderRadius: 8, overflow: 'hidden',
      background: theme.preview.bg, border: '2px solid ' + theme.preview.card,
      position: 'relative', flexShrink: 0,
    }}>
      <div style={{ position: 'absolute', top: 8, left: 8, right: 8, height: 6, background: theme.preview.card, borderRadius: 3 }} />
      <div style={{ position: 'absolute', top: 18, left: 8, width: 20, height: 4, background: accentColor, borderRadius: 2 }} />
      <div style={{ position: 'absolute', top: 26, left: 8, right: 8, height: 3, background: theme.preview.card, borderRadius: 2 }} />
      <div style={{ position: 'absolute', top: 32, left: 8, width: 28, height: 3, background: theme.preview.card, borderRadius: 2, opacity: 0.5 }} />
    </div>
  );
}

export default function ThemePicker() {
  const { theme, accent, changeTheme, changeAccent } = useTheme();

  return (
    <div>
      {/* Base Themes */}
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Base Theme
      </p>
      <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
        {THEMES.map((t) => (
          <motion.button
            key={t.id}
            id={`theme-${t.id}`}
            onClick={() => changeTheme(t.id)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              padding: '12px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: theme === t.id ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
              outline: theme === t.id ? '2px solid var(--accent, #8b5cf6)' : '2px solid transparent',
              transition: 'all 0.2s',
              flex: 1,
            }}
          >
            <ThemePreview theme={t} accentColor={ACCENTS.find(a => a.name === accent)?.color || '#8b5cf6'} />
            <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: theme === t.id ? 600 : 400 }}>
              {t.icon} {t.label}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Accent Colors */}
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Accent Color
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {ACCENTS.map((a) => (
          <motion.button
            key={a.name}
            id={`accent-${a.name.replace(/\s+/g, '-').toLowerCase()}`}
            onClick={() => changeAccent(a.name)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title={a.name}
            style={{
              width: 40, height: 40, borderRadius: '50%', background: a.color,
              border: accent === a.name ? '3px solid white' : '3px solid transparent',
              cursor: 'pointer',
              boxShadow: accent === a.name ? `0 0 16px ${a.color}80` : 'none',
              transition: 'all 0.2s',
            }}
          />
        ))}
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
        Changes apply instantly — no page reload needed.
      </p>
    </div>
  );
}
