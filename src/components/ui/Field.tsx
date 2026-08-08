import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

export interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Label, control and message, wired together so the error is announced with
 * the input instead of just sitting next to it.
 */
export function Field({
  id,
  label,
  error,
  hint,
  required,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-content">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-danger">
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-content-subtle">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** Shared visual for every control that looks like a text box. */
export const controlClassName =
  'w-full rounded-md border bg-surface px-3 py-2 text-sm text-content ' +
  'placeholder:text-content-subtle transition-colors ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

export function controlBorder(hasError: boolean): string {
  return hasError
    ? 'border-danger'
    : 'border-line-strong hover:border-content-subtle';
}

export function describedBy(id: string, error?: string, hint?: string) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}
