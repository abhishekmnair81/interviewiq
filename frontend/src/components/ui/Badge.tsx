/**
 * components/ui/Badge.tsx
 * Variants: primary | accent | warning | error | neutral | info
 * Optional pulsing dot for live/active states
 */

import React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'primary' | 'accent' | 'warning' | 'error' | 'neutral' | 'info';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  pulse?: boolean;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: 'bg-primary-500/10 text-primary-400 border-primary-500/30 dark:bg-primary-500/15',
  accent:  'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400',
  error:   'bg-rose-500/10 text-rose-600 border-rose-500/30 dark:text-rose-400',
  neutral: 'bg-slate-500/10 text-slate-600 border-slate-500/30 dark:text-slate-400',
  info:    'bg-sky-500/10 text-sky-600 border-sky-500/30 dark:text-sky-400',
};

const dotColorClasses: Record<BadgeVariant, string> = {
  primary: 'bg-primary-500',
  accent:  'bg-emerald-500',
  warning: 'bg-amber-500',
  error:   'bg-rose-500',
  neutral: 'bg-slate-500',
  info:    'bg-sky-500',
};

export function Badge({
  variant = 'neutral',
  pulse = false,
  dot = false,
  children,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'badge',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full flex-shrink-0',
            dotColorClasses[variant],
            pulse && 'animate-pulse'
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
