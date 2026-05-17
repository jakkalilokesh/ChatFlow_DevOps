import React from 'react';

/**
 * ChatFlow SVG Logo Component
 * Speech bubble with a lightning bolt — gradient fill #6c63ff → #4ecdc4
 */
export default function Logo({ iconOnly = false, size = 36, animate = false }) {
  const iconSize = size;
  const textSize = Math.round(size * 0.56);

  const floatStyle = animate
    ? {
        animation: 'float 4s ease-in-out infinite',
        display: 'inline-block',
      }
    : {};

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        ...floatStyle,
      }}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="ChatFlow logo"
      >
        <defs>
          <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6c63ff" />
            <stop offset="100%" stopColor="#4ecdc4" />
          </linearGradient>
          <filter id="logo-glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Speech bubble body */}
        <path
          fill="url(#logo-grad)"
          filter="url(#logo-glow)"
          d="M8 10 C8 5.6 11.6 2 16 2 L48 2 C52.4 2 56 5.6 56 10 L56 38 C56 42.4 52.4 46 48 46 L36 46 L28 58 L24 46 L16 46 C11.6 46 8 42.4 8 38 Z"
        />
        {/* Lightning bolt */}
        <path
          fill="white"
          opacity="0.95"
          d="M36 8 L24 28 L32 28 L28 48 L44 24 L35 24 Z"
        />
      </svg>

      {!iconOnly && (
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: `${textSize}px`,
            background: 'linear-gradient(135deg, #6c63ff 0%, #4ecdc4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          ChatFlow
        </span>
      )}
    </div>
  );
}
