'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

interface Question {
  id: string;
  text: string;
  category: string;
  difficulty: string;
}

interface Session {
  id: string;
  question: string;
  status: 'queued' | 'processing' | 'done' | 'failed';
  video_url?: string;
}

export default function RecordPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [category, setCategory] = useState<'behavioral' | 'hr' | 'technical'>('behavioral');
  const [question, setQuestion] = useState<Question | null>(null);
  const [loadingQuestion, setLoadingQuestion] = useState(false);

  const [recordingState, setRecordingState] = useState<'idle' | 'countdown' | 'recording' | 'uploading' | 'processing' | 'done'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [error, setError] = useState('');

  // Fetch random question when category changes or on initial mount
  const fetchQuestion = async (cat = category) => {
    setLoadingQuestion(true);
    setError('');
    try {
      const q = await apiFetch<Question>(`/questions/random/?category=${cat}`);
      setQuestion(q);
    } catch (err: any) {
      setError('Could not fetch question from server.');
    } finally {
      setLoadingQuestion(false);
    }
  };

  useEffect(() => {
    fetchQuestion(category);
  }, [category]);

  // Setup camera preview
  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError('Camera or Microphone access denied. Please grant permission to record.');
      }
    }
    setupCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Timer effect for recording duration
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (recordingState === 'recording') {
      timer = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [recordingState]);

  // Status polling effect when processing or queued
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    if (currentSession && (recordingState === 'uploading' || recordingState === 'processing')) {
      pollInterval = setInterval(async () => {
        try {
          const res = await apiFetch<{ id: string; status: 'queued' | 'processing' | 'done' | 'failed' }>(
            `/sessions/${currentSession.id}/status/`
          );
          if (res.status === 'processing') {
            setRecordingState('processing');
          } else if (res.status === 'done') {
            setRecordingState('done');
            clearInterval(pollInterval);
          }
        } catch (err) {
          // ignore status poll transient errors
        }
      }, 3000);
    }
    return () => clearInterval(pollInterval);
  }, [currentSession, recordingState]);

  // Countdown handler before recording starts
  const startCountdown = () => {
    if (!question) return;
    setError('');
    setRecordingState('countdown');
    setCountdown(3);

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        startActualRecording();
      }
    }, 1000);
  };

  const startActualRecording = () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;

    const stream = videoRef.current.srcObject as MediaStream;
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

    recordedChunksRef.current = [];
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      await handleUploadVideo(blob);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setRecordingState('recording');
    setRecordingSeconds(0);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
      setRecordingState('uploading');
    }
  };

  const handleUploadVideo = async (blob: Blob) => {
    try {
      // 1. Create Session
      const session = await apiFetch<Session>('/sessions/create/', {
        method: 'POST',
        body: JSON.stringify({
          question: question?.text,
          question_category: category,
          question_id: question?.id,
        }),
      });

      setCurrentSession(session);

      // 2. Upload Video Blob
      const formData = new FormData();
      formData.append('video', blob, `session_${session.id}.webm`);

      const token = localStorage.getItem('access_token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

      const uploadRes = await fetch(`${API_BASE_URL}/sessions/${session.id}/upload/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload video file');
      }

      setRecordingState('processing');
    } catch (err: any) {
      setError(err.message || 'Error uploading video');
      setRecordingState('idle');
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 py-4 flex justify-between items-center">
        <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          InterviewIQ
        </Link>
        <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-200 transition">
          ← Back to Dashboard
        </Link>
      </nav>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Question & Controls */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-400 mb-2">Category</h2>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              disabled={recordingState !== 'idle'}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 outline-none"
            >
              <option value="behavioral">Behavioral</option>
              <option value="hr">HR & General</option>
              <option value="technical">Technical</option>
            </select>

            <button
              onClick={() => fetchQuestion()}
              disabled={recordingState !== 'idle' || loadingQuestion}
              className="mt-3 w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg transition"
            >
              {loadingQuestion ? 'Loading Question...' : '🎲 Random Question'}
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Question Prompt</h2>
            <p className="text-lg font-medium text-slate-100 leading-snug">
              {question ? question.text : 'Loading question prompt...'}
            </p>
          </div>

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Right Column: Video Preview & Recording Controls */}
        <div className="md:col-span-2 flex flex-col space-y-4">
          <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />

            {recordingState === 'countdown' && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
                <span className="text-8xl font-black text-blue-500 animate-ping">{countdown}</span>
              </div>
            )}

            {recordingState === 'recording' && (
              <div className="absolute top-4 left-4 flex items-center space-x-2 bg-rose-600/90 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
                <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></span>
                <span>REC {formatTime(recordingSeconds)}</span>
              </div>
            )}

            {(recordingState === 'uploading' || recordingState === 'processing') && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
                <h3 className="text-xl font-bold text-slate-100">
                  {recordingState === 'uploading' ? 'Uploading Video Pipeline...' : 'AI Multimodal Analysis in Progress...'}
                </h3>
                <p className="text-xs text-slate-400 mt-2 max-w-sm">
                  Analyzing speech pacing, eye contact, and answer structure with Whisper, MediaPipe, & BERT.
                </p>
              </div>
            )}

            {recordingState === 'done' && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4 text-3xl">
                  ✓
                </div>
                <h3 className="text-2xl font-extrabold text-slate-100">Analysis Complete!</h3>
                <p className="text-sm text-slate-400 mt-2 mb-6">Your session report is ready for viewing.</p>
                <Link
                  href="/dashboard"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 font-semibold rounded-xl text-white shadow-lg hover:from-blue-500 hover:to-indigo-500 transition"
                >
                  View Dashboard & Reports
                </Link>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-2xl p-4">
            {recordingState === 'idle' && (
              <button
                onClick={startCountdown}
                disabled={!question}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg transition"
              >
                🔴 Start Recording Answer
              </button>
            )}

            {recordingState === 'recording' && (
              <button
                onClick={stopRecording}
                className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg transition"
              >
                ⏹ Stop & Submit Answer
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
