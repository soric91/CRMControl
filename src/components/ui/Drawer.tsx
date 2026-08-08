import { useId } from 'react';
import type { ReactNode } from 'react';
import { DialogHeader, Overlay } from './Overlay';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Side panel for create/edit. Deliberately not a centred modal: the list it
 * was opened from stays readable behind it.
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: DrawerProps) {
  const titleId = useId();

  return (
    <Overlay
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      className="ml-auto h-full w-full max-w-md border-l border-line shadow-2xl animate-[drawer-in_200ms_ease-out]"
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
