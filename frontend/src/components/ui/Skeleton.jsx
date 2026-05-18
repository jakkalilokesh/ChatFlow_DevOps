import React from 'react';

export const Skeleton = ({ className = '', style = {} }) => (
  <div className={`skeleton ${className}`} style={style} />
);

export const MessageSkeleton = () => (
  <div className="skeleton-message">
    <Skeleton className="skeleton-avatar" />
    <div className="skeleton-message__body">
      <div className="skeleton-message__header">
        <Skeleton style={{ width: 100, height: 14 }} />
        <Skeleton style={{ width: 60, height: 12 }} />
      </div>
      <Skeleton style={{ width: '75%', height: 14, marginTop: 8 }} />
      <Skeleton style={{ width: '50%', height: 14, marginTop: 6 }} />
    </div>
  </div>
);

export const ChannelSkeleton = () => (
  <div className="skeleton-channels">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="skeleton-channel-item">
        <Skeleton style={{ width: 14, height: 14, borderRadius: 3 }} />
        <Skeleton style={{ width: `${55 + Math.random() * 35}%`, height: 14 }} />
      </div>
    ))}
  </div>
);

export const CardSkeleton = ({ lines = 3 }) => (
  <div className="skeleton-card">
    <Skeleton className="skeleton-card__img" />
    <div className="skeleton-card__body">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} style={{ width: i === lines - 1 ? '60%' : '100%', height: 14, marginBottom: 8 }} />
      ))}
    </div>
  </div>
);

export default Skeleton;
