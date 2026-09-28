/**
 * components/ui/Progress.tsx
 * Linear progress bar + circular ring variants.
 * Uses CSS animation for the ring fill on mount.
 */

import React from 'react';
import { cn } from '@/lib/utils';

/* ── Linear Progress ─────────────────────────────────────────── */

type ProgressColor = 'primary' | 'accent' | 'warning' | 'error';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; /* 0–100 */
  max?: number;
  color?: ProgressColor;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
}

const colorClasses: Record<ProgressColor, string> = {
  primary: 'bg-primary-500',
  accent:  'bg-emerald-500',
  warning: 'bg-amber-500',
  error:   'bg-rose-500',
};

const sizeClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

export function Progress({
  value,
  max = 100,
  color = 'primary',
  size = 'md',
  showLabel = false,
  label,
  animated = true,
  className,
  ...props
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('w-full', className)} {...props}>
      {(label || showLabel) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-xs font-medium text-secondary-color">{label}</span>
          )}
          {showLabel && (
            <span className="text-xs font-mono font-bold text-primary-color">
              {Math.round(pct)}%
            </span>
          )}
        </div>
      )}

      <div
        className={cn('w-full bg-surface-2 rounded-full overflow-hidden', sizeClasses[size])}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            'h-full rounded-full',
            colorClasses[color],
            animated && 'transition-all duration-500 ease-out'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ── Circular Score Ring ─────────────────────────────────────── */

export interface ScoreRingProps {
  score: number;        /* 0–100 */
  size?: number;        /* px, default 80 */
  strokeWidth?: number; /* default 6 */
  color?: string;       /* stroke color, default primary-500 */
  label?: string;       /* center label override, defaults to score */
  className?: string;
}

export function ScoreRing({
  score,
  size = 80,
  strokeWidth = 6,
  color,
  label,
  className,
}: ScoreRingProps) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  // Color defaults based on score if not overridden
  const strokeColor = color ?? (
    score >= 85 ? '#10b981' :
    score >= 70 ? '#6366f1' :
    score >= 55 ? '#f59e0b' :
    '#f43f5e'
  );

  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={strokeWidth}
        />
        {/* Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-mono font-bold text-primary-color"
          style={{ fontSize: size * 0.22 }}
        >
          {label ?? Math.round(score)}
        </span>
      </div>
    </div>
  );
}
