/**
 * components/interview/InterviewHeader.tsx
 * Top bar for the live interview room.
 * Shows: session timer, exchange counter, WS status, "End Interview" button.
 * Design: minimal, dark, always visible.
 */

'use client';

import React from 'react';
import { Wifi, WifiOff, Phone, Clock, MessageSquare } from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import type { ConnectionStatus } from '@/hooks/useInterviewSocket';

export interface InterviewHeaderProps {
  durationSec: number;
  exchangeCount: number;
  connectionStatus: ConnectionStatus;
  jobRole: string;
  category: string;
  onEndInterview: () => void;
  usedResume?: boolean;
  className?: string;
}

export function InterviewHeader({
  durationSec,
  exchangeCount,
  connectionStatus,
  jobRole,
  category,
  onEndInterview,
  usedResume,
  className,
}: InterviewHeaderProps) {
  const isConnected = connectionStatus === 'connected';
  const isError = connectionStatus === 'error' || connectionStatus === 'disconnected';

  return (
    <header
      className={cn(
        'flex items-center justify-between',
        'h-12 px-4 sm:px-6',
        'bg-surface-1 border-b border-surface',
        'flex-shrink-0 z-[100]',
        className
      )}
      role="banner"
    >
      {/* Left — logo + role */}
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-md bg-primary-600 flex items-center justify-center shadow-glow-primary flex-shrink-0">
          <span className="text-[9px] font-black text-white">IQ</span>
        </div>
        <div className="hidden sm:flex flex-col leading-none">
          <span className="text-[11px] font-bold text-primary-color truncate max-w-[160px]">{jobRole}</span>
          <span className="text-[10px] text-muted-color capitalize">{category}</span>
        </div>
        {usedResume && (
          <div className="hidden md:flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-[9px] font-bold uppercase tracking-wider">Resume Active</span>
          </div>
        )}
      </div>

      {/* Center — metrics */}
      <div className="flex items-center gap-4">
        {/* Timer */}
        <div
          className={cn(
            'flex items-center gap-1.5 font-mono text-sm font-bold',
            durationSec > 0 ? 'text-primary-color' : 'text-muted-color'
          )}
          aria-label={`Session duration: ${formatDuration(durationSec)}`}
          title="Session duration"
        >
          <Clock className="w-3.5 h-3.5 text-muted-color" aria-hidden="true" />
          {formatDuration(durationSec)}
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-surface-border" aria-hidden="true" />

        {/* Exchange count */}
        <div
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-color"
          aria-label={`${exchangeCount} exchanges`}
          title="Total Q&A exchanges"
        >
          <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{exchangeCount}</span>
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-surface-border hidden sm:block" aria-hidden="true" />

        {/* WS status */}
        <div
          className={cn(
            'hidden sm:flex items-center gap-1.5 text-xs font-medium',
            isConnected ? 'text-emerald-500' : isError ? 'text-rose-500' : 'text-amber-500'
          )}
          aria-live="polite"
          aria-label={`Connection: ${connectionStatus}`}
          title={`WebSocket: ${connectionStatus}`}
        >
          {isError ? (
            <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <Wifi className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              isConnected ? 'bg-emerald-500' : isError ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'
            )}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Right — end button */}
      <button
        onClick={onEndInterview}
        aria-label="End interview session"
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5',
          'text-xs font-semibold rounded-lg',
          'bg-rose-500/10 text-rose-500 border border-rose-500/30',
          'hover:bg-rose-500/20 hover:border-rose-500/50',
          'transition-colors'
        )}
      >
        <Phone className="w-3.5 h-3.5 rotate-[135deg]" aria-hidden="true" />
        <span className="hidden sm:inline">End Interview</span>
      </button>
    </header>
  );
}
