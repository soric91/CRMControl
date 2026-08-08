import type { InputHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';
import { Field, controlBorder, controlClassName, describedBy } from './Field';

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id'
> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  /** Right-aligns the value and uses tabular figures. */
  numeric?: boolean;
  /**
   * Known values offered as you type, without closing the field: it still
   * takes anything. For vocabularies that can grow, like the firmware's
   * `device_type`.
   */
  suggestions?: readonly string[];
}

export function Input({
  id,
  label,
  error,
  hint,
  numeric,
  suggestions,
  className,
  required,
  ...rest
}: InputProps) {
  const listId = suggestions ? `${id}-suggestions` : undefined;

  return (
    <Field id={id} label={label} error={error} hint={hint} required={required}>
      <input
        id={id}
        required={required}
        list={listId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cx(
          controlClassName,
          controlBorder(Boolean(error)),
          numeric && 'text-right tabular-nums',
          className,
        )}
        {...rest}
      />
      {suggestions && (
        <datalist id={listId}>
          {suggestions.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      )}
    </Field>
  );
}
