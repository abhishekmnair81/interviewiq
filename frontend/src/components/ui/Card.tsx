/**
 * components/ui/Card.tsx
 * Variants: default | glass | dark | elevated
 * Supports: hover effects, padding sizes
 */

import React from 'react';
import { cn } from '@/lib/utils';

type CardVariant = 'default' | 'glass' | 'dark' | 'elevated';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  hoverable?: boolean;
  as?: React.ElementType;
}

const variantClasses: Record<CardVariant, string> = {
  default:  'card',
  glass:    'glass-card',
  dark:     'bg-neutral-900 border border-white/[0.07] rounded-xl shadow-lg',
  elevated: 'card shadow-lg',
};

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm:   'p-3',
  md:   'p-5',
  lg:   'p-7',
};

export function Card({
  variant = 'default',
  padding = 'md',
  hoverable = false,
  as: Component = 'div',
  children,
  className,
  ...props
}: CardProps) {
  return (
    <Component
      className={cn(
        variantClasses[variant],
        paddingClasses[padding],
        hoverable && 'card-hover cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

/** Convenience sub-component for a card header row */
export function CardHeader({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between pb-4 mb-4',
        'border-b border-surface',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Convenience sub-component for a card title */
export function CardTitle({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-sm font-semibold text-primary-color', className)}
      {...props}
    >
      {children}
    </h3>
  );
}
