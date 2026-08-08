import { createPortal } from 'react-dom';
import type { Toast, ToastTone } from '../../context/ToastContext';
import { cx } from '../../lib/cx';

const TONES: Record<ToastTone, string> = {
  success: 'border-success bg-success-soft text-success-content',
  error: 'border-danger bg-danger-soft text-danger-content',
  info: 'border-accent bg-accent-soft text-accent-soft-content',
};

export interface ToastViewportProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

/** Rendered once, by `ToastProvider`. */
export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      // `polite` so a success message never interrupts what is being read.
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cx(
            'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border-l-4 px-4 py-3 shadow-lg',
            'animate-[toast-in_150ms_ease-out]',
            TONES[toast.tone],
          )}
        >
          <p className="flex-1 text-sm">{toast.message}</p>
          <button
            type="button"
            aria-label="Cerrar notificación"
            onClick={() => {
              onDismiss(toast.id);
            }}
            className="shrink-0 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100"
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
        </div>
      ))}
    </div>,
    document.body,
  );
}
