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

interface ChatMessage {
  id: string;
  sender: 'hr' | 'user' | 'system';
  name: string;
  text: string;
  timestamp: string;
}

type HRGender = 'female' | 'male';
type HREmotion = 'idle' | 'speaking' | 'listening' | 'impressed' | 'thoughtful' | 'encouraging';

interface HRProfile {
  id: HRGender;
  name: string;
  title: string;
  image: string;
}

const HR_PROFILES: Record<HRGender, HRProfile> = {
  female: {
    id: 'female',
    name: 'Dr. Evelyn Vance',
    title: 'Senior HR Director & Executive Coach',
    image: '/images/ai-avatar.png',
  },
  male: {
    id: 'male',
    name: 'Mr. Marcus Sterling',
    title: 'Lead Executive HR Director',
    image: '/images/ai-avatar-male.png',
  },
};

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

export default function RecordPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/interview/live');
  }, [router]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioAnimFrameRef = useRef<number>(0);
  const recognitionRef = useRef<any>(null);

  const questionRef = useRef<Question | null>(null);

  type CallState = 'lobby' | 'in_call' | 'evaluating' | 'uploading' | 'processing' | 'done';
  const [callState, setCallState] = useState<CallState>('lobby');

  const [hrGender, setHrGender] = useState<HRGender>('female');
  const [category, setCategory] = useState<'behavioral' | 'hr' | 'technical'>('behavioral');
  const [question, setQuestion] = useState<Question | null>(null);
  const [loadingQuestion, setLoadingQuestion] = useState(false);

  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [showChat, setShowChat] = useState(false);

  const [callSeconds, setCallSeconds] = useState(0);
  const [currentTurn, setCurrentTurn] = useState<number>(1);
  const [totalTurns] = useState<number>(3);
  const [hrEmotion, setHrEmotion] = useState<HREmotion>('idle');
  const [latestGroqResponse, setLatestGroqResponse] = useState<{
    hr_verbal_reaction: string;
    hr_expression: HREmotion;
    score: number;
    followup_question: string;
  } | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInputText, setChatInputText] = useState('');
  const [micLevel, setMicLevel] = useState(0);

  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [error, setError] = useState('');
  const [cameraStatus, setCameraStatus] = useState<'loading' | 'live' | 'fallback' | 'denied'>('loading');

  const [avatarSpeaking, setAvatarSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');

  const currentProfile = HR_PROFILES[hrGender];

  useEffect(() => {
    if (callState !== 'in_call') return;
    const t = setInterval(() => setCallSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [callState]);

  const ttsUtterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  const ttsKeepAliveRef = useRef<NodeJS.Timeout | null>(null);

  const stopTTSKeepAlive = useCallback(() => {
    if (ttsKeepAliveRef.current) {
      clearInterval(ttsKeepAliveRef.current);
      ttsKeepAliveRef.current = null;
    }
  }, []);

  const speakAIText = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    stopTTSKeepAlive();
    try { window.speechSynthesis.cancel(); } catch {}
    ttsUtterancesRef.current = [];

    const cleanText = text.replace(/[*#_`]/g, '').replace(/\s+/g, ' ').trim();
    if (!cleanText) {
      setAvatarSpeaking(false);
      if (onEnd) onEnd();
      return;
    }

    const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
    const voices = window.speechSynthesis.getVoices();

    let targetVoice: SpeechSynthesisVoice | undefined;
    if (hrGender === 'male') {
      targetVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Male') || v.name.includes('David') || v.name.includes('Google US English') || v.name.includes('Guy')));
    } else {
      targetVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Samantha') || v.name.includes('Jenny')));
    }

    setAvatarSpeaking(true);

    ttsKeepAliveRef.current = setInterval(() => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }
    }, 6000);

    let sentenceIndex = 0;

    const speakNextSentence = () => {
      if (sentenceIndex >= sentences.length) {
        stopTTSKeepAlive();
        setAvatarSpeaking(false);
        setHrEmotion('listening');
        ttsUtterancesRef.current = [];
        if (onEnd) onEnd();
        return;
      }

      const sentenceText = sentences[sentenceIndex].trim();
      sentenceIndex++;

      const utterance = new SpeechSynthesisUtterance(sentenceText);
      utterance.rate = 0.95;
      utterance.pitch = hrGender === 'male' ? 0.92 : 1.05;

      if (targetVoice) utterance.voice = targetVoice;

      ttsUtterancesRef.current = [utterance];

      utterance.onend = () => {
        speakNextSentence();
      };

      utterance.onerror = () => {
        speakNextSentence();
      };

      window.speechSynthesis.speak(utterance);
    };

    speakNextSentence();
  }, [hrGender, stopTTSKeepAlive]);

  const startSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      if (recognitionRef.current) recognitionRef.current.stop();

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }
        setLiveTranscript(currentText);
      };

      recognition.onerror = () => {};
      recognition.start();
      recognitionRef.current = recognition;
    } catch {

    }
  }, []);

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
  }, []);

  const fetchQuestion = useCallback(async (cat: string) => {
    setLoadingQuestion(true);
    setError('');
    try {
      const q = await apiFetch<Question>(`/questions/random/?category=${cat}`);
      setQuestion(q);
      questionRef.current = q;
    } catch {
      setError('Could not fetch question.');
    } finally {
      setLoadingQuestion(false);
    }
  }, []);

  useEffect(() => {
    fetchQuestion(category);
  }, [category, fetchQuestion]);

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
    } catch {}
  }, []);

  const stopMicAnalyser = useCallback(() => {
    if (audioAnimFrameRef.current) cancelAnimationFrame(audioAnimFrameRef.current);
    setMicLevel(0);
  }, []);

  const setupCamera = useCallback(async () => {
    setCameraStatus('loading');
    setError('');
    stopMicAnalyser();

    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((t) => t.stop());
      activeStreamRef.current = null;
    }

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e) {}

    if (!stream) {
      try { stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); } catch (e) {}
    }

    if (stream) {
      activeStreamRef.current = stream;
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) startMicAnalyser(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraStatus('live');
      return;
    }

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
          ctx.fillStyle = '#818cf8'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('📷 Google Meet Live Camera', 320, 180);
        }
        requestAnimationFrame(animate);
      };
      animate();
      const canvasStream = canvas.captureStream(24);
      activeStreamRef.current = canvasStream;
      if (videoRef.current) { videoRef.current.srcObject = canvasStream; videoRef.current.play().catch(() => {}); }
    } catch { setCameraStatus('denied'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startMicAnalyser]);

  useEffect(() => {
    setupCamera();
    return () => {
      stopMicAnalyser();
      stopSpeechRecognition();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((t) => t.stop());
        activeStreamRef.current = null;
      }
    };
  }, [setupCamera, stopMicAnalyser, stopSpeechRecognition]);

  useEffect(() => {
    if (!currentSession || callState !== 'processing') return;

    const poll = setInterval(async () => {
      try {
        const res = await apiFetch<{ id: string; status: Session['status'] }>(
          `/sessions/${currentSession.id}/status/`
        );
        if (res.status === 'done') {
          setCallState('done');
          speakAIText("Interview call complete! Opening your performance report now.");
          clearInterval(poll);
        } else if (res.status === 'failed') {
          setError('Analysis failed. Please try again.');
          setCallState('in_call');
          clearInterval(poll);
        }
      } catch {}
    }, 2500);

    return () => clearInterval(poll);
  }, [currentSession, callState, speakAIText]);

  const handleStartInterviewFromLobby = () => {
    setCallState('in_call');
    setLiveTranscript('');
    setCallSeconds(0);

    const stream = activeStreamRef.current;
    if (stream) {
      const mimeType = getSupportedMimeType();
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        recordedChunksRef.current = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
        };
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start(500);
      } catch {}
    }

    startSpeechRecognition();

    const greeting = `Hello! I am ${currentProfile.name}, your HR interviewer today. Welcome to our live video call. Let's begin with your first question: ${question?.text || "Tell me about yourself and your core background."}`;
    setHrEmotion('speaking');
    speakAIText(greeting);

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages([
      {
        id: '1',
        sender: 'hr',
        name: currentProfile.name,
        text: `[Interview Started]: "${question?.text}"`,
        timestamp: now,
      },
    ]);
  };

  const handleCandidateFinishedTurn = async () => {
    setCallState('evaluating');
    stopSpeechRecognition();

    try {
      const groqRes = await apiFetch<{
        hr_verbal_reaction: string;
        hr_expression: HREmotion;
        score: number;
        followup_question: string;
      }>('/sessions/hr-react/', {
        method: 'POST',
        body: JSON.stringify({
          candidate_answer: liveTranscript || 'I presented a structured solution with key steps.',
          current_question: question?.text || '',
          hr_gender: hrGender,
        }),
      });

      setLatestGroqResponse(groqRes);
      setHrEmotion(groqRes.hr_expression || 'impressed');

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setChatMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'hr',
          name: currentProfile.name,
          text: `[Live HR Reaction]: "${groqRes.hr_verbal_reaction}"`,
          timestamp: now,
        },
      ]);

      if (currentTurn < totalTurns) {
        const nextTurnNum = currentTurn + 1;
        setCurrentTurn(nextTurnNum);

        const fullSpeech = `${groqRes.hr_verbal_reaction} Now for my follow-up question: ${groqRes.followup_question}`;
        setHrEmotion('speaking');
        speakAIText(fullSpeech, () => {
          setCallState('in_call');
          startSpeechRecognition();
        });
      } else {
        handleEndCallAndSubmit();
      }
    } catch {
      setCallState('in_call');
      startSpeechRecognition();
    }
  };

  const handleEndCallAndSubmit = async () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = async () => {
        const mimeType = getSupportedMimeType();
        const blob = new Blob(recordedChunksRef.current, { type: mimeType || 'video/webm' });
        await uploadFinalVideo(blob, mimeType);
      };
      recorder.stop();
    } else {
      const mimeType = getSupportedMimeType();
      const blob = new Blob(recordedChunksRef.current, { type: mimeType || 'video/webm' });
      await uploadFinalVideo(blob, mimeType);
    }
    setCallState('uploading');
  };

  const uploadFinalVideo = async (blob: Blob, mimeType: string) => {
    const currentQuestion = questionRef.current;
    if (!currentQuestion) return;

    try {
      const sessionPayload: Record<string, string> = {
        question: currentQuestion.text,
        question_category: category,
      };
      if (currentQuestion.id) sessionPayload.question_id = currentQuestion.id;

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

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const uploadRes = await fetch(`${API_BASE_URL}/sessions/${session.id}/upload/`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Upload failed');
      setCallState('processing');
    } catch (err: unknown) {
      setError('Error uploading interview call.');
      setCallState('in_call');
    }
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputText.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        sender: 'user',
        name: 'You (Candidate)',
        text: chatInputText,
        timestamp: now,
      },
    ]);
    setChatInputText('');
  };

  const formatCallTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (callState === 'lobby') {
    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between relative overflow-hidden">
        {}
        <div className="absolute top-[-150px] left-[-150px] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-150px] right-[-150px] w-[500px] h-[500px] bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />

        {}
        <header className="px-8 py-6 flex justify-between items-center z-10 border-b border-slate-800/80">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-emerald-500 flex items-center justify-center font-black text-white text-lg shadow-lg">
              IQ
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white font-sans">
              InterviewIQ Meeting Room
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="text-xs font-bold text-slate-300 hover:text-white px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 transition"
          >
            ← Exit to Dashboard
          </Link>
        </header>

        {}
        <main className="max-w-6xl w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">

          {}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <div className="relative aspect-video bg-slate-900 rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraOff ? 'hidden' : ''}`}
                style={{ transform: cameraStatus === 'live' ? 'scaleX(-1)' : 'none' }}
              />

              {cameraOff && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400">
                  <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-2xl font-black text-white mb-2">
                    YOU
                  </div>
                  <p className="text-xs font-bold">Camera is turned off</p>
                </div>
              )}

              {}
              <div className="absolute bottom-4 left-4 right-4 bg-slate-950/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 flex items-center gap-3">
                <span className="text-xs font-bold text-slate-300">🎤 Audio Check</span>
                <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-75 rounded-full"
                    style={{ width: micMuted ? '0%' : `${micLevel}%` }}
                  />
                </div>
              </div>
            </div>

            {}
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setMicMuted(!micMuted)}
                className={`px-5 py-3 rounded-2xl font-bold text-xs transition border flex items-center gap-2 ${
                  micMuted ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                }`}
              >
                {micMuted ? '🎙️ Mic Muted' : '🎙️ Mic Active'}
              </button>
              <button
                onClick={() => setCameraOff(!cameraOff)}
                className={`px-5 py-3 rounded-2xl font-bold text-xs transition border flex items-center gap-2 ${
                  cameraOff ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cameraOff ? '📹 Camera Off' : '📹 Camera Active'}
              </button>
            </div>
          </div>

          {}
          <div className="lg:col-span-5 flex flex-col space-y-6">

            {}
            <div className="bg-slate-900/90 border-2 border-slate-800 rounded-3xl p-6 shadow-2xl relative">
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-black w-fit mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>HR INTERVIEWER AVAILABLE & WAITING</span>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-indigo-400 shadow-lg flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={currentProfile.image} alt={currentProfile.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">{currentProfile.name}</h3>
                  <p className="text-xs font-semibold text-slate-400">{currentProfile.title}</p>
                </div>
              </div>

              {}
              <div className="bg-slate-950 p-1.5 rounded-2xl border border-slate-800 flex gap-2 mb-4">
                <button
                  onClick={() => setHrGender('female')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                    hrGender === 'female' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  👩 Madam (Dr. Evelyn)
                </button>
                <button
                  onClick={() => setHrGender('male')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                    hrGender === 'male' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  👨 Sir (Mr. Marcus)
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                &quot;Ready for your face-to-face interview session? Click below to enter the meeting room.&quot;
              </p>
            </div>

            {}
            <button
              onClick={handleStartInterviewFromLobby}
              disabled={loadingQuestion}
              className="w-full py-5 bg-gradient-to-r from-emerald-500 via-indigo-600 to-violet-600 hover:from-emerald-400 hover:to-violet-500 text-white font-black text-lg rounded-3xl shadow-2xl shadow-emerald-500/20 transition hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <span>🚀</span> Start Face-to-Face Interview Call
            </button>
          </div>
        </main>

        <footer className="py-4 text-center text-xs text-slate-500">
          InterviewIQ Multimodal AI Engine • Real-Time AI HR Evaluation
        </footer>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-950 text-white font-sans flex flex-col justify-between overflow-hidden select-none">

      {}
      <header className="h-14 px-6 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex justify-between items-center z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center font-black text-white text-sm shadow-md">
              IQ
            </div>
            <span className="font-extrabold text-sm tracking-tight text-slate-100 hidden sm:inline">
              InterviewIQ Corporate Meeting Room
            </span>
          </div>

          <div className="h-4 w-[1px] bg-slate-700 hidden sm:block" />

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Call • {formatCallTime(callSeconds)}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Question {currentTurn} of {totalTurns}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowChat(!showChat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              showChat ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            💬 Chat ({chatMessages.length})
          </button>
        </div>
      </header>

      {}
      <div className="flex-1 flex overflow-hidden relative">

        {}
        <div className={`flex-1 p-4 grid gap-4 transition-all duration-300 ${
          showChat ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-8' : 'grid-cols-1 md:grid-cols-2'
        }`}>

          {}
          <div className={`relative rounded-3xl overflow-hidden bg-slate-900 border-2 transition-all duration-500 flex flex-col justify-between p-6 ${
            showChat ? 'lg:col-span-4' : ''
          } ${
            hrEmotion === 'impressed' ? 'border-emerald-500/80 shadow-[0_0_40px_rgba(16,185,129,0.3)]' : 'border-slate-800 shadow-2xl'
          }`}>
            <div className="flex justify-between items-center z-10">
              <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{currentProfile.name} (Host)</span>
              </div>
            </div>

            {}
            <div className="flex flex-col items-center justify-center my-auto">
              <div className="relative">
                <div className={`absolute -inset-3 rounded-full transition-all duration-500 blur-xl ${
                  hrEmotion === 'impressed' ? 'bg-emerald-500/40 animate-pulse' : avatarSpeaking ? 'bg-indigo-500/40 animate-pulse' : 'bg-transparent'
                }`} />

                <div className={`relative w-44 h-44 sm:w-52 sm:h-52 rounded-full overflow-hidden border-4 transition-all duration-500 ${
                  hrEmotion === 'impressed' ? 'border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.6)] scale-105' : avatarSpeaking ? 'border-indigo-400 shadow-[0_0_40px_rgba(99,102,241,0.5)]' : 'border-slate-700'
                }`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={currentProfile.image} alt={currentProfile.name} className="w-full h-full object-cover" />
                </div>

                <div className="absolute bottom-1 right-1 bg-slate-950 border border-slate-700 px-3 py-1 rounded-full text-xs font-black text-white shadow-md">
                  {hrEmotion === 'impressed' ? '🌟 Impressed HR' : avatarSpeaking ? '🗣 Speaking' : '👂 Listening'}
                </div>
              </div>

              {}
              <div className="flex items-center gap-1 mt-4 h-6">
                {[30, 70, 50, 90, 40, 80, 60, 30].map((h, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-300 ${avatarSpeaking ? 'bg-indigo-400 animate-pulse' : 'bg-slate-700'}`}
                    style={{ height: avatarSpeaking ? `${h}%` : '20%' }}
                  />
                ))}
              </div>

              <div className="text-center mt-2">
                <p className="text-sm font-extrabold text-slate-100">{currentProfile.name}</p>
                <p className="text-xs font-semibold text-slate-400">{currentProfile.title}</p>
              </div>
            </div>

            {}
            {showCaptions && (
              <div className="z-10 bg-slate-950/80 backdrop-blur-md p-3 rounded-2xl border border-slate-800 text-xs font-medium text-slate-200">
                <span className="text-indigo-400 font-bold block text-[10px] uppercase mb-0.5">Live Closed Captions</span>
                <p className="italic">{liveTranscript ? `"${liveTranscript}"` : avatarSpeaking ? '"Speaking interview prompt..."' : 'Listening for candidate answer...'}</p>
              </div>
            )}
          </div>

          {}
          <div className={`relative rounded-3xl overflow-hidden bg-slate-900 border-2 border-slate-800 transition-all duration-500 ${
            showChat ? 'lg:col-span-4' : ''
          }`}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraOff ? 'hidden' : ''}`}
              style={{ transform: cameraStatus === 'live' ? 'scaleX(-1)' : 'none' }}
            />

            {cameraOff && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400">
                <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center text-3xl font-black text-white mb-3">
                  YOU
                </div>
                <p className="text-xs font-bold">Camera is turned off</p>
              </div>
            )}

            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
              <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${micMuted ? 'bg-rose-500' : 'bg-emerald-400'}`} />
                <span>You (Candidate) {micMuted ? '(Muted)' : ''}</span>
              </div>
            </div>

            <div className="absolute bottom-4 left-4 right-4 bg-slate-950/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 flex items-center gap-3 z-10">
              <span className="text-xs font-bold text-slate-300">🎤 Voice Level</span>
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-75 rounded-full"
                  style={{ width: micMuted ? '0%' : `${micLevel}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {}
        {showChat && (
          <aside className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col justify-between z-20">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-extrabold text-sm text-white">In-call messages</h3>
              <button onClick={() => setShowChat(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {chatMessages.map(msg => (
                <div key={msg.id} className={`p-3 rounded-2xl text-xs ${
                  msg.sender === 'hr' ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-indigo-600 text-white ml-4'
                }`}>
                  <div className="flex justify-between items-center mb-1 text-[10px] font-bold opacity-75">
                    <span>{msg.name}</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <p className="leading-relaxed font-medium">{msg.text}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChatMessage} className="p-4 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={chatInputText}
                onChange={e => setChatInputText(e.target.value)}
                placeholder="Send a message to HR..."
                className="flex-1 px-3 py-2 bg-slate-800 rounded-xl text-xs text-white border border-slate-700 focus:outline-none focus:border-indigo-500"
              />
              <button type="submit" className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl">
                Send
              </button>
            </form>
          </aside>
        )}
      </div>

      {}
      <footer className="h-20 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 px-6 flex items-center justify-between z-20">
        <div className="hidden lg:flex items-center gap-3 max-w-md">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
          <div>
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-indigo-400 block">Active Topic</span>
            <p className="text-xs font-bold text-slate-200 truncate">&quot;{question?.text}&quot;</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mx-auto lg:mx-0">
          <button
            onClick={() => setMicMuted(!micMuted)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition shadow-lg ${
              micMuted ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white border border-slate-700'
            }`}
          >
            {micMuted ? '🎙️✕' : '🎙️'}
          </button>

          <button
            onClick={() => setCameraOff(!cameraOff)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition shadow-lg ${
              cameraOff ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white border border-slate-700'
            }`}
          >
            {cameraOff ? '📹✕' : '📹'}
          </button>

          <button
            onClick={handleCandidateFinishedTurn}
            disabled={callState === 'evaluating'}
            className="px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition shadow-xl flex items-center gap-2 disabled:opacity-50"
          >
            <span>💬</span> {callState === 'evaluating' ? 'AI HR Director Evaluating...' : 'Done Speaking / Respond to HR'}
          </button>

          <button
            onClick={handleEndCallAndSubmit}
            className="w-14 h-12 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center font-bold transition shadow-xl shadow-rose-600/30"
          >
            📞✕
          </button>
        </div>

        <div className="hidden md:flex items-center gap-3 text-xs font-bold text-slate-400">
          <span>Enterprise AI HR Engine</span>
        </div>
      </footer>

      {(callState === 'uploading' || callState === 'processing') && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center z-50 text-center p-8">
          <div className="w-20 h-20 relative mb-6">
            <div className="w-full h-full rounded-full border-4 border-t-indigo-400 border-r-emerald-400 border-b-transparent border-l-transparent animate-spin" />
          </div>
          <h3 className="text-3xl font-black text-white mb-2">Compiling Report...</h3>
        </div>
      )}

      {callState === 'done' && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center z-50 text-center p-8">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-5 text-4xl border border-emerald-500/40 shadow-2xl">
            ✓
          </div>
          <h3 className="text-3xl font-black text-white mb-2">Interview Call Complete!</h3>
          {currentSession && (
            <Link
              href={`/report/${currentSession.id}`}
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-emerald-600 text-white font-bold rounded-2xl shadow-xl hover:scale-105 transition"
            >
              View Full Interview Report →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
