/**
 * components/interview/AlexPanel.tsx
 * Left panel of the live interview room.
 * Shows: Alex's avatar, state badge, speech bubble.
 * State treatments per the Real-Time State Matrix.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AlexImageCharacter, type AlexAvatarState } from '@/components/AlexImageCharacter';
import { Alex3DRealCharacter } from '@/components/Alex3DRealCharacter';

const STATE_CONFIGS = {
  idle: {
    label: 'Ready',
    badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    dotClass: 'bg-slate-400',
    pulse: false,
    borderClass: '',
  },
  speaking: {
    label: 'Speaking',
    badgeClass: 'bg-primary-500/15 text-primary-400 border-primary-500/30',
    dotClass: 'bg-primary-500',
    pulse: true,
    borderClass: 'alex-panel-speaking',
  },
  thinking: {
    label: 'Thinking',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    dotClass: 'bg-amber-500',
    pulse: false,
    borderClass: 'alex-panel-thinking',
  },
  listening: {
    label: 'Listening',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    dotClass: 'bg-emerald-500',
    pulse: true,
    borderClass: 'alex-panel-listening',
  },
} as const;

export interface AlexPanelProps {
  state: AlexAvatarState;
  alexText: string;
  jobRole: string;
  onReplayAlex?: () => void;
  isSpeaking?: boolean;
  hideSpeech?: boolean;
  className?: string;
}

export function AlexPanel({
  state,
  alexText,
  jobRole,
  onReplayAlex,
  isSpeaking = false,
  hideSpeech = false,
  className,
}: AlexPanelProps) {
  const config = STATE_CONFIGS[state] ?? STATE_CONFIGS.idle;
  const [use3D, setUse3D] = useState(true);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setUse3D(false);
      }
    } catch (e) {
      setUse3D(false);
    }
  }, []);

  return (
    <div
      className={cn(
        'flex flex-col h-full rounded-2xl overflow-hidden glass-card',
        'transition-all duration-300',
        config.borderClass,
        className
      )}
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-primary-color">Alex</span>
          <span className="text-xs text-muted-color">·</span>
          <span className="text-xs text-secondary-color truncate max-w-[100px]">{jobRole}</span>
        </div>

        {/* State badge */}
        <div
          className={cn(
            'flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-wide',
            config.badgeClass
          )}
          aria-label={`Alex status: ${config.label}`}
          aria-live="polite"
        >
          <span
            className={cn('w-1.5 h-1.5 rounded-full', config.dotClass, config.pulse && 'animate-pulse')}
            aria-hidden="true"
          />
          {config.label}
        </div>
      </div>

      {/* Avatar area */}
      <div className="relative flex-1 bg-[#070b14] min-h-[200px] overflow-hidden">
        {use3D ? (
          <Alex3DRealCharacter state={state} alexText={alexText} />
        ) : (
          <AlexImageCharacter state={state} />
        )}

        {/* Thinking animation overlay */}
        {state === 'thinking' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            {[0, 150, 300].map((delay) => (
              <motion.div
                key={delay}
                className="w-2 h-2 rounded-full bg-amber-400"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 1, repeat: Infinity, delay: delay / 1000, ease: 'easeInOut' }}
                aria-hidden="true"
              />
            ))}
          </div>
        )}
      </div>

      {/* Speech bubble */}
      {!hideSpeech && (
      <div className="flex-shrink-0 p-4 border-t border-surface bg-surface-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-color">
            Alex says
          </span>
          <div className="flex items-center gap-2">
            {state === 'speaking' && (
              <span className="text-[10px] font-bold text-primary-400 animate-pulse" aria-live="polite">
                🔊 Audio
              </span>
            )}
            {alexText && onReplayAlex && (
              <button
                onClick={onReplayAlex}
                disabled={isSpeaking}
                className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors',
                  'bg-primary-500/10 text-primary-400 border-primary-500/30',
                  'hover:bg-primary-500/20 disabled:opacity-40 disabled:cursor-not-allowed'
                )}
                aria-label="Replay Alex's response"
              >
                ↺ Replay
              </button>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={alexText?.slice(0, 20)}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-sm font-medium text-primary-color leading-relaxed max-h-20 overflow-y-auto scrollbar-hidden"
            aria-live="polite"
            aria-atomic="true"
          >
            {alexText ? `"${alexText}"` : (
              <span className="text-muted-color italic">Alex is getting ready…</span>
            )}
          </motion.p>
        </AnimatePresence>
      </div>
      )}
    </div>
  );
}
