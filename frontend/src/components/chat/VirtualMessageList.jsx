import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { MessageSkeleton } from '../ui/Skeleton';
import { EmptyMessages }   from '../ui/EmptyState';

/**
 * Virtualised message list — handles 10,000+ messages with no lag.
 * - Auto-scrolls to bottom on new message
 * - Loads older messages when scrolled near top (infinite scroll up)
 * - Shows skeleton during initial load
 * - Scroll-to-bottom FAB when user is scrolled up
 */
export default function VirtualMessageList({
  messages = [],
  loading   = false,
  hasMore   = false,
  onLoadMore,
  renderMessage,
  currentUserId,
}) {
  const parentRef       = useRef(null);
  const [showJump, setShowJump] = useState(false);
  const isAtBottom      = useRef(true);
  const prevCount       = useRef(messages.length);

  const virtualizer = useVirtualizer({
    count:           messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize:    () => 80,
    overscan:        12,
  });

  // Auto-scroll to bottom when new messages arrive (if user was at bottom)
  useEffect(() => {
    if (!parentRef.current) return;
    if (messages.length > prevCount.current && isAtBottom.current) {
      virtualizer.scrollToIndex(messages.length - 1, { behavior: 'smooth' });
    }
    prevCount.current = messages.length;
  }, [messages.length]); // eslint-disable-line

  // Track scroll position for FAB visibility + infinite scroll
  const handleScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAtBottom.current = distFromBottom < 120;
    setShowJump(distFromBottom > 400);
    // Load older messages when near top
    if (el.scrollTop < 200 && hasMore && onLoadMore) onLoadMore();
  }, [hasMore, onLoadMore]);

  const scrollToBottom = () => {
    virtualizer.scrollToIndex(messages.length - 1, { behavior: 'smooth' });
    setShowJump(false);
  };

  if (loading && messages.length === 0) {
    return (
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {Array.from({ length: 6 }).map((_, i) => <MessageSkeleton key={i} />)}
      </div>
    );
  }

  if (!loading && messages.length === 0) {
    return <EmptyMessages />;
  }

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      {/* Loading older messages indicator */}
      {loading && messages.length > 0 && (
        <div style={{ textAlign: 'center', padding: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
          Loading older messages…
        </div>
      )}

      {/* Virtualised list */}
      <div
        ref={parentRef}
        onScroll={handleScroll}
        style={{ height: '100%', overflowY: 'auto' }}
      >
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
          {virtualizer.getVirtualItems().map((vRow) => (
            <div
              key={vRow.key}
              data-index={vRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute', top: 0, left: 0, width: '100%',
                transform: `translateY(${vRow.start}px)`,
              }}
            >
              {renderMessage(messages[vRow.index], vRow.index)}
            </div>
          ))}
        </div>
      </div>

      {/* Scroll-to-bottom FAB */}
      {showJump && (
        <button
          onClick={scrollToBottom}
          style={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #6c63ff, #4ecdc4)',
            color: '#fff', border: 'none', borderRadius: 20,
            padding: '6px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            boxShadow: '0 4px 16px rgba(108,99,255,0.4)', zIndex: 10,
          }}
        >
          ↓ Jump to latest
        </button>
      )}
    </div>
  );
}
