import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../services/api';

const ACCEPTED_TYPES = ['image/*', 'application/pdf', 'audio/*', 'video/*'];
const MAX_FILE_SIZE_MB = 50;

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTypeIcon({ mime }) {
  if (mime.startsWith('image/')) return <span>📷</span>;
  if (mime.startsWith('video/')) return <span>🎬</span>;
  if (mime.startsWith('audio/')) return <span>🎵</span>;
  if (mime === 'application/pdf') return <span>📄</span>;
  return <span>📎</span>;
}

export default function DropZone({ children, onFileUploaded, disabled }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState([]); // [{file, progress, url, error}]
  const inputRef = useRef(null);

  const uploadFile = useCallback(async (file) => {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`File too large. Max ${MAX_FILE_SIZE_MB}MB`);
      return;
    }

    const uploadId = `${Date.now()}-${Math.random()}`;
    setUploads((prev) => [...prev, { id: uploadId, file, progress: 0, url: null, error: null }]);

    try {
      // 1. Get presigned URL
      const { data } = await api.post('/api/upload/presign', {
        bucket: 'attachments',
        fileName: file.name,
        fileType: file.type,
      });

      // 2. Upload directly to MinIO
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setUploads((prev) =>
              prev.map((u) => (u.id === uploadId ? { ...u, progress: pct } : u))
            );
          }
        });
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        });
        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        xhr.open('PUT', data.uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      // 3. Mark complete + notify parent
      setUploads((prev) =>
        prev.map((u) => (u.id === uploadId ? { ...u, progress: 100, url: data.fileUrl } : u))
      );
      onFileUploaded?.({ url: data.fileUrl, name: file.name, size: file.size, type: file.type });

      // Auto-remove from progress bar after 2s
      setTimeout(() => {
        setUploads((prev) => prev.filter((u) => u.id !== uploadId));
      }, 2000);
    } catch (err) {
      setUploads((prev) =>
        prev.map((u) => (u.id === uploadId ? { ...u, error: err.message } : u))
      );
      toast.error(`Upload failed: ${err.message}`);
    }
  }, [onFileUploaded]);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const files = Array.from(e.dataTransfer.files);
      files.forEach(uploadFile);
    },
    [uploadFile, disabled]
  );

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handlePaste = useCallback(
    (e) => {
      if (disabled) return;
      const items = Array.from(e.clipboardData.items);
      const imageItems = items.filter((item) => item.kind === 'file' && item.type.startsWith('image/'));
      imageItems.forEach((item) => uploadFile(item.getAsFile()));
    },
    [uploadFile, disabled]
  );

  return (
    <div
      style={{ position: 'relative', height: '100%' }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onPaste={handlePaste}
    >
      {children}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(',')}
        style={{ display: 'none' }}
        onChange={(e) => Array.from(e.target.files).forEach(uploadFile)}
      />

      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: 0, zIndex: 100,
              background: 'rgba(139,92,246,0.15)',
              border: '2px dashed var(--accent, #8b5cf6)',
              borderRadius: 16,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12,
              backdropFilter: 'blur(4px)',
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              style={{ fontSize: 48 }}
            >
              📁
            </motion.div>
            <p style={{ color: 'var(--accent, #8b5cf6)', fontSize: 18, fontWeight: 700 }}>
              Drop files here
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              Images · PDFs · Audio · Video (max {MAX_FILE_SIZE_MB}MB)
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload progress bars */}
      {uploads.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 80, left: 16, right: 16, zIndex: 50,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {uploads.map((u) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              style={{
                background: 'rgba(15,20,40,0.95)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, padding: '10px 14px',
                backdropFilter: 'blur(16px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <FileTypeIcon mime={u.file.type} />
                <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.file.name}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {formatBytes(u.file.size)}
                </span>
              </div>
              {u.error ? (
                <p style={{ fontSize: 11, color: '#ef4444' }}>❌ {u.error}</p>
              ) : (
                <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                  <motion.div
                    style={{
                      height: '100%', borderRadius: 2,
                      background: u.progress === 100
                        ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                        : 'linear-gradient(90deg, var(--accent, #8b5cf6), var(--accent-2, #6c63ff))',
                    }}
                    initial={{ width: '0%' }}
                    animate={{ width: `${u.progress}%` }}
                    transition={{ ease: 'easeOut' }}
                  />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
