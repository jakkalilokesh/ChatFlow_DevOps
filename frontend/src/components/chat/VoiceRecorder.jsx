import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function VoiceRecorder({ onVoiceMessage, disabled }) {
  const [state, setState] = useState('idle'); // idle | recording | preview
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [waveformData, setWaveformData] = useState([]);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      // Set up analyser for waveform
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Draw waveform
      const drawWaveform = () => {
        const canvas = canvasRef.current;
        if (!canvas || !analyserRef.current) return;
        const ctx = canvas.getContext('2d');
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteTimeDomainData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, '#6c63ff');
        gradient.addColorStop(1, '#4ecdc4');

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvas.height) / 2;
          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height / 2 - y / 2, barWidth, Math.max(1, y));
          x += barWidth + 1;
        }
        animFrameRef.current = requestAnimationFrame(drawWaveform);
      };
      drawWaveform();

      // Start MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setState('preview');
      };
      recorder.start(100);
      mediaRecorderRef.current = recorder;

      setState('recording');
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (err) {
      toast.error('Microphone access denied');
    }
  }, []);

  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current);
    cancelAnimationFrame(animFrameRef.current);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const cancelRecording = useCallback(() => {
    stopRecording();
    setState('idle');
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
  }, [stopRecording]);

  const sendVoiceNote = useCallback(async () => {
    if (!audioBlob) return;
    try {
      // Upload to MinIO
      const formData = new FormData();
      formData.append('audio', audioBlob, `voice-${Date.now()}.webm`);
      const { data } = await api.post('/api/upload/presign', {
        bucket: 'voice-notes',
        fileName: `voice-${Date.now()}.webm`,
        fileType: audioBlob.type,
      });
      await fetch(data.uploadUrl, { method: 'PUT', body: audioBlob, headers: { 'Content-Type': audioBlob.type } });

      // Generate simple waveform data (40 bars)
      const waveform = Array.from({ length: 40 }, () => Math.random() * 0.8 + 0.2);

      onVoiceMessage?.({ audioUrl: data.fileUrl, duration, waveformData: waveform, mimeType: audioBlob.type });
      setState('idle');
      setAudioBlob(null);
      setAudioUrl(null);
      setDuration(0);
      toast.success('Voice note sent!');
    } catch (err) {
      toast.error('Failed to send voice note');
    }
  }, [audioBlob, duration, onVoiceMessage]);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  useEffect(() => () => { cancelRecording(); }, [cancelRecording]);

  if (state === 'idle') {
    return (
      <motion.button
        id="voice-record-btn"
        onClick={startRecording}
        disabled={disabled}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title="Record voice note"
        style={{
          width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', fontSize: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'breathe 2s ease-in-out infinite',
        }}
      >
        🎤
      </motion.button>
    );
  }

  if (state === 'recording') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 24 }}>
        <motion.div
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }}
        />
        <canvas ref={canvasRef} width={80} height={28} style={{ borderRadius: 4 }} />
        <span style={{ fontSize: 13, color: '#ef4444', fontVariantNumeric: 'tabular-nums', minWidth: 40 }}>
          {formatTime(duration)}
        </span>
        <button onClick={stopRecording} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 16, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>
          Stop
        </button>
        <button onClick={cancelRecording} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: 16 }}>
          ✕
        </button>
      </div>
    );
  }

  if (state === 'preview') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 24 }}>
        <audio src={audioUrl} controls style={{ height: 28 }} />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatTime(duration)}</span>
        <button onClick={sendVoiceNote} style={{ background: 'var(--accent, #8b5cf6)', color: 'white', border: 'none', borderRadius: 16, padding: '4px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
          Send ↑
        </button>
        <button onClick={() => { setState('idle'); setAudioBlob(null); setAudioUrl(null); }} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: 12 }}>
          Re-record
        </button>
        <button onClick={cancelRecording} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>
    );
  }

  return null;
}
