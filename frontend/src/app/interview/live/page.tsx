'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useSpeechInterviewer } from '@/hooks/useSpeechInterviewer';
import { useFaceTracking } from '@/hooks/useFaceTracking';
import { useInterviewSocket, FaceReading } from '@/hooks/useInterviewSocket';
import { useStarAnalyzer } from '@/hooks/useStarAnalyzer';
import { Alex3DRealCharacter } from '@/components/Alex3DRealCharacter';

type AppState = 'SETUP' | 'CONNECTING' | 'ALEX_SPEAKING' | 'USER_TURN' | 'PROCESSING' | 'COMPLETE';
type AvatarState = 'idle' | 'speaking' | 'thinking' | 'listening';

export default function LiveInterviewPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [candidateName, setCandidateName] = useState('Candidate');
  const [jobRole, setJobRole] = useState('Software Engineer');
  const [category, setCategory] = useState('behavioral');
  const [difficulty, setDifficulty] = useState('medium');
  const [setupStep, setSetupStep] = useState(1);

  const [appState, setAppState] = useState<AppState>('SETUP');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [alexText, setAlexText] = useState<string>('');
  const [exchangeCount, setExchangeCount] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const [isReportReady, setIsReportReady] = useState(false);

  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [sttError, setSttError] = useState<string | null>(null);

  const [micLevel, setMicLevel] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const streamRef = useRef<MediaStream | null>(null);

  const micStreamRef = useRef<MediaStream | null>(null);

  const waitingForUserRef = useRef(false);

  const typedAnswerRef = useRef('');

  const { isSpeaking, isListening, speak, cancelSpeech, startListening, stopListening, checkSupport } = useSpeechInterviewer();
  const { eyeContactScore, stabilityScore, currentEmotion } = useFaceTracking(videoRef);
  const { isConnected, connect, sendTranscript, sendFaceReading, endSession, latestMessage } = useInterviewSocket();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (appState === 'SETUP' || appState === 'CONNECTING') return;
    const timer = setInterval(() => {
      setDurationSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [appState]);

  useEffect(() => {
    if (!mounted) return;
    let active = true;

    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false })
      .then((s) => {
        if (!active) { s.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
        setCameraActive(true);
      })
      .catch(() => { if (active) setCameraActive(false); });

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let animFrame: number | null = null;

    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((micS) => {
        if (!active) { micS.getTracks().forEach((t) => t.stop()); return; }
        micStreamRef.current = micS;
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(micS);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateMeter = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          setMicLevel(Math.min(100, Math.round((sum / dataArray.length / 128) * 100)));
          animFrame = requestAnimationFrame(updateMeter);
        };
        updateMeter();
      })
      .catch(() => {});

    return () => {
      active = false;
      if (animFrame) cancelAnimationFrame(animFrame);
      if (audioCtx) audioCtx.close();

      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [mounted]);

  const attachStream = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
      el.play().catch(() => {});
    }
  }, []);

  const activeAnswerText = interimTranscript || finalTranscript || typedAnswerRef.current || '';
  const starAnalysis = useStarAnalyzer(activeAnswerText);

  useEffect(() => {
    if (appState === 'SETUP' || appState === 'CONNECTING' || !isConnected) return;
    const timer = setInterval(() => {
      const reading: FaceReading = {
        eye_contact: eyeContactScore,
        stability: stabilityScore,
        emotion: currentEmotion || 'calm',
        timestamp: Date.now(),
      };
      sendFaceReading(reading);
    }, 2000);
    return () => clearInterval(timer);
  }, [appState, isConnected, eyeContactScore, stabilityScore, currentEmotion, sendFaceReading]);

  const submitAnswerRef = useRef<((textToSubmit?: string) => void) | null>(null);

  const handleUserSubmitAnswer = useCallback(
    (textToSubmit?: string) => {
      const answer = (textToSubmit || typedAnswerRef.current || finalTranscript || interimTranscript).trim();
      if (!answer || answer.length < 2) {
        setSttError('Please speak your answer clearly or type it in the text box below.');
        return;
      }

      if (!waitingForUserRef.current && appState === 'PROCESSING') return;
      waitingForUserRef.current = false;

      setSttError(null);
      stopListening();
      cancelSpeech();
      setAppState('PROCESSING');
      setExchangeCount((prev) => prev + 1);

      sendTranscript(answer);

      typedAnswerRef.current = '';
      setInterimTranscript('');
      setFinalTranscript('');
    },
    [finalTranscript, interimTranscript, stopListening, cancelSpeech, sendTranscript, appState]
  );

  useEffect(() => {
    submitAnswerRef.current = handleUserSubmitAnswer;
  }, [handleUserSubmitAnswer]);

  const handleAlexSpeechResponse = useCallback(
    (text: string, isComplete: boolean) => {
      setAlexText(text);
      waitingForUserRef.current = false;

      if (isComplete) {
        speak(text, () => {
          setAppState('COMPLETE');
        });
      } else {
        setAppState('ALEX_SPEAKING');
        speak(text, () => {

          setAppState('USER_TURN');
          setInterimTranscript('');
          setFinalTranscript('');
          waitingForUserRef.current = true;

          startListening(
            (liveText) => {
              setInterimTranscript(liveText);
            },
            (autoFinalText) => {
              const clean = autoFinalText.trim();
              if (clean.length >= 3) {
                if (submitAnswerRef.current) {
                  submitAnswerRef.current(clean);
                }
              } else {
                setSttError("I didn't catch that clearly. Please speak or type your answer!");
              }
            },
            3500
          );
        });
      }
    },
    [speak, startListening]
  );

  const handleStartInterview = async () => {
    if (!checkSupport()) return;

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }

    try {
      setAppState('CONNECTING');
      const res = await apiFetch<{ id: string }>('/sessions/', {
        method: 'POST',
        body: JSON.stringify({
          category,
          target_role: jobRole,
          difficulty_level: difficulty,
          candidate_name: candidateName,
          mode: 'live_ai',
        }),
      });

      setSessionId(res.id);
      setStartTime(Date.now());

      const token = localStorage.getItem('access_token');
      connect(res.id, token);
    } catch (err: any) {
      alert('Could not start interview session. Please check your network connection.');
      setAppState('SETUP');
    }
  };

  useEffect(() => {
    if (!latestMessage) return;
    if (latestMessage.type === 'alex_speaking' && latestMessage.text) {
      handleAlexSpeechResponse(latestMessage.text, !!latestMessage.is_complete);
    } else if (latestMessage.type === 'error' && latestMessage.message) {
      setSttError(latestMessage.message);
    }
  }, [latestMessage, handleAlexSpeechResponse]);

  useEffect(() => {
    if (appState !== 'COMPLETE' || !sessionId) return;
    const interval = setInterval(async () => {
      try {
        const data = await apiFetch<{ status: string }>(`/sessions/${sessionId}/status/`);
        if (data.status === 'done' || data.status === 'completed') {
          setIsReportReady(true);
          clearInterval(interval);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [appState, sessionId]);

  const handleReplayAlex = () => {
    if (!alexText || isSpeaking) return;
    speak(alexText);
  };

  const handleToggleSpeak = () => {
    setSttError(null);
    if (isListening) {
      stopListening();
    } else {
      waitingForUserRef.current = true;
      startListening(
        (liveText) => {
          setInterimTranscript(liveText);
          setFinalTranscript(liveText);
        },
        (autoText) => {
          const clean = autoText.trim();
          if (clean.length >= 3) {
            if (submitAnswerRef.current) {
              submitAnswerRef.current(clean);
            }
          } else {
            setSttError("Nothing detected — please speak clearly and try again.");
          }
        },
        3500
      );
    }
  };

  const avatarState: AvatarState =
    (appState === 'ALEX_SPEAKING' || isSpeaking)
      ? 'speaking'
      : appState === 'PROCESSING'
      ? 'thinking'
      : appState === 'USER_TURN'
      ? 'listening'
      : 'idle';

  if (!mounted) return null;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col relative overflow-hidden">
      {}
      <div className="ambient-blur w-[600px] h-[600px] bg-indigo-200/40 top-[-200px] left-1/2 -translate-x-1/2" />

      {}
      <header className="glass-nav px-6 py-4 border-b border-slate-200/80 flex items-center justify-between z-30">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/20">
            <span className="text-xl font-black text-white">IQ</span>
          </div>
          <div>
            <span className="text-base font-black tracking-tight text-slate-900 block leading-none">
              Interview<span className="text-indigo-600">IQ</span> Studio
            </span>
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-indigo-600">
              Alex • Conversational AI Persona
            </span>
          </div>
        </Link>

        {appState !== 'SETUP' && appState !== 'COMPLETE' && (
          <div className="flex items-center gap-4">
            <div className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-2xl shadow-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Duration: {formatDuration(durationSec)}</span>
            </div>
            <div className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-2xl">
              Exchange {exchangeCount} of ~8
            </div>
            <button
              onClick={() => {
                cancelSpeech();
                stopListening();
                endSession();
                setAppState('COMPLETE');
              }}
              className="text-xs font-bold px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition"
            >
              📞 End Call &amp; View Report
            </button>
          </div>
        )}
      </header>

      {}
      {appState === 'SETUP' && (
        <main className="flex-1 flex items-center justify-center p-6 relative z-10 max-w-3xl mx-auto w-full">
          <div className="glass-card p-8 rounded-3xl border border-slate-200/90 shadow-xl w-full space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
                  Step {setupStep} of 4 Setup
                </span>
                <h1 className="text-2xl font-black text-slate-900 mt-2">
                  {setupStep === 1 && 'Candidate Profile & Target Role'}
                  {setupStep === 2 && 'Interview Focus & Complexity'}
                  {setupStep === 3 && 'Webcam & Microphone Check'}
                  {setupStep === 4 && 'Interview Orientation with Alex'}
                </h1>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`w-3 h-3 rounded-full transition ${
                      step === setupStep
                        ? 'bg-indigo-600 scale-110'
                        : step < setupStep
                        ? 'bg-emerald-500'
                        : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {}
            {setupStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                    placeholder="Alex Mercer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                    Target Job Role
                  </label>
                  <select
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                  >
                    <option value="Software Engineer">Software Engineer</option>
                    <option value="Frontend Engineer">Frontend Engineer</option>
                    <option value="Backend Engineer">Backend Engineer</option>
                    <option value="Full Stack Developer">Full Stack Developer</option>
                    <option value="Data Engineer">Data Engineer</option>
                    <option value="Product Manager">Product Manager</option>
                  </select>
                </div>
              </div>
            )}

            {}
            {setupStep === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                    Interview Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                  >
                    <option value="behavioral">Behavioral (STAR Method)</option>
                    <option value="hr">Executive HR &amp; Culture</option>
                    <option value="technical">Technical Architecture</option>
                    <option value="mixed">Mixed Multimodal Practice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                    Difficulty Level
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                  >
                    <option value="easy">Junior / Entry Level</option>
                    <option value="medium">Mid-Level / Senior</option>
                    <option value="hard">Lead / Staff Specialist</option>
                  </select>
                </div>
              </div>
            )}

            {}
            {setupStep === 3 && (
              <div className="space-y-4">
                <div className="relative h-56 rounded-2xl bg-slate-900 border border-slate-200 overflow-hidden flex items-center justify-center">
                  <video
                    ref={attachStream}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                  {!cameraActive && (
                    <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center p-4 text-center">
                      <span className="text-3xl mb-2">📷</span>
                      <p className="text-xs font-bold text-slate-800">Webcam Inactive</p>
                      <p className="text-[11px] text-slate-500 max-w-xs">
                        Please grant camera permissions in your browser.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
                    <span>🎤 Microphone Input Level</span>
                    <span>{micLevel}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-100"
                      style={{ width: `${micLevel}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {}
            {setupStep === 4 && (
              <div className="bg-indigo-50/70 border border-indigo-200 p-5 rounded-2xl space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-bold shadow-md">
                    👋
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Meet Alex</h3>
                    <p className="text-xs text-slate-600">Senior AI Technical Interviewer</p>
                  </div>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Alex will start with friendly small talk to help you get comfortable. Simply speak naturally, answer questions one step at a time, and treat it like a real conversation with a senior colleague.
                </p>
              </div>
            )}

            {}
            <div className="flex justify-between items-center pt-4 border-t border-slate-200">
              {setupStep > 1 ? (
                <button
                  onClick={() => setSetupStep((s) => s - 1)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
                >
                  ← Back
                </button>
              ) : (
                <div />
              )}

              {setupStep < 4 ? (
                <button
                  onClick={() => setSetupStep((s) => s + 1)}
                  className="px-6 py-3 btn-primary text-xs font-bold rounded-2xl shadow-md"
                >
                  Continue →
                </button>
              ) : (
                <button
                  onClick={handleStartInterview}
                  className="px-8 py-3.5 btn-emerald text-xs font-black rounded-2xl shadow-md transform hover:scale-[1.02] transition"
                >
                  🚀 I&apos;m Ready — Start Interview
                </button>
              )}
            </div>
          </div>
        </main>
      )}

      {}
      {appState === 'CONNECTING' && (
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
          <div className="w-20 h-20 rounded-full border-4 border-t-indigo-600 border-r-emerald-500 border-b-transparent border-l-transparent animate-spin mb-6 shadow-xl" />
          <h2 className="text-2xl font-black text-slate-900">Connecting to Alex...</h2>
          <p className="text-xs text-slate-600 max-w-sm mt-2 font-medium">
            Setting up your personalized conversational session for the position of {jobRole}.
          </p>
        </main>
      )}

      {}
      {(appState === 'ALEX_SPEAKING' || appState === 'USER_TURN' || appState === 'PROCESSING') && (
        <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden min-h-0 relative z-10">

          {}
          <div
            className={`glass-card rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden shadow-xl transition-all duration-500 border ${
              avatarState === 'speaking'
                ? 'border-indigo-500 ring-4 ring-indigo-500/20 shadow-indigo-500/10'
                : 'border-slate-200/90'
            }`}
          >
            <div className="flex justify-between items-center z-10">
              <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-2 shadow-sm">
                <span className={`w-2.5 h-2.5 rounded-full ${avatarState === 'speaking' ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-500'}`} />
                <span>Alex (AI Interviewer)</span>
              </div>

              <div className="flex items-center gap-2">
                <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 uppercase tracking-wider ${
                  avatarState === 'speaking'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : avatarState === 'listening'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : avatarState === 'thinking'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <span>{avatarState === 'speaking' ? '🎙 Speaking' : avatarState === 'listening' ? '👂 Listening' : avatarState === 'thinking' ? '🧠 Thinking' : 'Ready'}</span>
                </div>
                <div className="bg-white border border-slate-200 px-3 py-1 rounded-full text-xs font-bold text-indigo-700 shadow-sm">
                  {jobRole}
                </div>
              </div>
            </div>

            <div className="relative flex-1 my-4 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 min-h-[260px] flex items-center justify-center">
              <Alex3DRealCharacter state={avatarState} alexText={alexText} candidateName={candidateName} jobRole={jobRole} />
            </div>

            <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm z-10">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 mb-2">
                <span className="text-indigo-600 font-extrabold text-[11px] uppercase tracking-wider">
                  Alex Response
                </span>
                <div className="flex items-center gap-2">
                  {alexText && (
                    <button
                      onClick={handleReplayAlex}
                      disabled={isSpeaking || appState === 'PROCESSING'}
                      title="Replay Alex voice"
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full transition flex items-center gap-1 disabled:opacity-50 hover:bg-indigo-100"
                    >
                      <span>🔊</span> Replay
                    </button>
                  )}
                  {avatarState === 'speaking' && (
                    <span className="text-[10px] font-bold text-emerald-700 animate-pulse">
                      🔊 Audio Active
                    </span>
                  )}
                </div>
              </div>
              <p className="font-semibold text-slate-900 leading-relaxed text-xs sm:text-sm max-h-24 overflow-y-auto">
                &quot;{alexText || 'Alex is ready...'}&quot;
              </p>
            </div>
          </div>

          {}
          <div className="glass-card rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden shadow-xl border border-slate-200/90">
            {}
            <div className="flex justify-between items-center z-10">
              <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-2 shadow-sm">
                <span className={`w-2.5 h-2.5 rounded-full ${cameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span>You ({candidateName})</span>
              </div>

              {}
              <div className="flex items-center gap-2">
                <div
                  className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                    eyeContactScore >= 75
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  <span>👁 {eyeContactScore >= 75 ? 'Eye Contact: Good' : 'Look at Camera'}</span>
                </div>
                <div className="bg-white border border-slate-200 px-3 py-1 rounded-full text-xs font-bold text-indigo-700 shadow-sm">
                  Stability: {stabilityScore}%
                </div>
              </div>
            </div>

            {}
            <div className="relative flex-1 my-4 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 min-h-[260px] flex items-center justify-center">
              <video
                ref={attachStream}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {!cameraActive && (
                <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center p-4 text-center z-10">
                  <span className="text-3xl mb-2">📷</span>
                  <p className="text-xs font-bold text-slate-800">Webcam Preview Active</p>
                </div>
              )}
            </div>

            {}
            <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 z-10">
              <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                  Your Answer
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isListening
                    ? 'bg-emerald-100 text-emerald-700 animate-pulse'
                    : appState === 'USER_TURN'
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {isListening ? '🎤 Listening... (Auto-submits after pause)' : appState === 'USER_TURN' ? '💬 Your Turn (Type or Speak)' : 'Waiting...'}
                </span>
              </div>

              {}
              <textarea
                id="answer-textarea"
                rows={3}
                disabled={appState !== 'USER_TURN'}
                placeholder={
                  appState === 'USER_TURN'
                    ? 'Speak your answer (mic active) or type here... (Press Enter to submit)'
                    : 'Waiting for Alex to finish speaking...'
                }
                value={interimTranscript}
                onChange={(e) => {
                  const val = e.target.value;
                  setInterimTranscript(val);
                  typedAnswerRef.current = val;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleUserSubmitAnswer();
                  }
                }}
                className="w-full resize-none text-xs text-slate-800 font-medium leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
              />

              {sttError && (
                <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-xl text-center">
                  ⚠️ {sttError}
                </div>
              )}

              {}
              <div className="flex items-center gap-3 pt-1">
                <button
                  id="speak-now-btn"
                  onClick={handleToggleSpeak}
                  disabled={appState === 'ALEX_SPEAKING' || appState === 'PROCESSING'}
                  className={`flex-1 py-3 rounded-2xl font-black text-xs transition border flex items-center justify-center gap-2 shadow-md disabled:opacity-50 ${
                    isListening
                      ? 'bg-emerald-500 text-white border-emerald-600 animate-pulse shadow-emerald-500/20'
                      : appState === 'USER_TURN'
                      ? 'bg-white text-slate-800 border-slate-300 hover:border-indigo-400 hover:text-indigo-700'
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}
                >
                  <span>🎤</span>
                  <span>{isListening ? 'Listening... (tap to stop)' : 'Tap to Speak'}</span>
                </button>

                <button
                  id="submit-answer-btn"
                  onClick={() => handleUserSubmitAnswer()}
                  disabled={appState === 'ALEX_SPEAKING' || appState === 'PROCESSING'}
                  className={`py-3 px-5 font-black text-xs rounded-2xl shadow-md transition flex items-center gap-1.5 ${
                    appState === 'USER_TURN'
                      ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-indigo-600/25 cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                  }`}
                >
                  <span>✅</span>
                  <span>Submit</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      )}

      {}
      {appState === 'COMPLETE' && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center z-50">
          <div className="max-w-lg w-full glass-card p-8 rounded-3xl border border-slate-200/90 shadow-2xl bg-white space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center text-3xl mx-auto shadow-md">
              🎉
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Interview Completed!
              </h2>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                Great job talking with Alex! We are now analyzing your full conversation.
              </p>
            </div>

            {}
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Total Exchanges
                </span>
                <span className="text-xl font-black text-slate-900">{exchangeCount}</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Avg Eye Contact
                </span>
                <span className="text-xl font-black text-slate-900">{eyeContactScore}%</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Session Duration
                </span>
                <span className="text-xl font-black text-slate-900">
                  {formatDuration(durationSec)}
                </span>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-indigo-700 block mb-1">
                  Report Status
                </span>
                <span className="text-xs font-bold text-indigo-800 flex items-center gap-1.5 mt-1">
                  {!isReportReady && <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />}
                  {isReportReady ? 'Report Ready! ✨' : 'Analyzing...'}
                </span>
              </div>
            </div>

            {}
            {isReportReady ? (
              <Link
                href={`/report/${sessionId}`}
                className="w-full py-4 btn-primary font-black text-xs rounded-2xl shadow-lg block text-center transform hover:scale-[1.02] transition"
              >
                View Full Multimodal Report →
              </Link>
            ) : (
              <div className="py-3 px-4 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 animate-pulse">
                Compiling AI analytics report... Please wait a moment.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
