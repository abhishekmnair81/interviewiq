'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useSpeechInterviewer } from '@/hooks/useSpeechInterviewer';
import { useFaceTracking } from '@/hooks/useFaceTracking';
import { useInterviewSocket, FaceReading } from '@/hooks/useInterviewSocket';
import { useStarAnalyzer } from '@/hooks/useStarAnalyzer';
import { CodingChallenge } from '@/components/CodingChallenge';
import { cn } from '@/lib/utils';
import { Mic, Send } from 'lucide-react';
import ResumeUpload from '@/components/ResumeUpload';
import FullScreenLoader from '@/components/FullScreenLoader';

// New design system components
import { InterviewHeader } from '@/components/interview/InterviewHeader';
import { AlexPanel } from '@/components/interview/AlexPanel';
import { ConversationStream, type ConversationTurn } from '@/components/interview/ConversationStream';
import { TabSwitchOverlay, CopyPasteBanner } from '@/components/interview/ProctoringBanner';

type AppState = 'SETUP' | 'CONNECTING' | 'ALEX_SPEAKING' | 'USER_TURN' | 'PROCESSING' | 'CODING_PHASE' | 'COMPLETE' | 'TERMINATED';
type AvatarState = 'idle' | 'speaking' | 'thinking' | 'listening';

