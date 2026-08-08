import { useState } from 'react';
import { cx } from '../../lib/cx';

export interface CopyValueProps {
  value: string;
  /** Names the copy button, which is icon-only. */
  label: string;
  className?: string;
}

/**
 * An identifier plus a copy button. These end up pasted by hand into a
 * gateway's `config.ini`, so selecting them without typos matters.
 */
export function CopyValue({ value, label, className }: CopyValueProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      // Clipboard access can be denied; the value is on screen either way.
      setCopied(false);
    }
  };

  return (
    <span className={cx('inline-flex items-start gap-1.5', className)}>
      <code className="font-mono text-xs break-all text-content">{value}</code>
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => {
          void copy();
        }}
        className="shrink-0 rounded p-0.5 text-content-subtle transition-colors hover:bg-surface-muted hover:text-content"
      >
        {copied ? (
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5 text-success"
          >
            <path d="m4 10.5 4 4 8-9" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="size-3.5"
          >
            <rect x="7" y="7" width="9" height="9" rx="2" />
            <path d="M13 4.5H6a1.5 1.5 0 0 0-1.5 1.5v7" />
          </svg>
        )}
      </button>
      {/* Announced instead of relying on the icon swap alone. */}
      <span aria-live="polite" className="sr-only">
        {copied ? 'Copiado' : ''}
      </span>
    </span>
  );
}
