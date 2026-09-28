/**
 * components/ui/Toast.tsx
 * Top-right toast stack with auto-dismiss.
 * Usage: import { useToast } from '@/components/ui/Toast'
 *        const { toast } = useToast();
 *        toast({ title: 'Saved!', variant: 'success' });
 *
 * Wrap your app with <ToastProvider /> (already done in layout).
 */

'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number; /* ms, default 4000 */
}

interface ToastContextValue {
  toast: (item: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  error:   <AlertCircle  className="w-4 h-4 text-rose-500" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  info:    <Info          className="w-4 h-4 text-sky-500" />,
};

const variantBorderClasses: Record<ToastVariant, string> = {
  success: 'border-l-4 border-emerald-500',
  error:   'border-l-4 border-rose-500',
  warning: 'border-l-4 border-amber-500',
  info:    'border-l-4 border-sky-500',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const duration = item.duration ?? 4000;

    setToasts(prev => [...prev.slice(-4), { ...item, id }]); // max 5 visible

    setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      <MotionConfig reducedMotion="user">
        {children}

        {/* Toast container */}
        <div
          aria-live="polite"
          aria-atomic="false"
          className="fixed top-4 right-4 z-[400] flex flex-col gap-2 w-80 pointer-events-none"
        >
          <AnimatePresence mode="popLayout">
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.96 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  'pointer-events-auto',
                  'bg-surface-1 rounded-xl shadow-xl',
                  'border border-surface',
                  t.variant && variantBorderClasses[t.variant]
                )}
                role="status"
              >
                <div className="flex items-start gap-3 p-4">
                  {t.variant && (
                    <div className="flex-shrink-0 mt-0.5" aria-hidden="true">
                      {icons[t.variant]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary-color">{t.title}</p>
                    {t.description && (
                      <p className="text-xs text-secondary-color mt-0.5 leading-relaxed">
                        {t.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => dismiss(t.id)}
                    aria-label="Dismiss notification"
                    className="flex-shrink-0 text-muted-color hover:text-primary-color transition-colors"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </MotionConfig>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
