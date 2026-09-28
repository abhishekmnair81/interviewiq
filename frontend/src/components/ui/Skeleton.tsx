/**
 * components/ui/Skeleton.tsx
 * Shimmer skeleton placeholder.
 * Use while data is loading to prevent layout shift.
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  lines?: number; /* Render N stacked lines */
}

export function Skeleton({
  width,
  height,
  rounded = false,
  lines,
  className,
  style,
  ...props
}: SkeletonProps) {
  if (lines && lines > 1) {
    return (
      <div className="flex flex-col gap-2" role="status" aria-busy="true" aria-label="Loading…">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'skeleton',
              rounded ? 'rounded-full' : 'rounded-md',
              className
            )}
            style={{
              width: i === lines - 1 ? '60%' : (width ?? '100%'),
              height: height ?? '1rem',
              ...style,
            }}
            aria-hidden="true"
          />
        ))}
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading…"
      className={cn(
        'skeleton',
        rounded ? 'rounded-full' : 'rounded-md',
        className
      )}
      style={{
        width: width ?? '100%',
        height: height ?? '1rem',
        ...style,
      }}
      {...props}
    >
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Full card skeleton for session list items */
export function CardSkeleton() {
  return (
    <div className="card p-5 space-y-3" aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton width={40} height={40} rounded />
        <div className="flex-1 space-y-2">
          <Skeleton height={14} width="60%" />
          <Skeleton height={11} width="40%" />
        </div>
        <Skeleton height={24} width={60} />
      </div>
      <Skeleton height={2} />
      <div className="grid grid-cols-3 gap-2">
        <Skeleton height={48} />
        <Skeleton height={48} />
        <Skeleton height={48} />
      </div>
    </div>
  );
}
