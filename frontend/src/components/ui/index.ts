/**
 * components/ui/index.ts
 * Barrel export for all UI primitives.
 * Import from '@/components/ui' instead of individual files.
 */

export { Button } from './Button';
export type { ButtonProps } from './Button';

export { Badge } from './Badge';
export type { BadgeProps } from './Badge';

export { Card, CardHeader, CardTitle } from './Card';
export type { CardProps } from './Card';

export { Input } from './Input';
export type { InputProps } from './Input';

export { Spinner } from './Spinner';
export type { SpinnerProps } from './Spinner';

export { Skeleton, CardSkeleton } from './Skeleton';
export type { SkeletonProps } from './Skeleton';

export { EmptyState, ErrorState, LoadingState } from './EmptyState';
export type { EmptyStateProps, ErrorStateProps } from './EmptyState';

export { Modal } from './Modal';
export type { ModalProps } from './Modal';

export { ToastProvider, useToast } from './Toast';

export { Progress, ScoreRing } from './Progress';
export type { ProgressProps, ScoreRingProps } from './Progress';
