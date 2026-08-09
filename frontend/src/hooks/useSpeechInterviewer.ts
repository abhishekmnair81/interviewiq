'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export function useSpeechInterviewer(
  onUtteranceCreated?: (utt: SpeechSynthesisUtterance) => void
) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const networkRetryRef = useRef(0);
  const networkRetryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechQueueRef = useRef<string[]>([]);
  const onFinishedCallbackRef = useRef<(() => void) | null>(null);
  const isSpeakingRef = useRef(false);
  const speechWatchdogTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  const cancelSpeech = useCallback(() => {
    if (speechWatchdogTimerRef.current) {
      clearTimeout(speechWatchdogTimerRef.current);
      speechWatchdogTimerRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    speechQueueRef.current = [];
    isSpeakingRef.current = false;
    setIsSpeaking(false);
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

  const speak = useCallback(
    (text: string, onFinished?: () => void) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        if (onFinished) onFinished();
        return;
      }

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

      isSpeakingRef.current = true;
      setIsSpeaking(true);

      const wordCount = cleanedText.split(/\s+/).length;
      const expectedMs = Math.max(3500, Math.round((wordCount / 2.5) * 1000) + 3500);

      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(cleanedText);
        utterance.rate = 0.95;
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
          const cb = onFinishedCallbackRef.current;
          onFinishedCallbackRef.current = null;
          if (cb) cb();
        };

        speechWatchdogTimerRef.current = setTimeout(() => {
          console.warn('SpeechSynthesis watchdog triggered after fallback timeout');
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
            console.warn('Speech synthesis error:', e.error);
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
      }, 80);
    },
    [cancelSpeech]
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
    };
  }, [stopListening, cancelSpeech]);

  return {
    isSpeaking,
    isListening,
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

