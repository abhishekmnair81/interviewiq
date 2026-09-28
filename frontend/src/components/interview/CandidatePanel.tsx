/**
 * components/interview/CandidatePanel.tsx
 * Right panel of the interview room (non-coding states).
 * Shows: webcam feed, eye contact badge, answer textarea,
 *        voice input controls, and mic waveform bars.
 *
 * ALL logic (handlers, refs, state) is passed via props —
 * this is a pure UI component.
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Send, Eye, EyeOff, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AppState =
  | 'SETUP'
  | 'CONNECTING'
  | 'ALEX_SPEAKING'
  | 'USER_TURN'
  | 'PROCESSING'
  | 'CODING_PHASE'
  | 'COMPLETE'
  | 'TERMINATED';

export interface CandidatePanelProps {
  candidateName: string;
  appState: AppState;
  isListening: boolean;
  interimTranscript: string;
  eyeContactScore: number;
  stabilityScore: number;
  cameraActive: boolean;
  sttError?: string | null;
  videoRef: React.RefCallback<HTMLVideoElement>;
  onTranscriptChange: (value: string) => void;
  onToggleSpeak: () => void;
  onSubmitAnswer: () => void;
  className?: string;
}

/** Three-bar waveform animation shown when mic is active */
function WaveformBars({ active }: { active: boolean }) {
  return (
    <div
      className="flex items-end gap-0.5 h-4"
      aria-hidden="true"
    >
      {['wave-1', 'wave-2', 'wave-3'].map((anim, i) => (
        <motion.div
          key={i}
          className={cn(
            'w-0.5 rounded-full origin-bottom',
            active ? 'bg-emerald-400' : 'bg-slate-500'
          )}
          animate={active ? { scaleY: [0.4, 1, 0.4] } : { scaleY: 0.3 }}
          transition={
            active
              ? { duration: 0.8 + i * 0.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }
              : { duration: 0.2 }
          }
          style={{ height: 16, transformOrigin: 'bottom' }}
        />
      ))}
    </div>
  );
}

export function CandidatePanel({
  candidateName,
  appState,
  isListening,
  interimTranscript,
  eyeContactScore,
  stabilityScore,
  cameraActive,
  sttError,
  videoRef,
  onTranscriptChange,
  onToggleSpeak,
  onSubmitAnswer,
  className,
}: CandidatePanelProps) {
  const isUserTurn = appState === 'USER_TURN';
  const isDisabled = appState === 'ALEX_SPEAKING' || appState === 'PROCESSING';
  const goodEyeContact = eyeContactScore >= 75;

  return (
    <div
      className={cn(
        'flex flex-col h-full rounded-2xl overflow-hidden glass-card',
        className
      )}
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface flex-shrink-0">
        <div className="flex items-center gap-2">
          <span
            className={cn('w-2 h-2 rounded-full flex-shrink-0', cameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500')}
            aria-hidden="true"
          />
          <span className="text-xs font-bold text-primary-color">{candidateName || 'You'}</span>
        </div>

        {/* Metrics row */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border',
              goodEyeContact
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            )}
            aria-label={`Eye contact: ${goodEyeContact ? 'Good' : 'Look at camera'}`}
          >
            {goodEyeContact ? <Eye className="w-3 h-3" aria-hidden="true" /> : <EyeOff className="w-3 h-3" aria-hidden="true" />}
            <span>{goodEyeContact ? 'Good' : 'Camera'}</span>
          </div>

          <div
            className="flex items-center gap-1 text-[10px] font-semibold text-muted-color"
            aria-label={`Stability: ${stabilityScore}%`}
            title="Head stability score"
          >
            <Activity className="w-3 h-3" aria-hidden="true" />
            <span>{stabilityScore}%</span>
          </div>
        </div>
      </div>

      {/* Webcam feed */}
      <div className="relative flex-1 bg-slate-900 min-h-[180px] overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
          aria-label="Your webcam feed"
        />

        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800/90">
            <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center mb-2">
              <span className="text-xl" aria-hidden="true">📷</span>
            </div>
            <p className="text-xs font-bold text-slate-300">Camera not available</p>
          </div>
        )}

        {/* State overlay badge on webcam */}
        {isListening && (
          <div
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-500/40"
            aria-live="polite"
          >
            <WaveformBars active />
            <span className="text-[10px] font-bold text-emerald-300">Listening…</span>
          </div>
        )}
      </div>

      {/* Answer input area */}
      <div className="flex-shrink-0 p-4 border-t border-surface space-y-3 bg-surface-1/50">
        {/* Label row */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-color">
            Your Answer
          </span>
          <span
            className={cn(
              'text-[10px] font-bold px-2 py-0.5 rounded-full',
              isListening ? 'bg-emerald-500/10 text-emerald-400 animate-pulse' :
              isUserTurn ? 'bg-primary-500/10 text-primary-400' :
              'bg-surface-2 text-muted-color'
            )}
            aria-live="polite"
          >
            {isListening ? '🎤 Listening…' : isUserTurn ? '💬 Your Turn' : 'Waiting for Alex…'}
          </span>
        </div>

        {/* STT error */}
        {sttError && (
          <div
            className="text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg"
            role="alert"
          >
            ⚠️ {sttError}
          </div>
        )}

        {/* Textarea */}
        <textarea
          id="answer-textarea"
          rows={3}
          disabled={!isUserTurn}
          placeholder={
            isUserTurn
              ? 'Speak your answer (mic active) or type here… Press Enter to submit'
              : 'Waiting for Alex to finish…'
          }
          value={interimTranscript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmitAnswer();
            }
          }}
          aria-label="Your answer"
          aria-disabled={!isUserTurn}
          className={cn(
            'w-full resize-none rounded-xl p-3',
            'text-sm text-primary-color leading-relaxed',
            'glass-input',
            'placeholder:text-muted-color',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/60',
            'transition-colors',
            !isUserTurn && 'opacity-50 cursor-not-allowed'
          )}
        />

        {/* Controls row */}
        <div className="flex items-center gap-2">
          {/* Mic button */}
          <button
            id="speak-now-btn"
            onClick={onToggleSpeak}
            disabled={isDisabled}
            aria-label={isListening ? 'Stop speaking' : 'Start speaking'}
            aria-pressed={isListening}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 h-10 rounded-xl font-semibold text-xs',
              'border transition-all',
              isListening
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-glow-accent'
                : isUserTurn
                ? 'bg-surface-2 border-surface-strong text-secondary-color hover:border-primary-500/50 hover:text-primary-color'
                : 'bg-surface-2 border-surface text-muted-color cursor-not-allowed opacity-50'
            )}
          >
            <WaveformBars active={isListening} />
            {isListening ? (
              <span>Listening… tap to stop</span>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Tap to Speak</span>
              </>
            )}
          </button>

          {/* Submit button */}
          <button
            id="submit-answer-btn"
            onClick={onSubmitAnswer}
            disabled={isDisabled}
            aria-label="Submit your answer"
            className={cn(
              'flex items-center gap-1.5 px-4 h-10 rounded-xl font-semibold text-xs',
              'border transition-all',
              isUserTurn
                ? 'bg-primary-600 border-primary-600 text-white hover:bg-primary-700 shadow-glow-primary active:scale-95'
                : 'bg-surface-2 border-surface text-muted-color cursor-not-allowed opacity-50'
            )}
          >
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
