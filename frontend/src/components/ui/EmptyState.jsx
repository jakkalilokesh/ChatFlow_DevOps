import React from 'react';

const ChatBubbleSVG = () => (
  <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 140, height: 112, opacity: 0.25 }}>
    <defs>
      <linearGradient id="emptyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6c63ff" />
        <stop offset="100%" stopColor="#4ecdc4" />
      </linearGradient>
    </defs>
    <rect x="20" y="20" width="120" height="80" rx="16" fill="url(#emptyGrad)" opacity="0.4" />
    <rect x="35" y="40" width="90" height="8" rx="4" fill="url(#emptyGrad)">
      <animate attributeName="width" from="90" to="60" dur="2.5s" repeatCount="indefinite" direction="alternate" />
    </rect>
    <rect x="35" y="56" width="70" height="8" rx="4" fill="url(#emptyGrad)" opacity="0.7" />
    <rect x="35" y="72" width="80" height="8" rx="4" fill="url(#emptyGrad)" opacity="0.5" />
    <path d="M50 100 L30 130 L70 110" fill="url(#emptyGrad)" opacity="0.4" />
    <rect x="80" y="55" width="80" height="60" rx="12" fill="url(#emptyGrad)" opacity="0.25" />
    <rect x="92" y="70" width="56" height="6" rx="3" fill="url(#emptyGrad)" opacity="0.5" />
    <rect x="92" y="83" width="40" height="6" rx="3" fill="url(#emptyGrad)" opacity="0.35" />
  </svg>
);

const SearchSVG = () => (
  <svg viewBox="0 0 160 160" fill="none" style={{ width: 120, height: 120, opacity: 0.25 }}>
    <circle cx="70" cy="70" r="45" stroke="#6c63ff" strokeWidth="8" />
    <line x1="105" y1="105" x2="140" y2="140" stroke="#4ecdc4" strokeWidth="8" strokeLinecap="round" />
    <line x1="50" y1="65" x2="90" y2="65" stroke="#6c63ff" strokeWidth="5" strokeLinecap="round" />
    <line x1="50" y1="78" x2="78" y2="78" stroke="#6c63ff" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
  </svg>
);

const BellSVG = () => (
  <svg viewBox="0 0 160 160" fill="none" style={{ width: 120, height: 120, opacity: 0.25 }}>
    <path d="M80 20 C55 20 40 40 40 65 L40 100 L25 115 L135 115 L120 100 L120 65 C120 40 105 20 80 20Z" fill="#6c63ff" opacity="0.5" />
    <ellipse cx="80" cy="125" rx="15" ry="8" fill="#4ecdc4" opacity="0.6" />
    <animate attributeName="opacity" from="0.25" to="0.4" dur="2s" repeatCount="indefinite" direction="alternate" />
  </svg>
);

export const EmptyMessages = () => (
  <div className="empty-state">
    <ChatBubbleSVG />
    <h3 className="empty-state__title">No messages yet</h3>
    <p className="empty-state__desc">Be the first to say something! Type a message below to get the conversation started. 👋</p>
  </div>
);

export const EmptySearch = ({ query = '' }) => (
  <div className="empty-state">
    <SearchSVG />
    <h3 className="empty-state__title">No results found</h3>
    <p className="empty-state__desc">
      {query ? `We couldn't find anything matching "${query}". Try different keywords.` : 'Start typing to search messages, rooms, and people.'}
    </p>
  </div>
);

export const EmptyNotifications = () => (
  <div className="empty-state">
    <BellSVG />
    <h3 className="empty-state__title">All caught up!</h3>
    <p className="empty-state__desc">No new notifications right now. We'll let you know when something needs your attention.</p>
  </div>
);

export const EmptyChannels = () => (
  <div className="empty-state" style={{ padding: '24px 16px' }}>
    <span style={{ fontSize: 40, marginBottom: 12, display: 'block' }}>💬</span>
    <h3 className="empty-state__title" style={{ fontSize: 16 }}>No channels yet</h3>
    <p className="empty-state__desc" style={{ fontSize: 13 }}>Create a channel to start collaborating with your team.</p>
  </div>
);

export default EmptyMessages;
