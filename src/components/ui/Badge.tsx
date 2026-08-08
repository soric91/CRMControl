import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral' | 'accent';

const TONES: Record<BadgeTone, string> = {
  success: 'bg-success-soft text-success-content',
  warning: 'bg-warning-soft text-warning-content',
  danger: 'bg-danger-soft text-danger-content',
  neutral: 'bg-neutral-soft text-neutral-content',
  accent: 'bg-accent-soft text-accent-soft-content',
};

const DOTS: Record<BadgeTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-content-subtle',
  accent: 'bg-accent',
};

export interface BadgeProps {
  tone: BadgeTone;
  children: ReactNode;
  /** Shows a status dot — used for live states like a gateway's. */
  dot?: boolean;
  className?: string;
}

export function Badge({ tone, children, dot, className }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cx('size-1.5 rounded-full', DOTS[tone])}
        />
      )}
      {children}
    </span>
  );
}
