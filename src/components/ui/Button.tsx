import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../../lib/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-contrast hover:bg-accent-hover border border-transparent',
  secondary:
    'bg-surface text-content border border-line-strong hover:bg-surface-muted',
  ghost:
    'bg-transparent text-content-muted border border-transparent hover:bg-surface-muted hover:text-content',
  danger:
    'bg-danger text-white hover:bg-danger-hover border border-transparent dark:text-ink-950',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9.5 px-4 text-sm gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Decorative glyph; the accessible name comes from the label or aria-label. */
  icon?: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap',
        'transition-colors disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

/** Only used inside a button, where the busy state is already announced. */
function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

export interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  /** Required: the button has no text of its own. */
  label: string;
}

export function IconButton({ label, className, ...rest }: IconButtonProps) {
  return (
    <Button
      aria-label={label}
      title={label}
      className={cx('!px-0 aspect-square', className)}
      {...rest}
    />
  );
}
