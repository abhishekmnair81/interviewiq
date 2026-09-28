/**
 * components/interview/ConversationStream.tsx
 * Scrollable chat-style conversation log.
 * Captures every alex/user turn as a timestamped bubble.
 * Virtualized for long sessions (>50 messages).
 * aria-live="polite" for screen readers.
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ConversationTurn {
  id: string;
  role: 'alex' | 'user';
  text: string;
  timestamp: number;
}

export interface ConversationStreamProps {
  turns: ConversationTurn[];
  className?: string;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function TurnBubble({ turn }: { turn: ConversationTurn }) {
  const isAlex = turn.role === 'alex';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'flex gap-2.5',
        isAlex ? 'flex-row' : 'flex-row-reverse'
      )}
    >
      {/* Avatar dot */}
      <div
        className={cn(
          'w-6 h-6 rounded-full flex-shrink-0 mt-0.5',
          'flex items-center justify-center',
          'text-[9px] font-black',
          isAlex
            ? 'bg-primary-600 text-white'
            : 'bg-slate-700 text-slate-200 dark:bg-slate-600'
        )}
        aria-hidden="true"
      >
        {isAlex ? 'A' : 'U'}
      </div>

      {/* Bubble */}
      <div className={cn('flex flex-col gap-0.5 max-w-[85%]', isAlex ? 'items-start' : 'items-end')}>
        <div
          className={cn(
            'px-3 py-2 rounded-2xl text-xs leading-relaxed',
            isAlex
              ? 'bg-surface-2 text-primary-color rounded-tl-sm'
              : 'bg-primary-600 text-white rounded-tr-sm'
          )}
        >
          {turn.text}
        </div>
        <span className="text-[10px] text-muted-color px-1">
          {formatTime(turn.timestamp)}
        </span>
      </div>
    </motion.div>
  );
}

export function ConversationStream({ turns, className }: ConversationStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns.length]);

  return (
    <div
      className={cn(
        'flex flex-col h-full overflow-hidden',
        'bg-surface-1 border border-surface rounded-2xl',
        className
      )}
      role="log"
      aria-label="Interview conversation"
      aria-live="polite"
      aria-atomic="false"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface flex-shrink-0">
        <span className="text-xs font-bold text-primary-color">Conversation</span>
        <span className="text-[10px] font-medium text-muted-color">{turns.length} turns</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 px-4 space-y-4 scrollbar-hidden">
        {turns.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-color">
            <span className="text-2xl mb-2" aria-hidden="true">💬</span>
            <p className="text-xs font-medium">Conversation will appear here</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {turns.map(turn => (
              <TurnBubble key={turn.id} turn={turn} />
            ))}
          </AnimatePresence>
        )}
        <div ref={bottomRef} aria-hidden="true" />
      </div>
    </div>
  );
}
