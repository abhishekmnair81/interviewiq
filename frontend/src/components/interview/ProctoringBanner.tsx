/**
 * components/interview/ProctoringBanner.tsx
 * Full-screen overlay for proctoring violations.
 * Tab switch: rose overlay with countdown
 * Copy-paste: subtle top banner toast
 */

'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clipboard } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Tab Switch Overlay ───────────────────────────────────────── */

export interface TabSwitchOverlayProps {
  visible: boolean;
  switchCount: number;
  maxSwitches?: number;
  onDismiss?: () => void;
}

export function TabSwitchOverlay({
  visible,
  switchCount,
  maxSwitches = 3,
  onDismiss,
}: TabSwitchOverlayProps) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!visible) {
      setCountdown(5);
      return;
    }
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onDismiss?.();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [visible, onDismiss]);

  const isWarning = switchCount < maxSwitches;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'fixed inset-0 z-[500] flex items-center justify-center p-6',
            isWarning ? 'bg-amber-900/80' : 'bg-rose-900/80',
            'backdrop-blur-md'
          )}
          role="alertdialog"
          aria-modal="true"
          aria-label={isWarning ? 'Tab switch warning' : 'Interview terminated'}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95 }}
            className="glass-card p-8 max-w-sm w-full text-center shadow-2xl"
          >
            <div
              className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl',
                isWarning ? 'bg-amber-500/15' : 'bg-rose-500/15'
              )}
              aria-hidden="true"
            >
              <AlertTriangle
                className={cn('w-8 h-8', isWarning ? 'text-amber-400' : 'text-rose-400')}
              />
            </div>

            <h2 className="text-lg font-bold text-primary-color mb-2">
              {isWarning ? 'Tab Switch Detected!' : 'Interview Terminated'}
            </h2>
            <p className="text-sm text-secondary-color mb-1 leading-relaxed">
              {isWarning
                ? `You have switched tabs ${switchCount} of ${maxSwitches} allowed times. Please stay on this page.`
                : 'Your interview has been terminated due to repeated tab switching.'}
            </p>

            {isWarning && (
              <p className="text-xs text-muted-color mt-4">
                Returning in{' '}
                <span
                  className={cn(
                    'font-mono font-bold text-lg',
                    countdown <= 2 ? 'text-rose-400' : 'text-amber-400'
                  )}
                  aria-live="polite"
                >
                  {countdown}
                </span>
                …
              </p>
            )}

            <div
              className={cn(
                'mt-4 h-1 rounded-full overflow-hidden',
                isWarning ? 'bg-amber-500/20' : 'bg-rose-500/20'
              )}
              aria-hidden="true"
            >
              <motion.div
                className={cn('h-full', isWarning ? 'bg-amber-500' : 'bg-rose-500')}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5, ease: 'linear' }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Copy-Paste Toast Banner ──────────────────────────────────── */

export interface CopyPasteBannerProps {
  visible: boolean;
}

export function CopyPasteBanner({ visible }: CopyPasteBannerProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            'fixed top-16 left-1/2 -translate-x-1/2 z-[400]',
            'flex items-center gap-2 px-4 py-2.5 rounded-full',
            'bg-amber-500/10 border border-amber-500/20 backdrop-blur-md',
            'shadow-lg'
          )}
          role="alert"
          aria-live="assertive"
        >
          <Clipboard className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" aria-hidden="true" />
          <span className="text-xs font-semibold text-amber-300">
            Copy-paste detected — this session is monitored
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
