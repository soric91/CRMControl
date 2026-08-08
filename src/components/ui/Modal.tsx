import { useId } from 'react';
import type { ReactNode } from 'react';
import { DialogHeader, Overlay } from './Overlay';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Centred dialog. Forms use `Drawer` instead, so the list stays visible. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: ModalProps) {
  const titleId = useId();

  return (
    <Overlay
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      className="m-auto max-h-[90vh] w-full max-w-lg rounded-xl border border-line shadow-2xl"
    >
      <DialogHeader
        id={titleId}
        title={title}
        description={description}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      {footer && (
        <footer className="flex justify-end gap-2 border-t border-line px-5 py-4">
          {footer}
        </footer>
      )}
    </Overlay>
  );
}
