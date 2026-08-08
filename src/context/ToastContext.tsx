/** Transient notifications. The provider owns the queue and renders it. */

import { createContext, useState } from 'react';
import type { ReactNode } from 'react';
import { ToastViewport } from '../components/ui/Toast';

export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

export interface ToastContextValue {
  toasts: Toast[];
  notify: (tone: ToastTone, message: string) => void;
  dismiss: (id: number) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

/** Long enough to read a sentence, short enough not to pile up. */
const TOAST_TTL_MS = 5000;

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = (id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const value: ToastContextValue = {
    toasts,
    dismiss,
    notify: (tone, message) => {
      const id = nextId++;
      setToasts((current) => [...current, { id, tone, message }]);
      setTimeout(() => dismiss(id), TOAST_TTL_MS);
    },
  };

  return (
    <ToastContext value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext>
  );
}
