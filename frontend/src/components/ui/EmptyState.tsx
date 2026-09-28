/**
 * components/ui/EmptyState.tsx
 * Every list/panel has a designed empty state — never a blank div.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button, type ButtonProps } from './Button';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    variant?: ButtonProps['variant'];
  };
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-16 px-6',
        className
      )}
      {...props}
    >
      {icon && (
        <div
          className={cn(
            'flex items-center justify-center rounded-2xl mb-5',
            compact ? 'w-12 h-12' : 'w-16 h-16',
            'bg-surface-2 text-muted-color [&>svg]:w-7 [&>svg]:h-7'
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}

      <h3
        className={cn(
          'font-semibold text-primary-color mb-2',
          compact ? 'text-sm' : 'text-base'
        )}
      >
        {title}
      </h3>

      {description && (
        <p
          className={cn(
            'text-secondary-color max-w-sm leading-relaxed',
            compact ? 'text-xs' : 'text-sm'
          )}
        >
          {description}
        </p>
      )}

      {action && (
        <div className="mt-6">
          {action.href ? (
            <a href={action.href}>
              <Button variant={action.variant ?? 'primary'} size="sm">
                {action.label}
              </Button>
            </a>
          ) : (
            <Button
              variant={action.variant ?? 'primary'}
              size="sm"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Error state with retry button */
export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-6',
        className
      )}
      role="alert"
      {...props}
    >
      <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4">
        <span className="text-2xl" aria-hidden="true">⚠️</span>
      </div>
      <h3 className="text-sm font-semibold text-primary-color mb-2">{title}</h3>
      <p className="text-xs text-secondary-color max-w-sm mb-5">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Loading state — full panel centered spinner */
export function LoadingState({
  message = 'Loading…',
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 gap-4',
        className
      )}
      role="status"
      aria-label={message}
    >
      <div className="w-8 h-8 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin" aria-hidden="true" />
      <p className="text-xs text-muted-color font-medium">{message}</p>
    </div>
  );
}
