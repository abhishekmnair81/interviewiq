/**
 * components/ui/Spinner.tsx
 * Sizes: sm | md | lg  |  Colors: primary | accent | white | muted
 */

import React from 'react';
import { cn } from '@/lib/utils';

type SpinnerSize = 'sm' | 'md' | 'lg';
type SpinnerColor = 'primary' | 'accent' | 'white' | 'muted';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
  color?: SpinnerColor;
  label?: string; /* Accessible label (sr-only) */
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-[3px]',
};

const colorClasses: Record<SpinnerColor, string> = {
  primary: 'border-primary-500/30 border-t-primary-500',
  accent:  'border-emerald-500/30 border-t-emerald-500',
  white:   'border-white/30 border-t-white',
  muted:   'border-slate-400/30 border-t-slate-400',
};

export function Spinner({
  size = 'md',
  color = 'primary',
  label = 'Loading…',
  className,
  ...props
}: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn('flex items-center justify-center', className)}
      {...props}
    >
      <div
        className={cn(
          'rounded-full animate-spin',
          sizeClasses[size],
          colorClasses[color]
        )}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
