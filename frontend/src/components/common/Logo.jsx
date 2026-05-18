import React from 'react';

export const Logo = ({ size = 32, showText = true }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6c63ff" />
          <stop offset="100%" stopColor="#4ecdc4" />
        </linearGradient>
      </defs>
      {/* Speech bubble */}
      <path
        d="M4 8C4 5.79 5.79 4 8 4h24c2.21 0 4 1.79 4 4v18c0 2.21-1.79 4-4 4H22l-6 6v-6H8c-2.21 0-4-1.79-4-4V8z"
        fill="url(#logoGrad)"
      />
      {/* Lightning bolt */}
      <path
        d="M23 10l-6 10h5l-2 10 8-12h-6l3-8h-2z"
        fill="white"
        fillOpacity="0.9"
      />
    </svg>
    {showText && (
      <span style={{
        fontWeight: 700,
        fontSize: size * 0.6,
        background: 'linear-gradient(135deg, #6c63ff, #4ecdc4)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        fontFamily: "'Space Grotesk', sans-serif",
      }}>
        ChatFlow
      </span>
    )}
  </div>
);

export default Logo;
