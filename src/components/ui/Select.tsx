import type { SelectHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';
import { Field, controlBorder, controlClassName, describedBy } from './Field';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  /**
   * El encabezado bajo el que se lista. Las opciones que lo comparten tienen
   * que venir juntas: el orden del arreglo es el del desplegable, y reordenar
   * acá haría que la lista no siga al catálogo que la produjo.
   */
  group?: string;
}

export interface SelectProps<T extends string> extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'id' | 'value' | 'onChange'
> {
  id: string;
  label: string;
  value: T;
  options: readonly SelectOption<T>[];
  onValueChange: (value: T) => void;
  error?: string;
  hint?: string;
}

/**
 * A "no filter" entry is just an option whose value is `''` — the caller
 * widens the type parameter to `Something | ''` and the union still keeps the
 * label maps honest.
 */
export function Select<T extends string>({
  id,
  label,
  value,
  options,
  onValueChange,
  error,
  hint,
  className,
  required,
  ...rest
}: SelectProps<T>) {
  return (
    <Field id={id} label={label} error={error} hint={hint} required={required}>
      <div className="relative">
        <select
          id={id}
          value={value}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          onChange={(event) => {
            const selected = options.find(
              (option) => option.value === event.target.value,
            );
            if (selected) onValueChange(selected.value);
          }}
          className={cx(
            controlClassName,
            controlBorder(Boolean(error)),
            'appearance-none pr-9',
            className,
          )}
          {...rest}
        >
          {agrupar(options).map((grupo) =>
            grupo.label === null ? (
              grupo.options.map(renderOption)
            ) : (
              <optgroup key={grupo.label} label={grupo.label}>
                {grupo.options.map(renderOption)}
              </optgroup>
            ),
          )}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-content-subtle"
        >
          <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Field>
  );
}

function renderOption<T extends string>(option: SelectOption<T>) {
  return (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  );
}

/**
 * Corta la lista en tramos por `group`, respetando el orden recibido.
 *
 * Un tramo sin encabezado (`null`) se dibuja suelto, así una lista sin grupos
 * —la mayoría— sale exactamente como antes.
 */
function agrupar<T extends string>(
  options: readonly SelectOption<T>[],
): { label: string | null; options: SelectOption<T>[] }[] {
  const grupos: { label: string | null; options: SelectOption<T>[] }[] = [];
  for (const option of options) {
    const label = option.group ?? null;
    const ultimo = grupos[grupos.length - 1];
    if (ultimo !== undefined && ultimo.label === label) {
      ultimo.options.push(option);
      continue;
    }
    grupos.push({ label, options: [option] });
  }
  return grupos;
}

/** Builds options from a literal-union const array plus its label map. */
export function optionsFrom<T extends string>(
  values: readonly T[],
  labels: Record<T, string>,
): SelectOption<T>[] {
  return values.map((value) => ({ value, label: labels[value] }));
}
