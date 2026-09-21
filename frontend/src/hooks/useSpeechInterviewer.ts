'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

export type VoiceMode = 'neural' | 'browser';

export function useSpeechInterviewer(
  onUtteranceCreated?: (utt: SpeechSynthesisUtterance) => void
) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('neural');
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const networkRetryRef = useRef(0);
  const networkRetryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onFinishedCallbackRef = useRef<(() => void) | null>(null);
  const isSpeakingRef = useRef(false);
  const speechWatchdogTimerRef = useRef<NodeJS.Timeout | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const bufferSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const checkSupport = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    const hasSpeechSynthesis = 'speechSynthesis' in window;
    const hasSpeechRecognition = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

    if (!hasSpeechSynthesis || !hasSpeechRecognition) {
      alert(
        'Speech API is not fully supported in this browser. Please use Google Chrome or Microsoft Edge for the live AI interview studio.'
      );
      return false;
    }
    return true;
  }, []);

  const getAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 128;
        analyserRef.current.smoothingTimeConstant = 0.8;
      }
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
    return { ctx: audioContextRef.current, analyser: analyserRef.current };
  }, []);

  const startLevelMeter = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const update = () => {
      if (!isSpeakingRef.current) {
        setAudioLevel(0);
        return;
      }
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const normalized = Math.min(100, Math.round((avg / 128) * 100));
      setAudioLevel(normalized);
      animFrameRef.current = requestAnimationFrame(update);
    };
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(update);
  }, []);

  const cancelSpeech = useCallback(() => {
    if (speechWatchdogTimerRef.current) {
      clearTimeout(speechWatchdogTimerRef.current);
      speechWatchdogTimerRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (bufferSourceRef.current) {
      try {
        bufferSourceRef.current.stop();
        bufferSourceRef.current.disconnect();
      } catch {}
      bufferSourceRef.current = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    isSpeakingRef.current = false;
    setIsSpeaking(false);
    setAudioLevel(0);
  }, []);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (networkRetryTimerRef.current) {
      clearTimeout(networkRetryTimerRef.current);
      networkRetryTimerRef.current = null;
    }
    networkRetryRef.current = 0;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    setIsListening(false);
  }, []);

  const speakWithBrowserTTS = useCallback(
    (cleanedText: string, onFinished?: () => void) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        if (onFinished) onFinished();
        return;
      }

      isSpeakingRef.current = true;
      setIsSpeaking(true);

      const wordCount = cleanedText.split(/\s+/).length;
      const expectedMs = Math.max(3500, Math.round((wordCount / 2.5) * 1000) + 3500);

      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(cleanedText);
        utterance.rate = 0.96;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.lang = 'en-US';

        let finishedFired = false;
        const triggerFinished = () => {
          if (finishedFired) return;
          finishedFired = true;
          if (speechWatchdogTimerRef.current) {
            clearTimeout(speechWatchdogTimerRef.current);
            speechWatchdogTimerRef.current = null;
          }
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          setAudioLevel(0);
          const cb = onFinishedCallbackRef.current;
          onFinishedCallbackRef.current = null;
          if (cb) cb();
        };

        speechWatchdogTimerRef.current = setTimeout(() => {
          triggerFinished();
        }, expectedMs);

        const trySpeak = () => {
          const voices = window.speechSynthesis.getVoices();
          if (voices.length > 0) {
            const preferredVoice =
              voices.find((v) => v.name.includes('Google US English')) ||
              voices.find((v) => v.name.includes('Natural')) ||
              voices.find((v) => v.lang === 'en-US' && !v.localService) ||
              voices.find((v) => v.lang.startsWith('en')) ||
              voices[0];

            if (preferredVoice) utterance.voice = preferredVoice;
          }

          utterance.onend = () => {
            triggerFinished();
          };

          utterance.onerror = (e) => {
            if (e.error !== 'interrupted' && e.error !== 'canceled') {
              triggerFinished();
            }
          };

          try {
            if (onUtteranceCreated) onUtteranceCreated(utterance);
            window.speechSynthesis.speak(utterance);
          } catch (e) {
            triggerFinished();
          }
        };

        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
          let voiceTimeout = setTimeout(() => {
            window.speechSynthesis.onvoiceschanged = null;
            trySpeak();
          }, 300);

          window.speechSynthesis.onvoiceschanged = () => {
            clearTimeout(voiceTimeout);
            window.speechSynthesis.onvoiceschanged = null;
            trySpeak();
          };
        } else {
          trySpeak();
        }
      }, 50);
    },
    [onUtteranceCreated]
  );

  const speak = useCallback(
    async (text: string, onFinished?: () => void, overrideMode?: VoiceMode) => {
      cancelSpeech();
      onFinishedCallbackRef.current = onFinished || null;

      const cleanedText = text
        .replace(/[\*\_~`#]/g, '')
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanedText) {
        if (onFinished) onFinished();
        return;
      }

      const activeMode = overrideMode || voiceMode;

      if (activeMode === 'neural') {
        try {
          isSpeakingRef.current = true;
          setIsSpeaking(true);

          const audioState = getAudioContext();
          const endpoint = `${API_BASE_URL}/analysis/tts/speak/`;

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: cleanedText, voice: 'en-US-GuyNeural' }),
          });

          if (!res.ok) {
            throw new Error(`TTS server responded with ${res.status}`);
          }

          const arrayBuffer = await res.arrayBuffer();

          if (!audioState?.ctx || !audioState?.analyser) {
             throw new Error("AudioContext not initialized");
          }

          const audioBuffer = await audioState.ctx.decodeAudioData(arrayBuffer);
          const source = audioState.ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioState.analyser);
          audioState.analyser.connect(audioState.ctx.destination);
          
          bufferSourceRef.current = source;

          source.onended = () => {
            isSpeakingRef.current = false;
            setIsSpeaking(false);
            setAudioLevel(0);
            bufferSourceRef.current = null;
            const cb = onFinishedCallbackRef.current;
            onFinishedCallbackRef.current = null;
            if (cb) cb();
          };

          source.start(0);
          startLevelMeter();
          return;
        } catch (err) {
          console.warn('Neural TTS request error, falling back to browser voice:', err);
          speakWithBrowserTTS(cleanedText, onFinished);
          return;
        }
      }

      speakWithBrowserTTS(cleanedText, onFinished);
    },
    [cancelSpeech, voiceMode, getAudioContext, startLevelMeter, speakWithBrowserTTS]
  );

  const startListening = useCallback(
    (
      onLiveUpdate: (text: string) => void,
      onSilence: (finalText: string) => void,
      silenceMs: number = 3500
    ) => {
      if (typeof window === 'undefined') return;

      stopListening();

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setError('Speech recognition is not supported in this browser.');
        return;
      }

      const doStart = () => {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          let accumulatedFinalText = '';

          const resetSilenceTimer = (currentText: string) => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

            if (currentText.trim().length >= 3) {
              silenceTimerRef.current = setTimeout(() => {
                try {
                  recognition.onresult = null;
                  recognition.onend = null;
                  recognition.onerror = null;
                  recognition.stop();
                } catch {}
                recognitionRef.current = null;
                setIsListening(false);
                onSilence(currentText.trim());
              }, silenceMs);
            }
          };

          recognition.onstart = () => {
            networkRetryRef.current = 0;
            setIsListening(true);
            setError(null);
            accumulatedFinalText = '';
          };

          recognition.onresult = (event: any) => {
            let interimText = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const chunk = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                accumulatedFinalText += (accumulatedFinalText ? ' ' : '') + chunk.trim();
              } else {
                interimText += chunk;
              }
            }
            const fullText = (accumulatedFinalText + (interimText ? ' ' + interimText : '')).trim();
            if (fullText) {
              onLiveUpdate(fullText);
              resetSilenceTimer(fullText);
            }
          };

          recognition.onerror = (event: any) => {
            const err: string = event.error;
            if (err === 'network') {
              if (networkRetryRef.current < 3) {
                const delay = (networkRetryRef.current + 1) * 500;
                networkRetryRef.current += 1;
                networkRetryTimerRef.current = setTimeout(doStart, delay);
              } else {
                setError('Microphone temporarily busy — please tap "Tap to Speak" or type your response.');
              }
            } else if (err === 'not-allowed' || err === 'service-not-allowed') {
              setError('Microphone access denied. Please grant browser microphone permission.');
            } else if (err !== 'no-speech' && err !== 'aborted') {
              setError(`Recognition issue: ${err}. Please try again or type below.`);
            }
          };

          recognition.onend = () => {
            if (networkRetryTimerRef.current === null) {
              setIsListening(false);
            }
          };

          recognitionRef.current = recognition;
          recognition.start();
        } catch (err: any) {
          setError('Could not start microphone. Please check browser permissions.');
          setIsListening(false);
        }
      };

      networkRetryTimerRef.current = setTimeout(() => {
        networkRetryTimerRef.current = null;
        doStart();
      }, 250);
    },
    [stopListening]
  );

  useEffect(() => {
    return () => {
      stopListening();
      cancelSpeech();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [stopListening, cancelSpeech]);

  return {
    isSpeaking,
    isListening,
    voiceMode,
    setVoiceMode,
    audioLevel,
    analyser: analyserRef.current,
    error,
    speak,
    cancelSpeech,
    startListening,
    stopListening,
    checkSupport,
    isSupported:
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window),
  };
}
