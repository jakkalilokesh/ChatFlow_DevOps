import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

const themes = {
  dark: {
    '--bg-primary':    '#0a0f1e',
    '--bg-secondary':  '#111827',
    '--bg-tertiary':   '#1f2937',
    '--bg-card':       'rgba(255,255,255,0.04)',
    '--text-primary':  '#f9fafb',
    '--text-secondary':'#9ca3af',
    '--text-muted':    '#6b7280',
    '--border':        'rgba(255,255,255,0.08)',
    '--border-subtle': 'rgba(255,255,255,0.06)',
  },
  light: {
    '--bg-primary':    '#ffffff',
    '--bg-secondary':  '#f3f4f6',
    '--bg-tertiary':   '#e5e7eb',
    '--bg-card':       'rgba(0,0,0,0.02)',
    '--text-primary':  '#111827',
    '--text-secondary':'#6b7280',
    '--text-muted':    '#9ca3af',
    '--border':        'rgba(0,0,0,0.08)',
    '--border-subtle': 'rgba(0,0,0,0.06)',
  },
  amoled: {
    '--bg-primary':    '#000000',
    '--bg-secondary':  '#0a0a0a',
    '--bg-tertiary':   '#111111',
    '--bg-card':       'rgba(255,255,255,0.03)',
    '--text-primary':  '#ffffff',
    '--text-secondary':'#888888',
    '--text-muted':    '#555555',
    '--border':        'rgba(255,255,255,0.05)',
    '--border-subtle': 'rgba(255,255,255,0.03)',
  },
};

const accents = {
  'Ocean Blue':    { '--accent': '#3b82f6', '--accent-2': '#06b6d4', '--accent-glow': 'rgba(59,130,246,0.3)', '--accent-purple': '#3b82f6' },
  'Neon Purple':   { '--accent': '#8b5cf6', '--accent-2': '#6c63ff', '--accent-glow': 'rgba(139,92,246,0.3)', '--accent-purple': '#8b5cf6' },
  'Emerald Green': { '--accent': '#10b981', '--accent-2': '#059669', '--accent-glow': 'rgba(16,185,129,0.3)', '--accent-purple': '#10b981' },
  'Coral Red':     { '--accent': '#ef4444', '--accent-2': '#f97316', '--accent-glow': 'rgba(239,68,68,0.3)',  '--accent-purple': '#ef4444' },
  'Rose Pink':     { '--accent': '#ec4899', '--accent-2': '#f43f5e', '--accent-glow': 'rgba(236,72,153,0.3)','--accent-purple': '#ec4899' },
  'Amber Gold':    { '--accent': '#f59e0b', '--accent-2': '#fbbf24', '--accent-glow': 'rgba(245,158,11,0.3)', '--accent-purple': '#f59e0b' },
};

function applyTheme(themeName, accentName) {
  const root = document.documentElement;
  const themeVars = themes[themeName] || themes.dark;
  const accentVars = accents[accentName] || accents['Neon Purple'];

  // Apply transition for smooth change
  root.style.setProperty('transition', 'background-color 0.3s ease, color 0.3s ease');

  Object.entries({ ...themeVars, ...accentVars }).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('chatflow-theme') || 'dark');
  const [accent, setAccent] = useState(() => localStorage.getItem('chatflow-accent') || 'Neon Purple');

  useEffect(() => {
    applyTheme(theme, accent);
  }, [theme, accent]);

  const changeTheme = useCallback((newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('chatflow-theme', newTheme);
  }, []);

  const changeAccent = useCallback((newAccent) => {
    setAccent(newAccent);
    localStorage.setItem('chatflow-accent', newAccent);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, accent, changeTheme, changeAccent, themes, accents }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export default ThemeContext;
