import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import MessageBubble from './MessageBubble';
import toast from 'react-hot-toast';

export default function ThreadPanel({ parentMessage, currentUser, onClose }) {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const { socket, connected } = useSocket();
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!parentMessage) return;
    setLoading(true);
    api.get(`/api/chat/messages/${parentMessage._id}/thread?page=1&limit=50`)
      .then(({ data }) => setReplies(data.replies || []))
      .catch(() => toast.error('Failed to load thread'))
      .finally(() => setLoading(false));
  }, [parentMessage?._id]);

  // Listen for new thread replies
  useEffect(() => {
    if (!socket || !parentMessage) return;
    const handleReply = (reply) => {
      if (reply.parentMessageId === parentMessage._id) {
        setReplies((prev) => [...prev, reply]);
      }
    };
    socket.on('thread:new-reply', handleReply);
    return () => socket.off('thread:new-reply', handleReply);
  }, [socket, parentMessage?._id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies.length]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || !connected) return;
    socket.emit('thread:reply', { parentMessageId: parentMessage._id, content: text, type: 'text' });
    setInput('');
    inputRef.current?.focus();
  }, [input, connected, socket, parentMessage?._id]);

  if (!parentMessage) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          width: 360, flexShrink: 0,
          background: 'var(--bg-secondary, #111827)',
          borderLeft: '1px solid var(--border, rgba(255,255,255,0.08))',
          display: 'flex', flexDirection: 'column', height: '100%',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h3 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 15, margin: 0 }}>Thread</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>
              {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            </p>
          </div>
          <button
            id="close-thread-btn"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}
          >✕</button>
        </div>

        {/* Parent message preview */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'white', flexShrink: 0 }}>
              {parentMessage.senderUsername?.[0]?.toUpperCase()}
            </div>
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent, #8b5cf6)' }}>{parentMessage.senderUsername}</span>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                {parentMessage.content}
              </p>
            </div>
          </div>
        </div>

        {/* Replies */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Loading replies…</div>
          ) : replies.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
              <p style={{ fontSize: 13 }}>No replies yet. Start the thread!</p>
            </div>
          ) : (
            replies.map((r) => (
              <MessageBubble key={r._id} message={r} isOwn={r.senderId === currentUser?.id} isGrouped={false} currentUser={currentUser} compact />
            ))
          )}
          <div ref={endRef} />
        </div>

        {/* Reply input */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border, rgba(255,255,255,0.08))' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '8px 12px' }}>
            <textarea
              id="thread-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Reply in thread…"
              rows={1}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: 'var(--text-primary)', fontSize: 13, resize: 'none',
                fontFamily: "'Inter', sans-serif", lineHeight: 1.5,
              }}
            />
            <button
              id="thread-send-btn"
              onClick={handleSend}
              disabled={!input.trim() || !connected}
              style={{
                background: input.trim() ? 'var(--accent, #8b5cf6)' : 'rgba(255,255,255,0.1)',
                border: 'none', borderRadius: 8, width: 32, height: 32,
                color: 'white', cursor: input.trim() ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              ↑
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
