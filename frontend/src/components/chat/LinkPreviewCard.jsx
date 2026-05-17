import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

function YouTubeCard({ preview, onClose }) {
  const [showPlayer, setShowPlayer] = useState(false);
  const videoIdMatch = preview.url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  const videoId = videoIdMatch?.[1];
  const thumb = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : preview.image;

  return (
    <div style={cardStyle}>
      <button onClick={onClose} style={closeStyle}>✕</button>
      <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowPlayer(true)}>
        <img src={thumb} alt={preview.title} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: '8px 8px 0 0' }} />
        {!showPlayer && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 44, height: 44, background: 'rgba(0,0,0,0.7)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>▶</div>
          </div>
        )}
      </div>
      {showPlayer && videoId && (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=0`}
          style={{ width: '100%', height: 180, border: 'none' }}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={preview.title}
        />
      )}
      <div style={{ padding: '8px 10px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0, marginBottom: 2 }}>{preview.title}</p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>YouTube</p>
      </div>
    </div>
  );
}

function GenericCard({ preview, onClose }) {
  return (
    <div style={cardStyle}>
      <button onClick={onClose} style={closeStyle}>✕</button>
      <div style={{ display: 'flex', gap: 10, padding: '10px 12px' }}>
        {preview.image && (
          <img src={preview.image} alt="" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            {preview.favicon && <img src={preview.favicon} alt="" style={{ width: 14, height: 14 }} />}
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{preview.siteName || new URL(preview.url).hostname}</span>
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 3px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {preview.title}
          </p>
          {preview.description && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {preview.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  position: 'relative',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  overflow: 'hidden',
  marginTop: 6,
  maxWidth: 360,
  transition: 'transform 0.2s, box-shadow 0.2s',
  cursor: 'default',
};

const closeStyle = {
  position: 'absolute', top: 6, right: 6, zIndex: 2,
  background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
  width: 20, height: 20, color: 'white', cursor: 'pointer', fontSize: 10,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

export default function LinkPreviewCard({ url }) {
  const [preview, setPreview] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!url || dismissed) return;
    const dismissedUrls = JSON.parse(localStorage.getItem('chatflow-dismissed-previews') || '{}');
    if (dismissedUrls[url]) { setDismissed(true); return; }

    api.get(`/api/chat/link-preview?url=${encodeURIComponent(url)}`)
      .then(({ data }) => setPreview(data))
      .catch(() => {});
  }, [url, dismissed]);

  const handleClose = () => {
    setDismissed(true);
    const stored = JSON.parse(localStorage.getItem('chatflow-dismissed-previews') || '{}');
    stored[url] = true;
    localStorage.setItem('chatflow-dismissed-previews', JSON.stringify(stored));
  };

  if (dismissed || !preview) return null;

  const isYouTube = preview.type === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={{ translateY: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
      >
        {isYouTube
          ? <YouTubeCard preview={preview} onClose={handleClose} />
          : <GenericCard preview={preview} onClose={handleClose} />
        }
      </motion.div>
    </AnimatePresence>
  );
}
