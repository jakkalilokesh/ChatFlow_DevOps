import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './MessageBubble.css';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

export default function MessageBubble({ message, isOwn, isGrouped, onReply, currentUser }) {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  const handleReact = async (emoji) => {
    try {
      await api.post(`/api/chat/messages/${message._id}/react`, { emoji });
      setShowReactions(false);
    } catch {
      toast.error('Could not add reaction');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/api/chat/messages/${message._id}`);
    } catch {
      toast.error('Could not delete message');
    }
  };

  const timeStr = format(new Date(message.createdAt), 'HH:mm');

  return (
    <motion.div
      className={`msg-row ${isOwn ? 'msg-row--own' : ''} ${isGrouped ? 'msg-row--grouped' : ''}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactions(false); }}
    >
      {/* Avatar — only on first message of a group */}
      {!isGrouped && !isOwn && (
        <div className="msg-avatar">
          {message.senderAvatar ? (
            <img src={message.senderAvatar} alt={message.senderUsername} />
          ) : (
            <span>{message.senderUsername?.[0]?.toUpperCase()}</span>
          )}
        </div>
      )}
      {isGrouped && !isOwn && <div className="msg-avatar-placeholder" />}

      <div className="msg-content">
        {/* Sender name — only on first of group */}
        {!isGrouped && !isOwn && (
          <p className="msg-sender">{message.senderUsername}</p>
        )}

        {/* Reply preview */}
        {message.replyTo && (
          <div className="msg-reply-ref">
            <span className="msg-reply-ref__bar" />
            <span className="msg-reply-ref__text">{message.replyToContent || 'Message'}</span>
          </div>
        )}

        {/* Bubble */}
        <div className="msg-bubble-row">
          <div className={`msg-bubble ${isOwn ? 'msg-bubble--own' : 'msg-bubble--other'}`}>
            {message.type === 'image' ? (
              <img src={message.content} alt="Shared" className="msg-image" />
            ) : (
              <span className="msg-text">{message.content}</span>
            )}
            <span className="msg-time">{timeStr}</span>
          </div>

          {/* Actions on hover */}
          <AnimatePresence>
            {showActions && (
              <motion.div
                className={`msg-actions ${isOwn ? 'msg-actions--left' : 'msg-actions--right'}`}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.12 }}
              >
                <button
                  className="msg-action-btn"
                  title="React"
                  onClick={() => setShowReactions(!showReactions)}
                >
                  😊
                </button>
                <button
                  className="msg-action-btn"
                  title="Reply"
                  onClick={() => onReply(message)}
                >
                  ↩
                </button>
                {isOwn && (
                  <button
                    className="msg-action-btn msg-action-btn--danger"
                    title="Delete"
                    onClick={handleDelete}
                  >
                    🗑
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick reactions picker */}
        <AnimatePresence>
          {showReactions && (
            <motion.div
              className="msg-reactions-picker"
              initial={{ opacity: 0, y: 6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.9 }}
              transition={{ duration: 0.15 }}
            >
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  className="msg-reaction-btn"
                  onClick={() => handleReact(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Existing reactions */}
        {message.reactions?.length > 0 && (
          <div className="msg-reaction-list">
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                className="msg-reaction-chip"
                onClick={() => handleReact(r.emoji)}
                title={`${r.users?.length || 0} reactions`}
              >
                {r.emoji} <span>{r.users?.length || 0}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
