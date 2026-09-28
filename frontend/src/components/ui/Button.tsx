/**
 * components/ui/Button.tsx
 * Variants: primary | secondary | ghost | danger | glow
 * Sizes: sm | md | lg
 * Supports: loading state, left/right icon, disabled, full-width
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'glow';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:   'btn btn-primary',
  secondary: 'btn btn-secondary',
  ghost:     'btn btn-ghost',
  danger:    'btn btn-danger',
  glow:      'btn btn-glow',
};

const sizeClasses: Record<Size, string> = {
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" aria-hidden="true" />
      ) : leftIcon ? (
        <span className="flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4" aria-hidden="true">
          {leftIcon}
        </span>
      ) : null}

      {children && <span>{children}</span>}

      {!loading && rightIcon && (
        <span className="flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </button>
  );
}
