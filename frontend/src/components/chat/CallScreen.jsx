import React, { useEffect, useRef, useState } from 'react';
import { useCall } from '../../context/CallContext';
import './CallScreen.css';

export default function CallScreen() {
  const {
    callState,
    callType,
    callerName,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isScreenSharing,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
  } = useCall();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [duration, setDuration] = useState(0);

  // Sync media streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Duration timer for active call state
  useEffect(() => {
    if (callState !== 'active') {
      setDuration(0);
      return;
    }

    const timer = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [callState]);

  const formatDuration = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (callState === 'idle') return null;

  return (
    <div className="call-overlay">
      {/* ── Ringing Screen (Incoming / Outgoing) ──────────────── */}
      {(callState === 'incoming' || callState === 'outgoing') && (
        <div className="call-ringing-container">
          <div className="call-ringing-avatar-glow">
            <div className="call-pulse-ring" />
            <div className="call-pulse-ring" />
            <div className="call-pulse-ring" />
            <div className="call-ringing-avatar">
              {callerName?.[0]?.toUpperCase() || 'C'}
            </div>
          </div>

          <div>
            <h2 className="call-ringing-title">
              {callState === 'incoming' ? 'Incoming Call' : 'Calling Room...'}
            </h2>
            <p className="call-ringing-subtitle">
              {callState === 'incoming' 
                ? `${callerName} is inviting you to a ${callType} call` 
                : `Waiting for others to join...`
              }
            </p>
          </div>

          <div className="call-ringing-actions">
            {callState === 'incoming' && (
              <button 
                onClick={acceptCall} 
                className="call-ringing-btn call-ringing-btn--accept"
                title="Accept Call"
              >
                📞
              </button>
            )}
            <button 
              onClick={rejectCall} 
              className="call-ringing-btn call-ringing-btn--decline"
              title="Decline Call"
            >
              ❌
            </button>
          </div>
        </div>
      )}

      {/* ── Active connected WebRTC Streams Viewport ──────────── */}
      {callState === 'active' && (
        <div className="call-active-viewport">
          {/* Active Call Badge Duration */}
          <div className="call-duration-badge">
            🟢 Active — {formatDuration(duration)}
          </div>

          {/* Remote Peer Stream */}
          {callType === 'video' && remoteStream ? (
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="call-remote-video"
            />
          ) : (
            <div className="call-audio-avatar-fallback">
              <div className="call-ringing-avatar">
                {callerName?.[0]?.toUpperCase() || 'P'}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                {callerName || 'Peer'} is in the call
              </p>
            </div>
          )}

          {/* Picture in picture local view */}
          {localStream && !isVideoOff && callType === 'video' && (
            <div className="call-local-pip">
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted
              />
            </div>
          )}

          {/* Overlay Interactive Control Toolbar */}
          <div className="call-controls-bar">
            {/* Audio Toggle (Mute) */}
            <button 
              onClick={toggleMute} 
              className={`call-control-btn ${isMuted ? 'call-control-btn--active' : ''}`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? '🔇' : '🎙️'}
            </button>

            {/* Video Toggle */}
            {callType === 'video' && (
              <button 
                onClick={toggleVideo} 
                className={`call-control-btn ${isVideoOff ? 'call-control-btn--active' : ''}`}
                title={isVideoOff ? 'Turn video on' : 'Turn video off'}
              >
                {isVideoOff ? '📷' : '📹'}
              </button>
            )}

            {/* Screen share toggle */}
            {callType === 'video' && (
              <button 
                onClick={toggleScreenShare} 
                className={`call-control-btn ${isScreenSharing ? 'call-control-btn--active' : ''}`}
                title={isScreenSharing ? 'Stop screen sharing' : 'Start screen sharing'}
              >
                🖥️
              </button>
            )}

            {/* Hang up call */}
            <button 
              onClick={endCall} 
              className="call-control-btn call-control-btn--hangup"
              title="Hang up call"
            >
              ❌
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
