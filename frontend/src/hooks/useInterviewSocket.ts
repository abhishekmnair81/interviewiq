import { useState, useEffect, useRef, useCallback } from 'react';

export interface FaceReading {
  eye_contact: number;
  stability: number;
  emotion: string;
  timestamp?: number;
}

export interface SocketMessage {
  type: string;
  text?: string;
  is_complete?: boolean;
  expression?: string;
  exchange_count?: number;
  message?: string;
  session_id?: string;
  // Coding phase properties
  question_id?: string;
  title?: string;
  description?: string;
  starter_code?: string;
  language?: string;
  // Coding challenge envelope
  challenge?: {
    id: string;
    index: number;
    total: number;
    title: string;
    description: string;
    starter_code: string;
    language: string;
    examples: Array<{ input: string; expected_output: string }>;
    time_limit_seconds: number;
  };
  // Submission result
  passed?: boolean;
  feedback?: string;
  next_challenge?: {
    id: string;
    index: number;
    total: number;
    title: string;
    description: string;
    starter_code: string;
    language: string;
    examples: Array<{ input: string; expected_output: string }>;
    time_limit_seconds: number;
  };
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseInterviewSocketOptions {
  sessionId?: string | null;
  token?: string | null;
  onAlexSpeaks?: (text: string, isComplete: boolean, expression?: string) => void;
  onError?: (message: string) => void;
}

export function useInterviewSocket(optionsOrSessionId?: string | null | UseInterviewSocketOptions) {
  const isObject = typeof optionsOrSessionId === 'object' && optionsOrSessionId !== null;
  const initialSessionId = isObject ? (optionsOrSessionId as UseInterviewSocketOptions).sessionId : optionsOrSessionId;

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [latestMessage, setLatestMessage] = useState<SocketMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const alexSpeaksCallbackRef = useRef<((text: string, isComplete: boolean, expression?: string) => void) | null>(
    isObject && (optionsOrSessionId as UseInterviewSocketOptions).onAlexSpeaks ? (optionsOrSessionId as UseInterviewSocketOptions).onAlexSpeaks! : null
  );
  const errorCallbackRef = useRef<((message: string) => void) | null>(
    isObject && (optionsOrSessionId as UseInterviewSocketOptions).onError ? (optionsOrSessionId as UseInterviewSocketOptions).onError! : null
  );

  const onAlexSpeaks = useCallback((callback: (text: string, isComplete: boolean) => void) => {
    alexSpeaksCallbackRef.current = callback;
  }, []);

  const onError = useCallback((callback: (message: string) => void) => {
    errorCallbackRef.current = callback;
  }, []);

  const backupToSessionStorage = (msg: SocketMessage) => {
    if (typeof window === 'undefined') return;
    try {
      const existing = JSON.parse(sessionStorage.getItem('alex_interview_backup') || '[]');
      existing.push({ ...msg, timestamp: Date.now() });
      sessionStorage.setItem('alex_interview_backup', JSON.stringify(existing));
    } catch {}
  };

  const connect = useCallback((targetSessionId?: string | null, targetToken?: string | null) => {
    const sId = targetSessionId || initialSessionId;
    if (!sId || typeof window === 'undefined') return;

    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setConnectionStatus('connecting');
    const token = targetToken || (isObject && (optionsOrSessionId as UseInterviewSocketOptions).token) || localStorage.getItem('access_token') || '';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NEXT_PUBLIC_WS_HOST || '127.0.0.1:8000';
    const wsUrl = `${protocol}//${host}/ws/interview/${sId}/?token=${token}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnectionStatus('connected');
        reconnectCountRef.current = 0;

        ws.send(JSON.stringify({ type: 'user_ready' }));
      };

      ws.onmessage = (event) => {
        try {
          const data: SocketMessage = JSON.parse(event.data);
          setLatestMessage(data);
          backupToSessionStorage(data);

          if (data.type === 'alex_speaking' && data.text) {
            if (alexSpeaksCallbackRef.current) {
              alexSpeaksCallbackRef.current(data.text, !!data.is_complete, data.expression);
            }
          } else if (data.type === 'error' && data.message) {
            if (errorCallbackRef.current) {
              errorCallbackRef.current(data.message);
            }
          }
        } catch {}
      };

      ws.onerror = () => {
        setConnectionStatus('error');
        if (errorCallbackRef.current) {
          errorCallbackRef.current('WebSocket connection encountered an error.');
        }
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');

        if (reconnectCountRef.current < 3) {
          const delay = Math.pow(2, reconnectCountRef.current + 1) * 1000;
          reconnectCountRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect(sId, token);
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch {
      setConnectionStatus('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSessionId, optionsOrSessionId]);

  const sendTranscript = useCallback((text: string | object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      if (typeof text === 'string') {
        const payload = { type: 'user_spoke', transcript: text };
        wsRef.current.send(JSON.stringify(payload));
        backupToSessionStorage(payload as SocketMessage);
      } else {
        wsRef.current.send(JSON.stringify(text));
        backupToSessionStorage(text as SocketMessage);
      }
    }
  }, []);

  const sendFaceReading = useCallback((data: FaceReading) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'face_reading',
        data,
      }));
    }
  }, []);

  const endSession = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end_session' }));
    }
  }, []);

  useEffect(() => {
    if (initialSessionId) {
      connect(initialSessionId);
    }
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [initialSessionId, connect]);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    latestMessage,
    connect,
    sendTranscript,
    sendFaceReading,
    endSession,
    onAlexSpeaks,
    onError,

    sendAnswer: sendTranscript,
    sendFacialMetrics: sendFaceReading,
    finishInterview: endSession,
    completeSession: endSession,
  };
}
