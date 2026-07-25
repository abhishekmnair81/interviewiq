'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  video_url?: string | null;
}

function getSupportedMimeType(): string {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

function diagnoseCameraError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError') return 'Camera/microphone permission was denied. Click the camera icon in your browser address bar to allow access, then try again.';
    if (err.name === 'NotFoundError') return 'No camera detected on this device. Please connect a webcam and try again.';
    if (err.name === 'NotReadableError') return 'Camera is already in use by another application. Close other apps (Zoom, Teams, etc.) and try again.';
    if (err.name === 'OverconstrainedError') return 'Camera does not support the requested resolution. Will retry with lower settings.';
  }
  return 'Could not access camera. Please check browser permissions and try again.';
}

const RECORDING_TIPS = [
  '💡 Speak clearly and at a steady pace (120–150 WPM ideal)',
  '👁 Keep your eyes on the camera lens, not the screen',
  '📐 Use the STAR method: Situation → Task → Action → Result',
  '🚫 Avoid filler words: um, uh, basically, like',
  '🕐 Aim for 90–120 seconds for a complete answer',
];

export default function RecordPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioAnimFrameRef = useRef<number>(0);

  const questionRef = useRef<Question | null>(null);
  const categoryRef = useRef<'behavioral' | 'hr' | 'technical'>('behavioral');

  const [category, setCategory] = useState<'behavioral' | 'hr' | 'technical'>('behavioral');
  const [question, setQuestion] = useState<Question | null>(null);
  const [loadingQuestion, setLoadingQuestion] = useState(false);

  useEffect(() => { questionRef.current = question; }, [question]);
  useEffect(() => { categoryRef.current = category; }, [category]);

  type RecordingState = 'idle' | 'countdown' | 'recording' | 'uploading' | 'processing' | 'done';
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [countdown, setCountdown] = useState(3);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [hasAudio, setHasAudio] = useState(false);

  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [error, setError] = useState('');
  const [cameraStatus, setCameraStatus] = useState<'loading' | 'live' | 'fallback' | 'denied'>('loading');

  // ── Question Fetching ──────────────────────────────────────────────────
  const fetchQuestion = useCallback(async (cat: string) => {
    setLoadingQuestion(true);
    setError('');
    try {
      const q = await apiFetch<Question>(`/questions/random/?category=${cat}`);
      setQuestion(q);
    } catch {
      setError('Could not fetch question. Check your connection and try again.');
    } finally {
      setLoadingQuestion(false);
    }
  }, []);

  useEffect(() => {
    fetchQuestion(category);
  }, [category, fetchQuestion]);

  // ── Mic Level Analyser ────────────────────────────────────────────────
  const startMicAnalyser = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      audioAnalyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setMicLevel(Math.min(100, avg * 2.5));
        audioAnimFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch { /* mic analyser optional */ }
  }, []);

  const stopMicAnalyser = useCallback(() => {
    if (audioAnimFrameRef.current) cancelAnimationFrame(audioAnimFrameRef.current);
    setMicLevel(0);
  }, []);

  // ── Robust Multi-Tier Camera Setup Engine ──────────────────────────────
  const setupCamera = useCallback(async () => {
    setCameraStatus('loading');
    setError('');
    setHasAudio(false);
    stopMicAnalyser();

    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((t) => t.stop());
      activeStreamRef.current = null;
    }

    let stream: MediaStream | null = null;
    let lastErr: unknown = null;

    // Tier 1: HD + Audio
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e) { lastErr = e; }

    // Tier 2: Basic + Audio
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (e) { lastErr = e; }
    }

    // Tier 3: Video only
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (e) { lastErr = e; }
    }

    if (stream) {
      activeStreamRef.current = stream;
      const audioTracks = stream.getAudioTracks();
      setHasAudio(audioTracks.length > 0);
      if (audioTracks.length > 0) startMicAnalyser(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraStatus('live');
      return;
    }

    // Show specific error before falling to simulation
    if (lastErr) setError(diagnoseCameraError(lastErr));

    // Tier 4: Canvas Simulation
    setCameraStatus('fallback');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640; canvas.height = 360;
      const ctx = canvas.getContext('2d');
      let frame = 0;
      const animate = () => {
        frame++;
        if (ctx) {
          ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 640, 360);
          const grad = ctx.createRadialGradient(320, 180, 10, 320, 180, 80 + Math.sin(frame * 0.04) * 20);
          grad.addColorStop(0, 'rgba(99,102,241,0.35)'); grad.addColorStop(1, 'rgba(99,102,241,0)');
          ctx.fillStyle = grad; ctx.beginPath();
          ctx.arc(320, 180, 80 + Math.sin(frame * 0.04) * 20, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#818cf8'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('📷 Simulation Mode — Camera Unavailable', 320, 170);
          ctx.fillStyle = '#94a3b8'; ctx.font = '12px sans-serif';
          ctx.fillText('Click "Re-detect Camera" to grant access', 320, 198);
        }
        requestAnimationFrame(animate);
      };
      animate();
      const canvasStream = canvas.captureStream(24);
      activeStreamRef.current = canvasStream;
      if (videoRef.current) { videoRef.current.srcObject = canvasStream; videoRef.current.play().catch(() => {}); }
    } catch { setCameraStatus('denied'); }
  }, [startMicAnalyser, stopMicAnalyser]);

  useEffect(() => {
    setupCamera();
    return () => {
      stopMicAnalyser();
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((t) => t.stop());
        activeStreamRef.current = null;
      }
    };
  }, [setupCamera, stopMicAnalyser]);

  // Rotate tips every 6 seconds during recording
  useEffect(() => {
    if (recordingState !== 'recording') return;
    const t = setInterval(() => setTipIndex(i => (i + 1) % RECORDING_TIPS.length), 6000);
    return () => clearInterval(t);
  }, [recordingState]);

  // ── Timer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (recordingState === 'recording') {
      timer = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [recordingState]);

  // ── Status Polling ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentSession || recordingState !== 'processing') return;

    const poll = setInterval(async () => {
      try {
        const res = await apiFetch<{ id: string; status: Session['status'] }>(
          `/sessions/${currentSession.id}/status/`
        );
        if (res.status === 'done') {
          setRecordingState('done');
          clearInterval(poll);
        } else if (res.status === 'failed') {
          setError('Analysis failed. Please try recording again.');
          setRecordingState('idle');
          clearInterval(poll);
        }
      } catch {
        // Poll errors ok
      }
    }, 2500);

    return () => clearInterval(poll);
  }, [currentSession, recordingState]);

  // ── Countdown → Record ─────────────────────────────────────────────────
  const startCountdown = useCallback(() => {
    if (!question || recordingState !== 'idle') return;
    setError('');
    setRecordingState('countdown');

    let count = 3;
    setCountdown(count);

    const interval = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        startRecording();
      }
    }, 1000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, recordingState]);

  const startRecording = useCallback(() => {
    const stream = activeStreamRef.current;
    if (!stream) {
      setError('No media stream available. Please refresh and allow camera/microphone access.');
      setRecordingState('idle');
      return;
    }

    const mimeType = getSupportedMimeType();
    let mediaRecorder: MediaRecorder;
    try {
      mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
    } catch {
      setError('Your browser does not support video recording. Please use Chrome or Firefox.');
      setRecordingState('idle');
      return;
    }

    recordedChunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunksRef.current, {
        type: mimeType || 'video/webm',
      });
      await uploadVideo(blob, mimeType);
    };

    mediaRecorder.onerror = () => {
      setError('Recording error occurred. Please try again.');
      setRecordingState('idle');
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(500);
    setRecordingState('recording');
    setRecordingSeconds(0);
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    recorder.stop();
    setRecordingState('uploading');
  }, []);

  // ── Upload ─────────────────────────────────────────────────────────────
  const uploadVideo = async (blob: Blob, mimeType: string) => {
    if (blob.size === 0) {
      setError('Recording was empty. Please try again and ensure microphone is active.');
      setRecordingState('idle');
      return;
    }

    const currentQuestion = questionRef.current;

    if (!currentQuestion) {
      setError('No question loaded. Please wait for question to load.');
      setRecordingState('idle');
      return;
    }

    try {
      const sessionPayload: Record<string, string> = {
        question: currentQuestion.text,
        question_category: categoryRef.current,
      };
      if (currentQuestion.id) {
        sessionPayload.question_id = currentQuestion.id;
      }

      const session = await apiFetch<Session>('/sessions/create/', {
        method: 'POST',
        body: JSON.stringify(sessionPayload),
      });

      setCurrentSession(session);

      const token = localStorage.getItem('access_token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';

      const formData = new FormData();
      formData.append('video', blob, `session_${session.id}.${ext}`);

      const uploadRes = await fetch(`${API_BASE_URL}/sessions/${session.id}/upload/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        const msg = errData.error || errData.detail || `Upload failed (HTTP ${uploadRes.status})`;
        throw new Error(msg);
      }

      setRecordingState('processing');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error uploading video. Please try again.';
      setError(msg);
      setRecordingState('idle');
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isRecordingActive = recordingState !== 'idle' && recordingState !== 'done';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col relative overflow-hidden">
      {/* Soft Ambient Glows */}
      <div className="ambient-blur w-[500px] h-[500px] bg-indigo-200/50 top-[-150px] right-[-100px]" />
      <div className="ambient-blur w-[400px] h-[400px] bg-violet-200/40 bottom-[-100px] left-[-100px]" />

      {/* Header Navigation */}
      <header className="sticky top-0 z-30 glass-nav px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <span className="text-xl font-black text-white">IQ</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 font-sans">
              AI Recording Studio
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="text-xs font-bold text-slate-600 hover:text-slate-900 transition px-4 py-2.5 rounded-2xl glass-card border border-slate-200 shadow-sm"
          >
            ← Exit Studio
          </Link>
        </div>
      </header>

      {/* Main Studio Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
        
        {/* Left Column: Category & Question Prompt (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Category Switcher Pill Box */}
          <div className="glass-card p-6 rounded-3xl border border-slate-200/80">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-3 flex items-center gap-2">
              <span>🎯</span> Select Interview Domain
            </h2>
            <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
              {(['behavioral', 'hr', 'technical'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  disabled={isRecordingActive}
                  className={`py-2 px-3 text-xs font-extrabold rounded-xl transition capitalize ${
                    category === cat
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  } disabled:opacity-50`}
                >
                  {cat === 'hr' ? 'HR' : cat}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchQuestion(category)}
              disabled={isRecordingActive || loadingQuestion}
              className="mt-4 w-full py-3 px-4 glass-card hover:bg-indigo-50 text-indigo-700 text-xs font-bold rounded-2xl border border-indigo-200 transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <span>🎲</span> {loadingQuestion ? 'Selecting Next Question...' : 'Get Next Random Question'}
            </button>
          </div>

          {/* Question Prompt Card */}
          <div className="glass-card p-6 rounded-3xl border border-slate-200/80">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Active Question Prompt
              </span>
              {question && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 capitalize">
                    {question.category}
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                    {question.difficulty}
                  </span>
                </div>
              )}
            </div>

            {loadingQuestion ? (
              <div className="space-y-3 py-2">
                <div className="h-4 bg-slate-200 rounded-lg animate-pulse w-full" />
                <div className="h-4 bg-slate-200 rounded-lg animate-pulse w-5/6" />
                <div className="h-4 bg-slate-200 rounded-lg animate-pulse w-4/6" />
              </div>
            ) : (
              <p className="text-lg font-bold text-slate-900 leading-relaxed">
                &quot;{question?.text ?? 'Loading question prompt...'}&quot;
              </p>
            )}
          </div>

          {/* What to Say — Answer Guide */}
          {question && (
            <div className="glass-card p-5 rounded-3xl border border-violet-200/80 bg-violet-50/60">
              <h2 className="text-xs font-bold uppercase tracking-wider text-violet-700 mb-4 flex items-center gap-2">
                <span>🗣️</span> What to Say — Answer Guide
              </h2>

              {/* STAR Framework Steps */}
              <div className="space-y-2.5 mb-4">
                {[
                  {
                    label: 'S — Situation',
                    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
                    dot: 'bg-indigo-500',
                    hint: category === 'technical'
                      ? 'Describe the technical challenge or project context you were working on.'
                      : 'Set the scene — briefly describe the workplace situation or context.',
                  },
                  {
                    label: 'T — Task',
                    color: 'bg-sky-100 text-sky-800 border-sky-200',
                    dot: 'bg-sky-500',
                    hint: category === 'technical'
                      ? 'What was your specific role or the problem you needed to solve?'
                      : 'What was your specific responsibility or goal in that situation?',
                  },
                  {
                    label: 'A — Action',
                    color: 'bg-violet-100 text-violet-800 border-violet-200',
                    dot: 'bg-violet-500',
                    hint: category === 'technical'
                      ? 'Walk through the steps, tools, or technologies you used to solve it.'
                      : 'Describe exactly what YOU did — be specific, use "I" not "we".',
                  },
                  {
                    label: 'R — Result',
                    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                    dot: 'bg-emerald-500',
                    hint: 'Share the outcome with measurable impact (%, time saved, team size).',
                  },
                ].map((step) => (
                  <div key={step.label} className={`flex gap-3 p-3 rounded-2xl border ${step.color}`}>
                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${step.dot}`} />
                    <div>
                      <div className="text-[11px] font-extrabold tracking-wider mb-0.5">{step.label}</div>
                      <div className="text-[11px] font-medium leading-relaxed opacity-80">{step.hint}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Dos & Don'ts */}
              <div className="bg-white/70 border border-violet-100 rounded-2xl p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Quick Reminders</div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-semibold">
                  <span className="text-emerald-700">✓ Be specific & concise</span>
                  <span className="text-rose-700">✗ Don't start with "I think..."</span>
                  <span className="text-emerald-700">✓ Use numbers & metrics</span>
                  <span className="text-rose-700">✗ Avoid filler words</span>
                  <span className="text-emerald-700">✓ Face the camera</span>
                  <span className="text-rose-700">✗ Don't ramble beyond 2min</span>
                </div>
              </div>
            </div>
          )}

          {/* Camera Status & Mic Level Panel */}
          <div className="glass-card p-4 rounded-3xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600">📷 Camera</span>
              <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${
                cameraStatus === 'live' ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                : cameraStatus === 'loading' ? 'bg-slate-100 text-slate-600 border-slate-300'
                : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                {cameraStatus === 'live' ? '● LIVE' : cameraStatus === 'loading' ? '⏳ Connecting...' : '📷 Simulation'}
              </span>
            </div>

            {/* Microphone Level Bar */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                <span>🎤 Mic Level</span>
                <span className={hasAudio ? 'text-emerald-600' : 'text-slate-400'}>{hasAudio ? 'Active' : 'No Mic'}</span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-75"
                  style={{
                    width: `${micLevel}%`,
                    background: micLevel > 70 ? '#ef4444' : micLevel > 40 ? '#22c55e' : '#6366f1',
                  }}
                />
              </div>
            </div>

            <button
              onClick={setupCamera}
              disabled={isRecordingActive}
              className="w-full py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-extrabold rounded-2xl border border-indigo-200 transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              📹 Re-detect Camera & Mic
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold shadow-sm">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Right Column: AI Video Monitor Studio (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          <div className="relative aspect-video bg-slate-900 rounded-3xl overflow-hidden border border-slate-300 shadow-2xl shadow-slate-300/50">
            {/* Live Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: cameraStatus === 'live' ? 'scaleX(-1)' : 'none' }}
            />

            {/* Top Live Studio Monitor Overlay */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/20 text-xs font-bold text-white shadow-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{cameraStatus === 'live' ? 'LIVE CAMERA 1080P' : 'STUDIO MONITOR'}</span>
              </div>

              {recordingState === 'recording' && (
                <div className="flex items-center gap-2 bg-rose-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg shadow-rose-600/30 backdrop-blur-md animate-pulse">
                  <span className="w-2.5 h-2.5 bg-white rounded-full" />
                  <span>REC {formatTime(recordingSeconds)}</span>
                </div>
              )}
            </div>

            {/* Loading Spinner */}
            {cameraStatus === 'loading' && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-400" />
              </div>
            )}

            {/* Countdown Overlay */}
            {recordingState === 'countdown' && (
              <div className="absolute inset-0 bg-slate-900/85 backdrop-blur-md flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-indigo-500/20 border border-indigo-400/50 flex items-center justify-center animate-ping">
                  <span className="text-7xl font-black text-white" key={countdown}>
                    {countdown}
                  </span>
                </div>
              </div>
            )}

            {/* Uploading / Processing Overlay */}
            {(recordingState === 'uploading' || recordingState === 'processing') && (
              <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center text-white">
                <div className="w-20 h-20 relative mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500/30 animate-ping" />
                  <div className="w-full h-full rounded-full border-4 border-t-indigo-400 border-r-violet-400 border-b-transparent border-l-transparent animate-spin" />
                </div>
                <h3 className="text-2xl font-black tracking-tight mb-2">
                  {recordingState === 'uploading' ? 'Encrypting & Uploading Video...' : 'Multimodal AI Analysis Active'}
                </h3>
                <p className="text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
                  {recordingState === 'uploading'
                    ? 'Transferring video stream to backend analysis pipeline.'
                    : 'Running Whisper STT, facial gaze tracking, and STAR framework evaluation.'}
                </p>
                <div className="flex gap-4 px-5 py-2 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200">
                  <span className="text-indigo-400">🎤 Speech</span>
                  <span>·</span>
                  <span className="text-sky-400">👁 Facial Pose</span>
                  <span>·</span>
                  <span className="text-violet-400">🧠 STAR Answer</span>
                </div>
              </div>
            )}

            {/* Analysis Completed Overlay */}
            {recordingState === 'done' && (
              <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center text-white">
                <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-5 text-4xl border border-emerald-500/40 shadow-xl shadow-emerald-500/20">
                  ✓
                </div>
                <h3 className="text-3xl font-black tracking-tight mb-2">
                  Analysis Complete!
                </h3>
                <p className="text-sm text-slate-300 mb-8 max-w-sm">
                  Your AI performance coaching report is ready to view.
                </p>
                {currentSession && (
                  <Link
                    href={`/report/${currentSession.id}`}
                    className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/30 transition hover:scale-105"
                  >
                    View Detailed AI Report →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Coaching Tip Banner during recording */}
          {recordingState === 'recording' && (
            <div className="glass-card px-5 py-3 rounded-2xl border border-indigo-200 bg-indigo-50/80 shadow-sm flex items-center gap-3">
              <span className="text-xl flex-shrink-0">💡</span>
              <p className="text-xs font-semibold text-indigo-800 leading-relaxed transition-all duration-500">
                {RECORDING_TIPS[tipIndex]}
              </p>
            </div>
          )}

          {/* Recording progress bar */}
          {recordingState === 'recording' && (
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-rose-500 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, (recordingSeconds / 120) * 100)}%` }}
              />
            </div>
          )}

          {/* Action Control Bar */}
          <div className="glass-card p-4 rounded-3xl border border-slate-200/80 flex items-center justify-center shadow-sm">
            {recordingState === 'idle' && (
              <button
                onClick={startCountdown}
                disabled={!question || cameraStatus === 'loading'}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-black text-base rounded-2xl shadow-xl shadow-indigo-500/25 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                🔴 Begin Recording Answer
              </button>
            )}

            {recordingState === 'recording' && (
              <button
                onClick={stopRecording}
                className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white font-black text-base rounded-2xl shadow-xl shadow-rose-600/30 transition hover:scale-[1.01] active:scale-[0.99]"
              >
                ⏹ Stop &amp; Analyze Response ({formatTime(recordingSeconds)})
              </button>
            )}

            {(recordingState === 'uploading' || recordingState === 'processing') && (
              <div className="w-full py-4 bg-slate-200 text-slate-600 font-bold text-center rounded-2xl opacity-70">
                Processing Response Stream...
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
