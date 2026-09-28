/**
 * components/layout/Container.tsx
 * Responsive max-width container with 8pt padding.
 */

import React from 'react';
import { cn } from '@/lib/utils';

type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: ContainerSize;
  as?: React.ElementType;
}

const sizeClasses: Record<ContainerSize, string> = {
  sm:   'max-w-2xl',
  md:   'max-w-3xl',
  lg:   'max-w-5xl',
  xl:   'max-w-7xl',
  '2xl':'max-w-screen-2xl',
  full: 'max-w-none',
};

export function Container({
  size = 'xl',
  as: Component = 'div',
  children,
  className,
  ...props
}: ContainerProps) {
  return (
    <Component
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * components/layout/Stack.tsx
 * Vertical or horizontal stack with consistent gap tokens.
 */

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'vertical' | 'horizontal';
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean;
  as?: React.ElementType;
}

const gapClasses: Record<number, string> = {
  1: 'gap-1', 2: 'gap-2', 3: 'gap-3', 4: 'gap-4',
  5: 'gap-5', 6: 'gap-6', 8: 'gap-8', 10: 'gap-10', 12: 'gap-12',
};

const alignClasses = {
  start: 'items-start', center: 'items-center',
  end: 'items-end', stretch: 'items-stretch',
};

const justifyClasses = {
  start: 'justify-start', center: 'justify-center',
  end: 'justify-end', between: 'justify-between', around: 'justify-around',
};

export function Stack({
  direction = 'vertical',
  gap = 4,
  align = 'stretch',
  justify = 'start',
  wrap = false,
  as: Component = 'div',
  children,
  className,
  ...props
}: StackProps) {
  return (
    <Component
      className={cn(
        'flex',
        direction === 'vertical' ? 'flex-col' : 'flex-row',
        gapClasses[gap],
        alignClasses[align],
        justifyClasses[justify],
        wrap && 'flex-wrap',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * components/layout/Grid.tsx
 * Responsive CSS grid helper.
 */

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 6 | 12;
  smCols?: 1 | 2 | 3 | 4 | 6;
  mdCols?: 1 | 2 | 3 | 4 | 6;
  lgCols?: 1 | 2 | 3 | 4 | 6;
  gap?: 2 | 3 | 4 | 5 | 6 | 8;
}

const colsMap: Record<number, string> = {
  1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3',
  4: 'grid-cols-4', 6: 'grid-cols-6', 12: 'grid-cols-12',
};
const smColsMap: Record<number, string> = {
  1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4', 6: 'sm:grid-cols-6',
};
const mdColsMap: Record<number, string> = {
  1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3',
  4: 'md:grid-cols-4', 6: 'md:grid-cols-6',
};
const lgColsMap: Record<number, string> = {
  1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4', 6: 'lg:grid-cols-6',
};
const gapMap: Record<number, string> = {
  2: 'gap-2', 3: 'gap-3', 4: 'gap-4', 5: 'gap-5', 6: 'gap-6', 8: 'gap-8',
};

export function Grid({
  cols = 1,
  smCols,
  mdCols,
  lgCols,
  gap = 4,
  children,
  className,
  ...props
}: GridProps) {
  return (
    <div
      className={cn(
        'grid',
        colsMap[cols],
        smCols && smColsMap[smCols],
        mdCols && mdColsMap[mdCols],
        lgCols && lgColsMap[lgCols],
        gapMap[gap],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
