import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const CallContext = createContext(null);

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export function CallProvider({ children }) {
  const { socket, on } = useSocket();
  const { user } = useAuth();

  const [callState, setCallState] = useState('idle'); // 'idle' | 'outgoing' | 'incoming' | 'active'
  const [callType, setCallType] = useState('video'); // 'video' | 'audio'
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [callerName, setCallerName] = useState('');
  const [callerId, setCallerId] = useState(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const incomingSignalRef = useRef(null);

  // Sound effects refs
  const ringtoneRef = useRef(null);
  const outgoingToneRef = useRef(null);

  // Initialize ringtones
  useEffect(() => {
    ringtoneRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-84.wav');
    ringtoneRef.current.loop = true;
    outgoingToneRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav');
    outgoingToneRef.current.loop = true;

    return () => {
      ringtoneRef.current?.pause();
      outgoingToneRef.current?.pause();
    };
  }, []);

  // Cleanup WebRTC connections & media streams
  const cleanupCall = useCallback(() => {
    ringtoneRef.current?.pause();
    outgoingToneRef.current?.pause();

    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setCallState('idle');
    setActiveRoomId(null);
    setCallerName('');
    setCallerId(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
    incomingSignalRef.current = null;
  }, []);

  // Send action notification
  const sendCallAction = useCallback((action, customRoomId = null) => {
    if (!socket) return;
    const roomId = customRoomId || activeRoomId;
    socket.emit('call:action', { roomId, action, type: callType, callerId: user?.id });
  }, [socket, activeRoomId, callType, user?.id]);

  // Send WebRTC signaling packet
  const sendSignal = useCallback((signal, targetPeer = null) => {
    if (!socket) return;
    socket.emit('call:signal', { roomId: activeRoomId, signal, to: targetPeer });
  }, [socket, activeRoomId]);

  // Handle incoming signaling packets
  const handleSignal = useCallback(async ({ senderId, signal }) => {
    if (senderId === user?.id) return;

    try {
      if (signal.sdp) {
        if (!peerConnectionRef.current) return;
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));

        if (signal.sdp.type === 'offer') {
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          sendSignal({ sdp: answer }, senderId);
        }
      } else if (signal.candidate) {
        if (!peerConnectionRef.current) return;
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (err) {
      console.error('Error handling signaling:', err);
    }
  }, [user?.id, sendSignal]);

  // Setup Peer Connection
  const setupPeerConnection = useCallback(async (isInitiator, targetPeer = null) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // Track state to debug
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({ candidate: event.candidate }, targetPeer);
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal({ sdp: offer });
    } else if (incomingSignalRef.current) {
      await handleSignal({ senderId: callerId, signal: incomingSignalRef.current });
    }
  }, [callerId, sendSignal, handleSignal]);

  // Initiate call
  const initiateCall = useCallback(async (roomId, type = 'video') => {
    cleanupCall();
    setCallState('outgoing');
    setCallType(type);
    setActiveRoomId(roomId);
    setCallerId(user?.id);

    try {
      outgoingToneRef.current?.play().catch(() => {});
      
      // Capture local stream
      const constraints = {
        video: type === 'video' ? { width: 1280, height: 720, facingMode: 'user' } : false,
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Emit initiation to room members
      if (socket) {
        socket.emit('call:action', { roomId, action: 'ringing', type, callerId: user?.id });
      }

      toast.success(`Starting ${type} call...`);
    } catch (err) {
      console.error('Failed to get media devices:', err);
      toast.error('Could not access microphone/camera. Please check permissions.');
      cleanupCall();
    }
  }, [socket, user?.id, cleanupCall]);

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    ringtoneRef.current?.pause();
    setCallState('active');

    try {
      const constraints = {
        video: callType === 'video' ? { width: 1280, height: 720, facingMode: 'user' } : false,
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      sendCallAction('accept');
      await setupPeerConnection(false);
      toast.success('Call connected');
    } catch (err) {
      console.error('Failed to accept call:', err);
      toast.error('Could not access microphone/camera.');
      sendCallAction('reject');
      cleanupCall();
    }
  }, [callType, setupPeerConnection, sendCallAction, cleanupCall]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    sendCallAction('reject');
    cleanupCall();
    toast('Call declined', { icon: '🚫' });
  }, [sendCallAction, cleanupCall]);

  // End active call
  const endCall = useCallback(() => {
    sendCallAction('hangup');
    cleanupCall();
    toast('Call ended', { icon: '📴' });
  }, [sendCallAction, cleanupCall]);

  // Toggle audio track (mute)
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        sendCallAction(audioTrack.enabled ? 'unmute-audio' : 'mute-audio');
      }
    }
  }, [sendCallAction]);

  // Toggle video track
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current && callType === 'video') {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        sendCallAction(videoTrack.enabled ? 'show-video' : 'hide-video');
      }
    }
  }, [callType, sendCallAction]);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    if (!isScreenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        
        const videoTrack = stream.getVideoTracks()[0];
        const pc = peerConnectionRef.current;

        if (pc && videoTrack) {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        }

        // Listen for stop sharing from browser controls
        videoTrack.onended = () => {
          stopScreenSharing();
        };

        setIsScreenSharing(true);
        sendCallAction('start-screenshare');
      } catch (err) {
        console.error('Error sharing screen:', err);
      }
    } else {
      stopScreenSharing();
    }
  }, [isScreenSharing, sendCallAction]);

  const stopScreenSharing = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    if (localStreamRef.current) {
      const originalVideoTrack = localStreamRef.current.getVideoTracks()[0];
      const pc = peerConnectionRef.current;
      if (pc && originalVideoTrack) {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(originalVideoTrack);
        }
      }
    }
    setIsScreenSharing(false);
    sendCallAction('stop-screenshare');
  }, [sendCallAction]);

  // Listen for socket signaling events
  useEffect(() => {
    if (!socket) return;

    // Incoming signaling Relays
    const signalUnsub = on('call:signal', handleSignal);

    // Call state relay actions
    const actionUnsub = on('call:action', async ({ senderId, username, action, type, callerId }) => {
      if (senderId === user?.id) return;

      switch (action) {
        case 'ringing':
          if (callState === 'idle') {
            setCallState('incoming');
            setCallType(type);
            setCallerName(username);
            setCallerId(senderId);
            setActiveRoomId(activeRoomId);
            ringtoneRef.current?.play().catch(() => {});
          } else {
            // Busy reply
            socket.emit('call:action', { roomId: activeRoomId, action: 'busy', to: senderId });
          }
          break;

        case 'accept':
          outgoingToneRef.current?.pause();
          setCallState('active');
          await setupPeerConnection(true, senderId);
          break;

        case 'reject':
          outgoingToneRef.current?.pause();
          toast(`${username} declined the call.`, { icon: '🚫' });
          cleanupCall();
          break;

        case 'hangup':
          toast('Call ended by peer.', { icon: '📴' });
          cleanupCall();
          break;

        case 'busy':
          outgoingToneRef.current?.pause();
          toast('Peer is currently busy.', { icon: '⏳' });
          cleanupCall();
          break;

        case 'mute-audio':
          toast(`${username} muted.`, { icon: '🔇' });
          break;

        case 'unmute-audio':
          toast(`${username} unmuted.`, { icon: '🎙️' });
          break;

        case 'hide-video':
          toast(`${username} stopped video.`, { icon: '📷' });
          break;

        case 'show-video':
          toast(`${username} started video.`, { icon: '📹' });
          break;

        default:
          break;
      }
    });

    return () => {
      signalUnsub();
      actionUnsub();
    };
  }, [socket, callState, activeRoomId, handleSignal, setupPeerConnection, cleanupCall, user?.id, on]);

  return (
    <CallContext.Provider value={{
      callState,
      callType,
      callerName,
      localStream,
      remoteStream,
      isMuted,
      isVideoOff,
      isScreenSharing,
      initiateCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleVideo,
      toggleScreenShare,
    }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within CallProvider');
  return context;
}
