import { cx } from '../../lib/cx';

export interface ToggleProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  /** Hides the visible label; `label` still names the control. */
  labelHidden?: boolean;
}

export function Toggle({
  id,
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  labelHidden,
}: ToggleProps) {
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={labelHidden ? label : undefined}
        aria-describedby={description ? `${id}-description` : undefined}
        disabled={disabled}
        onClick={() => {
          onCheckedChange(!checked);
        }}
        className={cx(
          'relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full border border-transparent',
          'transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-accent' : 'bg-line-strong',
        )}
      >
        <span
          aria-hidden="true"
          className={cx(
            'pointer-events-none absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm',
            'transition-transform duration-150',
            checked && 'translate-x-4',
          )}
        />
      </button>
      {!labelHidden && (
        <div className="flex flex-col">
          <label htmlFor={id} className="text-sm font-medium text-content">
            {label}
          </label>
          {description && (
            <p id={`${id}-description`} className="text-xs text-content-subtle">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
