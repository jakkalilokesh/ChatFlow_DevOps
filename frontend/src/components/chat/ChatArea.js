import React, {
  useState, useRef, useEffect, useCallback, useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from 'emoji-picker-react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { useSocket } from '../../context/SocketContext';
import { useCall } from '../../context/CallContext';
import MessageBubble from './MessageBubble';
import VirtualMessageList from './VirtualMessageList';
import GiphyPicker from './GiphyPicker';
import PollCreator from './PollCreator';
import { MessageSkeleton } from '../ui/Skeleton';
import { EmptyMessages } from '../ui/EmptyState';
import DropZone from './DropZone';
import { executeSlashCommand, SLASH_COMMANDS } from '../../utils/slashCommands';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './ChatArea.css';

const MAX_CHARS = 2000;

// Slash command autocomplete dropdown
function SlashDropdown({ commands, onSelect }) {
  return (
    <div style={{
      position: 'absolute', bottom: '100%', left: 0, right: 0, zIndex: 100,
      background: 'rgba(13,20,40,0.98)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12, overflow: 'hidden', marginBottom: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      {commands.map((cmd) => (
        <button
          key={cmd.name}
          onClick={() => onSelect(cmd)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '10px 14px',
            background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            color: 'var(--text-primary)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(108,99,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          <span style={{ fontFamily: 'monospace', color: '#6c63ff', fontWeight: 600, minWidth: 80 }}>{cmd.name}</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{cmd.desc}</span>
        </button>
      ))}
    </div>
  );
}

export default function ChatArea({
  room, messages = [], loading, hasMore, onLoadMore, currentUser,
  onToggleSidebar, onToggleInfo, sidebarOpen,
}) {
  const { sendMessage, startTyping, stopTyping, typingUsers, connected } = useSocket();
  const { initiateCall } = useCall();
  const [input,      setInput]      = useState('');
  const [showEmoji,  setShowEmoji]  = useState(false);
  const [showGiphy,  setShowGiphy]  = useState(false);
  const [showPoll,   setShowPoll]   = useState(false);
  const [replyTo,    setReplyTo]    = useState(null);
  const [slashCmds,  setSlashCmds]  = useState([]);
  const textareaRef    = useRef(null);
  const typingTimerRef = useRef(null);
  const isTypingRef    = useRef(false);
  const uploadTriggerRef = useRef(null);

  const handleFileUploaded = useCallback((fileData) => {
    let content = `[Attachment: ${fileData.name}](${fileData.url})`;
    if (fileData.type.startsWith('image/')) {
      content = `![${fileData.name}](${fileData.url})`;
    } else if (fileData.type.startsWith('video/')) {
      content = `Video attachment: ${fileData.url}`;
    }

    sendMessage?.({
      content,
      roomId: room._id,
      replyToId: replyTo?.id || null
    });
    setReplyTo(null);
  }, [sendMessage, room?._id, replyTo]);

  const roomTyping = room ? (typingUsers?.[room._id] || {}) : {};
  const typingList = Object.values(roomTyping).filter(Boolean);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  // Slash command detection
  const handleInput = (e) => {
    const val = e.target.value;
    if (val.length > MAX_CHARS) return;
    setInput(val);

    // Show slash autocomplete
    if (val.startsWith('/') && !val.includes(' ')) {
      const partial = val.toLowerCase();
      const matches = SLASH_COMMANDS.filter((c) => c.name.startsWith(partial));
      setSlashCmds(matches);
    } else {
      setSlashCmds([]);
    }

    // Typing indicator
    if (!isTypingRef.current && room) {
      isTypingRef.current = true;
      startTyping?.(room._id);
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      if (room) stopTyping?.(room._id);
    }, 1500);
  };

  const handleSlashSelect = (cmd) => {
    setSlashCmds([]);
    if (cmd.name === '/gif')       { setInput(''); setShowGiphy(true); return; }
    if (cmd.name === '/poll')      { setInput(''); setShowPoll(true); return; }
    if (cmd.name === '/shrug')     { setInput('¯\\_(ツ)_/¯'); return; }
    if (cmd.name === '/tableflip') { setInput('(╯°□°）╯彡┻━┻'); return; }
    setInput(cmd.name + ' ');
    textareaRef.current?.focus();
  };

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || !room || !connected) return;

    // Execute slash commands
    if (text.startsWith('/')) {
      const parts = text.split(' ');
      const cmdName = parts[0];
      const args = parts.slice(1).join(' ');
      const handled = executeSlashCommand(cmdName, args, {
        setInput,
        openGiphy:     () => setShowGiphy(true),
        openPoll:      () => setShowPoll(true),
        sendMessage:   (content) => sendMessage?.(room._id, content, 'text', null, room.isDM),
        currentRoom:   room,
      });
      if (handled) { setInput(''); setSlashCmds([]); return; }
    }

    sendMessage?.(room._id, text, 'text', replyTo?._id || null, room.isDM);
    setInput('');
    setReplyTo(null);
    setSlashCmds([]);
    clearTimeout(typingTimerRef.current);
    isTypingRef.current = false;
    stopTyping?.(room._id);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [input, room, connected, sendMessage, replyTo, stopTyping]);

  const handleKeyDown = (e) => {
    if (slashCmds.length > 0 && (e.key === 'Escape')) {
      setSlashCmds([]);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleGifSelect = (gif) => {
    if (!room || !connected) return;
    sendMessage?.(room._id, gif.url, 'gif', null, room.isDM);
    setShowGiphy(false);
  };

  const handlePollSubmit = (pollData) => {
    if (!room || !connected) return;
    sendMessage?.(room._id, JSON.stringify(pollData), 'poll', null, room.isDM);
    setShowPoll(false);
  };

  // Group messages by date for VirtualMessageList render prop
  const groupedMessages = useMemo(() => {
    if (!messages.length) return [];
    const groups = [];
    let currentDate = null;
    messages.forEach((msg, i) => {
      const msgDate = new Date(msg.createdAt);
      const prevMsg  = messages[i - 1];
      if (!currentDate || !isSameDay(new Date(prevMsg?.createdAt || 0), msgDate)) {
        currentDate = msgDate;
        let label = '';
        if (isToday(msgDate))     label = 'Today';
        else if (isYesterday(msgDate)) label = 'Yesterday';
        else label = format(msgDate, 'EEEE, MMMM d');
        groups.push({ type: 'date', label, id: `date-${msgDate.toDateString()}` });
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

  const renderMessage = useCallback((item) => {
    if (!item) return null;
    if (item.type === 'date') {
      return (
        <div key={item.id} className="chat-date-separator">
          <span>{item.label}</span>
        </div>
      );
    }
    return (
      <MessageBubble
        key={item.msg._id}
        message={item.msg}
        isOwn={item.isOwn}
        isGrouped={item.isGrouped}
        onReply={setReplyTo}
        currentUser={currentUser}
      />
    );
  }, [currentUser]);

  const isMember = room?.type === 'public' || room?.members?.includes(currentUser?.id) || room?.createdBy === currentUser?.id;
  const [localPending, setLocalPending] = useState(false);

  useEffect(() => {
    if (room) {
      setLocalPending(room.pendingRequests?.includes(currentUser?.id) || false);
    }
  }, [room?._id, room?.pendingRequests, currentUser?.id]);

  const handleSendJoinRequest = async () => {
    const loadingToast = toast.loading('Sending join request...');
    try {
      await api.post(`/api/chat/rooms/${room._id}/join-request`);
      toast.success('Join request sent to the creator!', { id: loadingToast });
      setLocalPending(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send request', { id: loadingToast });
    }
  };

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

  if (!isMember) {
    return (
      <div className="chat-area" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', background: 'rgba(10, 15, 30, 0.95)' }}>
        <div style={{
          maxWidth: 480, width: '100%',
          padding: 40, borderRadius: 24,
          background: 'rgba(13, 20, 40, 0.45)', border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20
        }}>
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 3 }} style={{ fontSize: 64 }}>🔒</motion.div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 800, color: 'white', background: 'linear-gradient(to right, #fff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            # {room.name}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
            {room.description || 'This room requires permission from the creator to join and view messages.'}
          </p>
          
          {localPending ? (
            <button disabled style={{
              width: '100%', padding: '14px 28px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, color: 'var(--text-muted)', fontSize: 14, fontWeight: 600,
              cursor: 'not-allowed'
            }}>
              ⏳ Join Request Pending Approval
            </button>
          ) : (
            <motion.button
              onClick={handleSendJoinRequest}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%', padding: '14px 28px',
                background: 'var(--gradient-primary)', border: 'none',
                borderRadius: 12, color: 'white', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 8px 24px rgba(124,111,247,0.35)'
              }}
            >
              🚪 Request to Join Room
            </motion.button>
          )}
        </div>
      </div>
    );
  }

  return (
    <DropZone onFileUploaded={handleFileUploaded} disabled={!connected} triggerRef={uploadTriggerRef}>
      <div className="chat-area" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ────────────────────────────────────────── */}
      <div className="chat-header">
        <button id="toggle-sidebar-btn" className="chat-header__icon-btn touch-target" onClick={onToggleSidebar} title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}>☰</button>
        <div className="chat-header__info">
          <div className="chat-header__room-icon" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {room.isDM && room.avatarUrl ? (
              <img src={room.avatarUrl} alt={room.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              room.name[0].toUpperCase()
            )}
          </div>
          <div>
            <h2 className="chat-header__room-name">{room.isDM ? '@' : '#'} {room.name}</h2>
            <p className="chat-header__room-meta">
              {room.isDM ? 'Direct Message' : `${room.memberCount || 0} members`}
              {typingList.length > 0 && (
                <span className="chat-header__typing">
                  {' · '}
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  {' '}{typingList.length === 1 ? `${typingList[0]} is typing` : 'Several people are typing'}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* WebRTC Calling Buttons */}
        <div style={{ display: 'flex', gap: 8, marginRight: 8 }}>
          <button
            className="chat-header__icon-btn touch-target"
            onClick={() => initiateCall(room._id, 'audio')}
            title="Voice Call"
            style={{ fontSize: 16 }}
          >
            📞
          </button>
          <button
            className="chat-header__icon-btn touch-target"
            onClick={() => initiateCall(room._id, 'video')}
            title="Video Call"
            style={{ fontSize: 16 }}
          >
            📹
          </button>
        </div>

        <button id="toggle-info-btn" className="chat-header__icon-btn touch-target" onClick={onToggleInfo} title="Room info">ℹ️</button>
      </div>

      {/* ── Message list (virtual) ─────────────────────────── */}
      <VirtualMessageList
        messages={groupedMessages}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        renderMessage={renderMessage}
        currentUserId={currentUser?.id}
      />

      {/* ── Connection warning ────────────────────────────── */}
      {!connected && (
        <div style={{ textAlign: 'center', padding: '6px 16px', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', fontSize: 13 }}>
          ⚠️ Reconnecting to server…
        </div>
      )}

      {/* ── Reply preview ─────────────────────────────────── */}
      <AnimatePresence>
        {replyTo && (
          <motion.div className="chat-reply-preview" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <div className="chat-reply-preview__inner">
              <span className="chat-reply-preview__label">↩ Replying to</span>
              <span className="chat-reply-preview__text">{replyTo.content}</span>
            </div>
            <button className="chat-reply-preview__close" onClick={() => setReplyTo(null)}>×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input area ────────────────────────────────────── */}
      <div className="chat-input-area" style={{ flexShrink: 0, position: 'relative' }}>
        {/* Slash autocomplete */}
        <AnimatePresence>
          {slashCmds.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, zIndex: 100, padding: '0 12px 4px' }}>
              <SlashDropdown commands={slashCmds} onSelect={handleSlashSelect} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* GIF picker */}
        <AnimatePresence>
          {showGiphy && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} style={{ position: 'absolute', bottom: '100%', left: 12, zIndex: 200 }}>
              <GiphyPicker onSelect={handleGifSelect} onClose={() => setShowGiphy(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Poll creator */}
        <AnimatePresence>
          {showPoll && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} style={{ position: 'absolute', bottom: '100%', left: 12, zIndex: 200 }}>
              <PollCreator onSubmit={handlePollSubmit} onClose={() => setShowPoll(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="chat-input-wrapper">
          {/* Toolbar buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, paddingLeft: 8 }}>
            {/* Emoji */}
            <div className="emoji-picker-container" style={{ position: 'relative' }}>
              <button id="emoji-btn" className="chat-input-icon-btn touch-target" onClick={() => setShowEmoji(!showEmoji)} title="Emoji">😊</button>
              <AnimatePresence>
                {showEmoji && (
                  <motion.div className="emoji-picker-popup" initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }}>
                    <EmojiPicker
                      onEmojiClick={(data) => { setInput((p) => p + data.emoji); setShowEmoji(false); textareaRef.current?.focus(); }}
                      theme="dark" skinTonesDisabled searchPlaceHolder="Search emoji..." height={380} width={320}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* GIF */}
            <button id="gif-btn" className="chat-input-icon-btn touch-target" onClick={() => { setShowGiphy(!showGiphy); setShowPoll(false); }} title="GIF" style={{ fontWeight: 700, fontSize: 11 }}>GIF</button>
            {/* Attachment upload */}
            <button id="upload-btn" className="chat-input-icon-btn touch-target" onClick={() => uploadTriggerRef.current?.()} title="Upload files or media">📎</button>
            {/* Poll */}
            <button id="poll-btn" className="chat-input-icon-btn touch-target" onClick={() => { setShowPoll(!showPoll); setShowGiphy(false); }} title="Create poll">📊</button>
          </div>

          <textarea
            id="chat-input"
            ref={textareaRef}
            className="chat-textarea"
            placeholder={connected ? `Message ${room.isDM ? '@' : '#'}${room.name} — type / for commands` : 'Connecting…'}
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
              whileTap={input.trim()  ? { scale: 0.92 } : {}}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>
          </div>
        </div>
        <p className="chat-hint">Enter to send · Shift+Enter for new line · <kbd>/</kbd> for commands</p>
      </div>
    </div>
    </DropZone>
  );
}
