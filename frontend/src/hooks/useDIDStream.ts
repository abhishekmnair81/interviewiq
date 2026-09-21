'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
const BACKEND_BASE = rawUrl.replace(/\/api\/?$/, '');

export type StreamStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'unsupported';

interface UseDIDStreamReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  status: StreamStatus;
  error: string | null;
  speak: (text: string) => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export function useDIDStream(): UseDIDStreamReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const [status, setStatus] = useState<StreamStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const api = useCallback(async (path: string, body: object, method = 'POST') => {
    const res = await fetch(`${BACKEND_BASE}/api/analysis${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || err.message || `HTTP ${res.status}`);
    }
    return res.json();
  }, []);

  const connect = useCallback(async () => {
    if (status === 'connecting' || status === 'connected') return;
    if (typeof RTCPeerConnection === 'undefined') {
      setStatus('unsupported');
      setError('WebRTC is not supported in this browser. Use Chrome or Edge.');
      return;
    }

    setStatus('connecting');
    setError(null);

    try {
      const streamData = await api('/avatar/stream/', {});

      if (streamData.code === 'NO_API_KEY') {
        setStatus('error');
        setError('D-ID API key not configured. Switched to Interactive 3D Avatar.');
        return;
      }

      streamIdRef.current = streamData.id;
      sessionIdRef.current = streamData.session_id;

      const iceServers = streamData.ice_servers || [{ urls: 'stun:stun.l.google.com:19302' }];
      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;

      pc.ontrack = (event) => {
        if (videoRef.current && event.streams?.[0]) {
          videoRef.current.srcObject = event.streams[0];
          videoRef.current.play().catch(() => {});
          setStatus('connected');
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(streamData.offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await api(`/avatar/stream/${streamIdRef.current}/sdp/`, {
        answer: { type: answer.type, sdp: answer.sdp },
        session_id: sessionIdRef.current,
      });

      pc.onicecandidate = async (event) => {
        if (event.candidate && streamIdRef.current && sessionIdRef.current) {
          try {
            await api(`/avatar/stream/${streamIdRef.current}/ice/`, {
              candidate: event.candidate.toJSON(),
              session_id: sessionIdRef.current,
            });
          } catch (e) {
            console.warn('ICE candidate send failed:', e);
          }
        }
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === 'connected') setStatus('connected');
        if (state === 'failed' || state === 'disconnected') {
          setStatus('error');
          setError('WebRTC video stream disconnected.');
        }
      };

    } catch (err: unknown) {
      console.error('D-ID connect error:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to connect to D-ID avatar stream');
    }
  }, [api, status]);

  const speak = useCallback(async (text: string) => {
    if (!streamIdRef.current || !sessionIdRef.current) {
      console.warn('D-ID stream not ready — fallback to audio TTS');
      return;
    }
    try {
      await api(`/avatar/stream/${streamIdRef.current}/speak/`, {
        text,
        session_id: sessionIdRef.current,
        voice_id: 'en-US-GuyNeural',
      });
    } catch (err) {
      console.error('D-ID speak error:', err);
    }
  }, [api]);

  const disconnect = useCallback(() => {
    if (streamIdRef.current && sessionIdRef.current) {
      api(`/avatar/stream/${streamIdRef.current}/close/`, {
        session_id: sessionIdRef.current,
      }, 'DELETE').catch(() => {});
    }
    pcRef.current?.close();
    pcRef.current = null;
    streamIdRef.current = null;
    sessionIdRef.current = null;
    setStatus('idle');
  }, [api]);

  useEffect(() => {
    return () => { disconnect(); };
  }, [disconnect]);

  return useMemo(() => ({ videoRef, status, error, speak, connect, disconnect }), [status, error, speak, connect, disconnect]);
}