export default function LiveInterviewPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [candidateName, setCandidateName] = useState('Candidate');
  const [jobRole, setJobRole] = useState('Software Engineer');
  const [category, setCategory] = useState('behavioral');
  const [difficulty, setDifficulty] = useState('medium');
  const [useResume, setUseResume] = useState(true);
  const [setupStep, setSetupStep] = useState(1);
  const [profile, setProfile] = useState<any>(null);

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
  const isCodingPhaseRef = useRef(false);
  
  // Coding Challenge State
  const [codingChallengeData, setCodingChallengeData] = useState<{
    question_id: string;
    index: number;
    total: number;
    title: string;
    description: string;
    starter_code: string;
    language: string;
    examples: Array<{ input: string; expected_output: string; }>;
    time_limit_seconds: number;
  } | null>(null);
  const [codingSubmissionResult, setCodingSubmissionResult] = useState<{
    passed: boolean;
    feedback: string;
    nextChallenge: any;
  } | null>(null);

  const [hasConsented, setHasConsented] = useState(false);

  // New state for conversation log + proctoring UI
  const [conversationTurns, setConversationTurns] = useState<ConversationTurn[]>([]);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [tabSwitchOverlayVisible, setTabSwitchOverlayVisible] = useState(false);
  const [copyPasteVisible, setCopyPasteVisible] = useState(false);

  const { isSpeaking, isListening, speak, cancelSpeech, startListening, stopListening, checkSupport } = useSpeechInterviewer();
  const { eyeContactScore, stabilityScore, currentEmotion } = useFaceTracking(videoRef);
  const { isConnected, connect, sendTranscript, sendFaceReading, endSession, latestMessage } = useInterviewSocket();

  useEffect(() => {
    setMounted(true);
    apiFetch('/users/profile/').then(setProfile).catch(() => {});
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

      // Capture user turn in conversation stream
      setConversationTurns(prev => [
        ...prev,
        { id: `user-${Date.now()}`, role: 'user', text: answer, timestamp: Date.now() }
      ]);

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
      // Capture turn in conversation stream
      setConversationTurns(prev => [
        ...prev,
        { id: `alex-${Date.now()}`, role: 'alex', text, timestamp: Date.now() }
      ]);

      if (isComplete) {
        speak(text, () => {
          setAppState('COMPLETE');
        });
      } else {
        setAppState((prev) => prev === 'CODING_PHASE' ? 'CODING_PHASE' : 'ALEX_SPEAKING');
        speak(text, () => {
          setAppState((prev) => {
            if (prev === 'CODING_PHASE' || isCodingPhaseRef.current) {
              return 'CODING_PHASE';
            }
            
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

            return 'USER_TURN';
          });
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
          used_resume: true,
        }),
      });

      setSessionId(res.id);
      setStartTime(Date.now());

      const token = localStorage.getItem('access_token');
      connect(res.id, token);
    } catch (err: any) {
      if (err.reason === 'resume_required' || (err.message && err.message.includes('resume'))) {
        alert('Upload your resume to start a personalized interview.');
        router.push('/dashboard#resume-upload');
        return;
      }
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
    } else if (latestMessage.type === 'coding_challenge' && latestMessage.challenge) {
      isCodingPhaseRef.current = true;
      const chal = latestMessage.challenge;
      setCodingChallengeData({
        question_id: chal.id,
        index: chal.index,
        total: chal.total,
        title: chal.title,
        description: chal.description,
        starter_code: chal.starter_code,
        language: chal.language,
        examples: chal.examples,
        time_limit_seconds: chal.time_limit_seconds
      });
      setCodingSubmissionResult(null);
      setAppState('CODING_PHASE');
    } else if (latestMessage.type === 'submission_result') {
      setCodingSubmissionResult({
        passed: latestMessage.passed ?? false,
        feedback: latestMessage.feedback ?? '',
        nextChallenge: latestMessage.next_challenge
      });
    } else if (latestMessage.type === 'interview_terminated') {
      setAppState('TERMINATED');
      alert('Interview terminated due to multiple tab switches or policy violations.');
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

  // Proctoring: Tab switching
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && appState !== 'SETUP' && appState !== 'CONNECTING' && appState !== 'COMPLETE' && appState !== 'TERMINATED') {
        sendTranscript({ type: 'tab_switch_detected' });
        if (isSpeaking) cancelSpeech();
        setTabSwitchCount(prev => prev + 1);
        setTabSwitchOverlayVisible(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [appState, sendTranscript, isSpeaking, cancelSpeech]);

  const handleSubmitCode = (code: string, language: string, questionId: string) => {
    sendTranscript({
      type: 'submit_code',
      code,
      language,
      question_id: questionId
    });
    // Do not change appState here. Keep it as CODING_PHASE so the editor and overlay remain visible.
  };

  const handleCopyPasteDetected = () => {
    sendTranscript({ type: 'copy_paste_detected' });
    setCopyPasteVisible(true);
    setTimeout(() => setCopyPasteVisible(false), 4000);
  };

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
    <div className="h-screen flex flex-col bg-surface-0 font-sans relative overflow-hidden">
      {/* Proctoring Overlays */}
      <TabSwitchOverlay 
        visible={tabSwitchOverlayVisible} 
        switchCount={tabSwitchCount} 
        onDismiss={() => setTabSwitchOverlayVisible(false)} 
      />
      <CopyPasteBanner visible={copyPasteVisible} />

      {/* Header */}
      {appState !== 'SETUP' && appState !== 'COMPLETE' && appState !== 'TERMINATED' && (
        <InterviewHeader
          durationSec={durationSec}
          exchangeCount={exchangeCount}
          connectionStatus={isConnected ? 'connected' : (appState === 'CONNECTING' ? 'connecting' : 'disconnected')}
          jobRole={jobRole}
          category={category}
          usedResume={useResume}
          onEndInterview={() => {
            cancelSpeech();
            stopListening();
            endSession();
            setAppState('COMPLETE');
          }}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative z-10 p-4 sm:p-6 gap-6">
        
        {appState === 'SETUP' && (
          <div className="w-full max-w-2xl mx-auto my-auto max-h-full overflow-y-auto glass-card p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface pb-6 mb-8">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-primary-600 bg-primary-500/10 px-3 py-1 rounded-full mb-3 inline-block">
                  Step {setupStep} of 4
                </span>
                <h1 className="text-2xl font-black text-primary-color">
                  {setupStep === 1 && 'Candidate Profile & Target Role'}
                  {setupStep === 2 && 'Interview Focus & Complexity'}
                  {setupStep === 3 && 'System Check'}
                  {setupStep === 4 && 'Orientation'}
                </h1>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={cn(
                      'w-2 h-2 rounded-full transition-all duration-300',
                      step === setupStep ? 'w-6 bg-primary-500' : 
                      step < setupStep ? 'bg-primary-500/40' : 'bg-surface-border'
                    )}
                  />
                ))}
              </div>
            </div>

            {setupStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-primary-color">Your Name</label>
                  <input
                    type="text"
                    className="w-full bg-surface-2 border border-surface rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500/50 outline-none text-primary-color"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="E.g. Jane Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-primary-color">Target Role</label>
                  <input
                    type="text"
                    className="w-full bg-surface-2 border border-surface rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500/50 outline-none text-primary-color"
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    placeholder="E.g. Senior Frontend Engineer"
                  />
                </div>
                <button
                  className="w-full h-12 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition shadow-glow-primary mt-4 disabled:opacity-50"
                  onClick={() => setSetupStep(2)}
                  disabled={!candidateName || !jobRole}
                >
                  Continue →
                </button>
              </div>
            )}

            {setupStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-primary-color">Interview Focus</label>
                  <select
                    className="w-full bg-surface-2 border border-surface rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500/50 outline-none text-primary-color"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="behavioral">Behavioral (Leadership & Culture)</option>
                    <option value="technical">Technical (Coding & Architecture)</option>
                    <option value="system_design">System Design (Scalability & Infra)</option>
                    <option value="product_sense">Product Sense (Strategy & Metrics)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-primary-color">Difficulty Level</label>
                  <select
                    className="w-full bg-surface-2 border border-surface rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500/50 outline-none text-primary-color"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                  >
                    <option value="easy">Entry / Junior</option>
                    <option value="medium">Mid-Level</option>
                    <option value="hard">Senior / Staff</option>
                  </select>
                </div>

                <div className="pt-2">
                  <h4 className="text-sm font-semibold text-primary-color mb-3">Resume Personalization</h4>
                  {profile && (
                    <div className="mb-3">
                      <ResumeUpload user={profile} onUpdate={setProfile} />
                    </div>
                  )}
                  {profile?.has_resume ? (
                    <div className="flex items-center gap-3 p-4 border border-emerald-500/20 bg-emerald-500/5 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-sm">✨</div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-primary-color">
                          Resume attached automatically
                        </span>
                        <span className="text-xs text-muted-color">
                          Alex will personalize questions based on your specific projects and experience.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 border border-amber-500/20 bg-amber-500/5 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-sm">⚠️</div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-primary-color">
                          Resume required
                        </span>
                        <span className="text-xs text-muted-color">
                          Please upload your resume to continue.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    className="flex-1 h-12 bg-surface-2 hover:bg-surface-3 text-secondary-color rounded-xl font-bold transition"
                    onClick={() => setSetupStep(1)}
                  >
                    ← Back
                  </button>
                  <button
                    className="flex-[2] h-12 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition shadow-glow-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setSetupStep(3)}
                    disabled={!profile?.has_resume}
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {setupStep === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-2 border border-surface rounded-xl overflow-hidden aspect-video relative flex flex-col items-center justify-center">
                    <video
                      ref={attachStream}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                    />
                    {!cameraActive && (
                      <div className="text-xs font-semibold tracking-widest text-muted-color uppercase">Camera Off</div>
                    )}
                  </div>
                  <div className="bg-surface-2 border border-surface rounded-xl p-4 flex flex-col justify-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", micLevel > 5 ? "bg-emerald-500/20 text-emerald-500" : "bg-surface-3 text-muted-color")}>
                        🎤
                      </div>
                      <div>
                        <div className="text-sm font-bold text-primary-color">Microphone</div>
                        <div className="text-[10px] text-muted-color uppercase tracking-widest mt-1">
                          {micLevel > 5 ? 'Receiving Audio' : 'No Input'}
                        </div>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-surface-3 rounded-full overflow-hidden flex">
                      <div className="h-full bg-emerald-500 transition-all duration-75" style={{ width: `${Math.min(100, micLevel)}%` }} />
                    </div>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                  <span className="text-lg">🛡️</span>
                  <div>
                    <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">Proctoring Notice</h4>
                    <p className="text-xs text-amber-600/80 dark:text-amber-400/80 leading-relaxed">
                      This session uses AI tracking for eye contact, emotion, and tab switching. By proceeding, you consent to this monitoring.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-3 p-4 border border-surface rounded-xl cursor-pointer hover:bg-surface-2 transition">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary-600 rounded bg-surface-3 border-surface-strong focus:ring-primary-500"
                    checked={hasConsented}
                    onChange={(e) => setHasConsented(e.target.checked)}
                  />
                  <span className="text-sm font-semibold text-primary-color">
                    I consent to video/audio tracking for this session
                  </span>
                </label>

                <div className="flex gap-3 mt-4">
                  <button
                    className="flex-1 h-12 bg-surface-2 hover:bg-surface-3 text-secondary-color rounded-xl font-bold transition"
                    onClick={() => setSetupStep(2)}
                  >
                    ← Back
                  </button>
                  <button
                    className="flex-[2] h-12 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition shadow-glow-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setSetupStep(4)}
                    disabled={!hasConsented || !cameraActive}
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {setupStep === 4 && (
              <div className="space-y-6 text-center">
                <div className="w-24 h-24 mx-auto bg-primary-600 rounded-full flex items-center justify-center shadow-glow-primary">
                  <span className="text-4xl font-black text-white">IQ</span>
                </div>
                <h3 className="text-xl font-bold text-primary-color">Ready when you are!</h3>
                <p className="text-sm text-secondary-color leading-relaxed max-w-sm mx-auto">
                  You are about to start a live AI interview for the <strong className="text-primary-color">{jobRole}</strong> position. Alex will conduct the interview.
                </p>
                <div className="flex gap-3 mt-6">
                  <button
                    className="flex-1 h-12 bg-surface-2 hover:bg-surface-3 text-secondary-color rounded-xl font-bold transition"
                    onClick={() => setSetupStep(3)}
                  >
                    ← Back
                  </button>
                  <button
                    className="flex-[2] h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-glow-accent"
                    onClick={handleStartInterview}
                  >
                    Begin Interview →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {(appState === 'CONNECTING' || appState === 'COMPLETE' || appState === 'TERMINATED') && (
          <div className="w-full max-w-md mx-auto my-auto text-center space-y-6">
            {appState === 'CONNECTING' && (
              <FullScreenLoader />
            )}
            
            {appState === 'COMPLETE' && (
              <div className="p-8 glass-card shadow-2xl text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto text-3xl mb-2">
                  ✨
                </div>
                <div>
                  <h3 className="text-2xl font-black text-primary-color">Interview Complete</h3>
                  <p className="text-sm text-secondary-color mt-2">
                    Great job! We are compiling your multimodal performance report.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="bg-surface-2 rounded-xl p-3 border border-surface">
                    <div className="text-[10px] uppercase font-bold text-muted-color mb-1">Exchanges</div>
                    <div className="text-xl font-black text-primary-color">{exchangeCount}</div>
                  </div>
                  <div className="bg-surface-2 rounded-xl p-3 border border-surface">
                    <div className="text-[10px] uppercase font-bold text-muted-color mb-1">Duration</div>
                    <div className="text-xl font-black text-primary-color">{formatDuration(durationSec)}</div>
                  </div>
                </div>

                {isReportReady ? (
                  <Link
                    href={`/report/${sessionId}`}
                    className="w-full h-12 flex items-center justify-center bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition shadow-glow-primary"
                  >
                    View Report →
                  </Link>
                ) : (
                  <FullScreenLoader />
                )}
              </div>
            )}

            {appState === 'TERMINATED' && (
              <div className="p-8 glass-card shadow-2xl text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center mx-auto text-3xl">
                  🛑
                </div>
                <div>
                  <h3 className="text-2xl font-black text-primary-color">Interview Terminated</h3>
                  <p className="text-sm text-secondary-color mt-2">
                    Your session was ended due to proctoring violations.
                  </p>
                </div>
                <Link
                  href="/dashboard"
                  className="w-full h-12 flex items-center justify-center bg-surface-2 hover:bg-surface-3 text-primary-color border border-surface-strong rounded-xl font-bold transition"
                >
                  Return to Dashboard
                </Link>
              </div>
            )}
          </div>
        )}

        {(appState === 'ALEX_SPEAKING' || appState === 'PROCESSING' || appState === 'USER_TURN' || appState === 'CODING_PHASE') && (
          <div className="flex-1 flex gap-4 min-w-0 max-w-[1600px] mx-auto w-full h-full pb-4">
            {/* Middle/Main Panel: Candidate or Coding */}
            <div className="flex-[2] min-w-0 flex flex-col h-full gap-4 relative">
              {appState === 'CODING_PHASE' && codingChallengeData ? (
                <div className="flex-1 glass-card overflow-hidden relative shadow-lg">
                  <CodingChallenge
                    questionId={codingChallengeData.question_id}
                    index={codingChallengeData.index}
                    total={codingChallengeData.total}
                    title={codingChallengeData.title}
                    description={codingChallengeData.description}
                    initialCode={codingChallengeData.starter_code}
                    language={codingChallengeData.language}
                    examples={codingChallengeData.examples}
                    timeLimitSeconds={codingChallengeData.time_limit_seconds}
                    onSubmitCode={handleSubmitCode}
                    onCopyPasteDetected={handleCopyPasteDetected}
                  />

                  {/* Coding Submission Overlay */}
                  {codingSubmissionResult && (
                    <div className="absolute inset-0 bg-surface-0/80 backdrop-blur-sm flex items-center justify-center z-[60] p-6">
                      <div className="bg-surface-1 border border-surface p-8 rounded-2xl max-w-lg w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-primary-color mb-2">
                          {codingSubmissionResult.passed ? '✅ Submission Processed' : '❌ Tests Failed'}
                        </h3>
                        <div className="bg-surface-2 p-4 rounded-xl border border-surface mb-6 mt-4 text-sm text-secondary-color">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary-500 block mb-1">Alex&apos;s Feedback</span>
                          {codingSubmissionResult.feedback}
                        </div>
                        
                        {codingSubmissionResult.nextChallenge ? (
                           <button
                             onClick={() => {
                               const chal = codingSubmissionResult.nextChallenge;
                               setCodingChallengeData({
                                 question_id: chal.id,
                                 index: chal.index,
                                 total: chal.total,
                                 title: chal.title,
                                 description: chal.description,
                                 starter_code: chal.starter_code,
                                 language: chal.language,
                                 examples: chal.examples,
                                 time_limit_seconds: chal.time_limit_seconds
                               });
                               setCodingSubmissionResult(null);
                             }}
                             className="w-full h-12 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition shadow-glow-primary"
                           >
                             Next Question →
                           </button>
                        ) : (
                           <button
                             onClick={() => {
                               setCodingSubmissionResult(null);
                               isCodingPhaseRef.current = false;
                               setCodingChallengeData(null);
                               setAppState('ALEX_SPEAKING');
                             }}
                             className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-glow-accent"
                           >
                             Complete Coding Assessment
                           </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Alex — main stage (WhatsApp-style big screen) */}
                  <div className="relative flex-1 min-h-0">
                    <AlexPanel
                      state={avatarState}
                      alexText={alexText}
                      jobRole={jobRole}
                      onReplayAlex={handleReplayAlex}
                      isSpeaking={isSpeaking}
                      hideSpeech
                      className="h-full"
                    />
                    {/* Candidate self-view — floating PiP (bottom-right) */}
                    <div className="absolute bottom-4 right-4 z-20 w-40 sm:w-48 md:w-56 rounded-xl overflow-hidden border border-white/15 shadow-2xl bg-slate-900">
                      <div className="relative aspect-video">
                        <video
                          ref={attachStream}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover scale-x-[-1]"
                          aria-label="Your webcam feed"
                        />
                        {!cameraActive && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800/90">
                            <span className="text-lg" aria-hidden="true">📷</span>
                            <p className="text-[10px] font-bold text-slate-300 mt-1">Camera off</p>
                          </div>
                        )}
                        <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1">
                          <span className="text-[9px] font-bold text-white bg-black/50 backdrop-blur px-1.5 py-0.5 rounded-full truncate max-w-[60%]">
                            {candidateName || 'You'}
                          </span>
                          <span className={cn(
                            'text-[9px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur',
                            eyeContactScore >= 75 ? 'bg-emerald-500/30 text-emerald-200' : 'bg-rose-500/30 text-rose-200'
                          )}>
                            👁 {eyeContactScore}%
                          </span>
                        </div>
                        {isListening && (
                          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-emerald-500/30 backdrop-blur px-2 py-0.5 rounded-full border border-emerald-400/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                            <span className="text-[9px] font-bold text-emerald-100">Listening</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Control row — small rounded mic + send (typing lives in the chat panel) */}
                  <div className="flex-shrink-0 space-y-2">
                    {sttError && (
                      <div className="text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg" role="alert">
                        ⚠️ {sttError}
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-4 py-1">
                      <button
                        onClick={handleToggleSpeak}
                        disabled={appState === 'ALEX_SPEAKING' || appState === 'PROCESSING'}
                        aria-pressed={isListening}
                        aria-label={isListening ? 'Stop speaking' : 'Start speaking'}
                        title={isListening ? 'Listening… tap to stop' : 'Tap to speak'}
                        className={cn(
                          'w-11 h-11 rounded-full flex items-center justify-center shadow-lg border transition-all',
                          isListening
                            ? 'bg-emerald-500 border-emerald-300 text-white animate-pulse scale-105'
                            : appState === 'USER_TURN'
                            ? 'bg-white/95 border-white/70 text-slate-800 hover:bg-white hover:scale-105 active:scale-95'
                            : 'bg-slate-700/60 border-white/10 text-slate-300 cursor-not-allowed opacity-60'
                        )}
                      >
                        <Mic className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => { if (submitAnswerRef.current) submitAnswerRef.current(interimTranscript); }}
                        disabled={appState === 'ALEX_SPEAKING' || appState === 'PROCESSING'}
                        aria-label="Submit your answer"
                        title="Send answer"
                        className={cn(
                          'w-11 h-11 rounded-full flex items-center justify-center shadow-lg border transition-all',
                          appState === 'USER_TURN'
                            ? 'bg-primary-600 border-primary-500 text-white hover:bg-primary-700 hover:scale-105 active:scale-95 shadow-glow-primary'
                            : 'bg-slate-700/60 border-white/10 text-slate-300 cursor-not-allowed opacity-60'
                        )}
                      >
                        <Send className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Conversation chat — right column (aligned); typing lives here only */}
            {appState !== 'CODING_PHASE' && (
              <div className="hidden lg:flex flex-col gap-3 w-[340px] flex-shrink-0 h-full">
                <ConversationStream turns={conversationTurns} className="flex-1 min-h-0 w-full" />
                <div className={cn(
                  'flex-shrink-0 flex items-center gap-2 rounded-2xl bg-surface-2 border border-surface px-4 py-2.5 shadow-lg transition-opacity',
                  appState !== 'USER_TURN' && 'opacity-60'
                )}>
                  <span className="text-base flex-shrink-0" aria-hidden="true">{isListening ? '🎤' : '💬'}</span>
                  <input
                    type="text"
                    disabled={appState !== 'USER_TURN'}
                    placeholder={appState === 'USER_TURN' ? 'Type your answer…' : 'Waiting for Alex…'}
                    value={interimTranscript}
                    onChange={(e) => setInterimTranscript(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (submitAnswerRef.current) submitAnswerRef.current(interimTranscript);
                      }
                    }}
                    aria-label="Your answer"
                    className="flex-1 min-w-0 bg-transparent text-primary-color placeholder:text-muted-color text-sm outline-none disabled:cursor-not-allowed"
                  />
                  {interimTranscript.trim() && appState === 'USER_TURN' && (
                    <button
                      onClick={() => { if (submitAnswerRef.current) submitAnswerRef.current(interimTranscript); }}
                      aria-label="Send answer"
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-primary-600 text-white hover:bg-primary-700 active:scale-95 transition-all"
                    >
                      <Send className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
