import React from 'react';
import { Logo } from './Logo';

/**
 * Full-page loading screen shown during Suspense fallback and initial auth checks.
 */
export default function PageLoader({ message = 'Loading ChatFlow…' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100vh', width: '100vw',
      background: 'var(--bg-primary, #0a0f1e)',
      gap: 24,
    }}>
      {/* Animated logo */}
      <div style={{ animation: 'float 3s ease-in-out infinite' }}>
        <Logo size={48} showText={false} />
      </div>

      {/* Spinner */}
      <div style={{
        width: 40, height: 40,
        border: '3px solid rgba(108,99,255,0.15)',
        borderTopColor: '#6c63ff',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />

      <p style={{
        color: 'rgba(148,163,184,0.8)',
        fontFamily: "'Inter', sans-serif",
        fontSize: 14, letterSpacing: '0.05em',
      }}>
        {message}
      </p>

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      `}</style>
    </div>
  );
}
