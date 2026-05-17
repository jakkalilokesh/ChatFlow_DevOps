import React, {
  useState, useRef, useEffect, useCallback, useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from 'emoji-picker-react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { useSocket } from '../../context/SocketContext';
import MessageBubble from './MessageBubble';
import './ChatArea.css';

const MAX_CHARS = 2000;

export default function ChatArea({
  room, messages, loading, hasMore, onLoadMore, currentUser,
  onToggleSidebar, onToggleInfo, sidebarOpen,
}) {
  const { sendMessage, startTyping, stopTyping, typingUsers, connected } = useSocket();
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const textareaRef = useRef(null);
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);
  const messagesEndRef = useRef(null);

  const roomTyping = room ? (typingUsers[room._id] || {}) : {};
  const typingList = Object.values(roomTyping).filter(Boolean);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleInput = (e) => {
    const val = e.target.value;
    if (val.length > MAX_CHARS) return;
    setInput(val);

    if (!isTypingRef.current && room) {
      isTypingRef.current = true;
      startTyping(room._id);
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      if (room) stopTyping(room._id);
    }, 1500);
  };

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || !room || !connected) return;

    sendMessage(room._id, text, 'text', replyTo?._id || null);
    setInput('');
    setReplyTo(null);
    clearTimeout(typingTimerRef.current);
    isTypingRef.current = false;
    stopTyping(room._id);

    // Focus back to input
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [input, room, connected, sendMessage, replyTo, stopTyping]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emojiData) => {
    setInput((prev) => prev + emojiData.emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  // Group messages by date and consecutive sender
  const groupedMessages = useMemo(() => {
    if (!messages.length) return [];
    const groups = [];
    let currentDate = null;

    messages.forEach((msg, i) => {
      const msgDate = new Date(msg.createdAt);
      const prevMsg = messages[i - 1];

      // Date separator
      if (!currentDate || !isSameDay(new Date(prevMsg?.createdAt || 0), msgDate)) {
        currentDate = msgDate;
        let dateLabel = '';
        if (isToday(msgDate)) dateLabel = 'Today';
        else if (isYesterday(msgDate)) dateLabel = 'Yesterday';
        else dateLabel = format(msgDate, 'EEEE, MMMM d');
        groups.push({ type: 'date', label: dateLabel, id: `date-${msgDate.toDateString()}` });
      }

      const isGrouped =
        prevMsg &&
        prevMsg.senderId === msg.senderId &&
        isSameDay(new Date(prevMsg.createdAt), msgDate) &&
        (msgDate - new Date(prevMsg.createdAt)) < 5 * 60 * 1000;

      groups.push({ type: 'message', msg, isGrouped, isOwn: msg.senderId === currentUser?.id });
    });

    return groups;
  }, [messages, currentUser]);

  if (!room) {
    return (
      <div className="chat-area chat-area--empty">
        <div className="chat-area__no-room">
          <span style={{ fontSize: 64 }}>💬</span>
          <h2>Select a room to start chatting</h2>
          <p>Choose from the sidebar or create a new room</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-area">
      {/* Header */}
      <div className="chat-header">
        <button
          id="toggle-sidebar-btn"
          className="chat-header__icon-btn"
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        >
          ☰
        </button>

        <div className="chat-header__info">
          <div className="chat-header__room-icon">
            {room.name[0].toUpperCase()}
          </div>
          <div>
            <h2 className="chat-header__room-name"># {room.name}</h2>
            <p className="chat-header__room-meta">
              {room.memberCount || 0} members
              {typingList.length > 0 && (
                <span className="chat-header__typing">
                  {' · '}
                  <span className="typing-dot" style={{ width: 5, height: 5, background: '#4ecdc4', borderRadius: '50%', display: 'inline-block' }} />
                  <span className="typing-dot" style={{ width: 5, height: 5, background: '#4ecdc4', borderRadius: '50%', display: 'inline-block', animationDelay: '0.15s' }} />
                  <span className="typing-dot" style={{ width: 5, height: 5, background: '#4ecdc4', borderRadius: '50%', display: 'inline-block', animationDelay: '0.3s' }} />
                  {' '}
                  {typingList.length === 1 ? `${typingList[0]} is typing` : 'Several people are typing'}
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          id="toggle-info-btn"
          className="chat-header__icon-btn"
          onClick={onToggleInfo}
          title="Room info"
        >
          ℹ️
        </button>
      </div>

      {/* Messages */}
      <div className="chat-messages" id="chat-messages-container">
        {hasMore && (
          <button className="chat-load-more" onClick={onLoadMore}>
            Load earlier messages
          </button>
        )}

        {loading ? (
          <div className="chat-messages__loading">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="skeleton" style={{ height: 56, margin: '8px 24px', borderRadius: 12 }} />
            ))}
          </div>
        ) : groupedMessages.length === 0 ? (
          <div className="chat-messages__empty">
            <span style={{ fontSize: 48 }}>👋</span>
            <p>No messages yet. Say hello!</p>
          </div>
        ) : (
          groupedMessages.map((item) =>
            item.type === 'date' ? (
              <div key={item.id} className="chat-date-separator">
                <span>{item.label}</span>
              </div>
            ) : (
              <MessageBubble
                key={item.msg._id}
                message={item.msg}
                isOwn={item.isOwn}
                isGrouped={item.isGrouped}
                onReply={setReplyTo}
                currentUser={currentUser}
              />
            )
          )
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            className="chat-reply-preview"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="chat-reply-preview__inner">
              <span className="chat-reply-preview__label">↩ Replying to</span>
              <span className="chat-reply-preview__text">{replyTo.content}</span>
            </div>
            <button className="chat-reply-preview__close" onClick={() => setReplyTo(null)}>×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          {/* Emoji picker */}
          <div className="emoji-picker-container">
            <button
              id="emoji-btn"
              className="chat-input-icon-btn"
              onClick={() => setShowEmoji(!showEmoji)}
              title="Emoji"
            >
              😊
            </button>
            <AnimatePresence>
              {showEmoji && (
                <motion.div
                  className="emoji-picker-popup"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <EmojiPicker
                    onEmojiClick={handleEmojiSelect}
                    theme="dark"
                    skinTonesDisabled
                    searchPlaceHolder="Search emoji..."
                    height={380}
                    width={320}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <textarea
            id="chat-input"
            ref={textareaRef}
            className="chat-textarea"
            placeholder={connected ? `Message #${room.name}` : 'Connecting...'}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={!connected}
            rows={1}
          />

          <div className="chat-input-right">
            <span className={`char-counter ${input.length > MAX_CHARS * 0.8 ? 'char-counter--warn' : ''}`}>
              {input.length}/{MAX_CHARS}
            </span>
            <motion.button
              id="send-btn"
              className={`send-btn ${input.trim() ? 'send-btn--active' : ''}`}
              onClick={handleSend}
              disabled={!input.trim() || !connected}
              whileHover={input.trim() ? { scale: 1.08 } : {}}
              whileTap={input.trim() ? { scale: 0.92 } : {}}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>
          </div>
        </div>
        <p className="chat-hint">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
