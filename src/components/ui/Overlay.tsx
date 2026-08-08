/**
 * Backdrop + dialog plumbing shared by `Modal` and `Drawer`: portal, Escape,
 * click-outside, focus trap and a locked page behind it.
 */

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { cx } from '../../lib/cx';

export interface OverlayProps {
  open: boolean;
  onClose: () => void;
  /** Ties the dialog to its own heading for screen readers. */
  labelledBy: string;
  className?: string;
  children: ReactNode;
}

export function Overlay({
  open,
  onClose,
  labelledBy,
  className,
  children,
}: OverlayProps) {
  const containerRef = useFocusTrap<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-40 flex">
      <div
        // Decorative: Escape and the close button are the real affordances.
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-ink-950/50 backdrop-blur-[1px]"
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cx('relative z-10 flex flex-col bg-surface', className)}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export interface DialogHeaderProps {
  id: string;
  title: string;
  description?: string;
  onClose: () => void;
}

export function DialogHeader({
  id,
  title,
  description,
  onClose,
}: DialogHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-base font-semibold text-content">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-content-muted">{description}</p>
        )}
      </div>
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="rounded-md p-1 text-content-subtle transition-colors hover:bg-surface-muted hover:text-content"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          className="size-4"
        >
          <path d="m5 5 10 10M15 5 5 15" />
        </svg>
      </button>
    </header>
  );
}
