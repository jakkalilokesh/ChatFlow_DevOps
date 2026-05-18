import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AnimatedMesh } from '../components/ui/AnimatedBackground';
import { Logo } from '../components/common/Logo';

export default function NotFoundPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <AnimatedMesh />
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <div style={{ marginBottom: 24 }}><Logo size={48} /></div>

        {/* Animated 404 */}
        <div style={{
          fontSize: 'clamp(5rem, 15vw, 10rem)', fontWeight: 800,
          background: 'linear-gradient(135deg, #6c63ff, #4ecdc4)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          lineHeight: 1, marginBottom: 16,
        }}>
          404
        </div>

        {/* Floating chat bubbles SVG */}
        <svg width="200" height="100" viewBox="0 0 200 100" style={{ margin: '0 auto 24px', display: 'block' }}>
          <defs>
            <linearGradient id="g404" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6c63ff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#4ecdc4" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <rect x="10" y="20" width="100" height="50" rx="12" fill="url(#g404)">
            <animateTransform attributeName="transform" type="translate" values="0,0;0,-6;0,0" dur="3s" repeatCount="indefinite" />
          </rect>
          <rect x="15" y="33" width="60" height="8" rx="4" fill="#6c63ff" opacity="0.5" />
          <rect x="15" y="47" width="40" height="8" rx="4" fill="#6c63ff" opacity="0.3" />
          <path d="M30 70 L15 85 L45 76" fill="url(#g404)" />
          <rect x="90" y="10" width="90" height="50" rx="12" fill="url(#g404)">
            <animateTransform attributeName="transform" type="translate" values="0,0;0,-8;0,0" dur="4s" repeatCount="indefinite" />
          </rect>
          <rect x="98" y="25" width="50" height="8" rx="4" fill="#4ecdc4" opacity="0.5" />
          <rect x="98" y="39" width="35" height="8" rx="4" fill="#4ecdc4" opacity="0.3" />
        </svg>

        <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, marginBottom: 12 }}>
          Page not found
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto 32px', lineHeight: 1.6 }}>
          Looks like this conversation went somewhere we can't find. Don't worry — your messages are safe!
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/chat" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg, #6c63ff, #4ecdc4)',
            color: '#fff', padding: '12px 24px', borderRadius: 12,
            fontWeight: 600, textDecoration: 'none',
          }}>
            💬 Go to Chat
          </Link>
          <Link to="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'var(--text-primary)', padding: '12px 24px', borderRadius: 12,
            fontWeight: 600, textDecoration: 'none',
          }}>
            🏠 Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
