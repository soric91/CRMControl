import type { ReactNode } from 'react';
import { Button } from './Button';
import { CopyValue } from './CopyValue';
import { Modal } from './Modal';

export interface RevealedField {
  label: string;
  value: string;
  /** Names the copy button, which is icon-only. */
  copyLabel: string;
}

export interface SecretRevealDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  fields: RevealedField[];
  /** Says what is lost by closing. Written for this particular secret. */
  warning: ReactNode;
  closeLabel?: string;
}

/**
 * Shows a secret the backend will never return again — a client's temporary
 * password, a gateway's credential.
 *
 * It exists once instead of twice because both flows have the same rule: the
 * value lives in the component that renders it and dies when it unmounts. It
 * is never stored, never logged and never lifted into a context.
 */
export function SecretRevealDialog({
  open,
  onClose,
  title,
  description,
  fields,
  warning,
  closeLabel = 'Ya la copié',
}: SecretRevealDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <Button variant="primary" onClick={onClose}>
          {closeLabel}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {fields.map((field) => (
          <div key={field.label} className="flex flex-col gap-1">
            <span className="text-xs font-medium tracking-wide text-content-subtle uppercase">
              {field.label}
            </span>
            <CopyValue value={field.value} label={field.copyLabel} />
          </div>
        ))}
        <p className="rounded-lg border border-warning bg-warning-soft px-3 py-2 text-sm text-warning-content">
          {warning}
        </p>
      </div>
    </Modal>
  );
}
