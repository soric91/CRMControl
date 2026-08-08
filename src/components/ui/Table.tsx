/**
 * The one table in the app: sticky header, column sort, adjustable density,
 * optional multi-select, and a card layout below `md` where a real table
 * stops being readable.
 *
 * Sorting is client-side over the loaded page — the backend has no `order_by`
 * parameter, so the header makes that explicit in its tooltip.
 */

import { useState } from 'react';
import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

export type Density = 'comfortable' | 'compact';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Providing this makes the column sortable. */
  sortValue?: (row: T) => string | number;
  /** Right-aligns and uses tabular figures. */
  numeric?: boolean;
  /** Kept visible in the mobile card layout. Defaults to true. */
  onCard?: boolean;
}

export interface Selection {
  selected: ReadonlySet<string>;
  onChange: (selected: ReadonlySet<string>) => void;
}

export interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption: string;
  density?: Density;
  onRowClick?: (row: T) => void;
  /** Row menu, rendered in a trailing column. */
  rowActions?: (row: T) => ReactNode;
  selection?: Selection;
}

type SortState = { key: string; direction: 'asc' | 'desc' } | null;

const CELL_PADDING: Record<Density, string> = {
  comfortable: 'px-4 py-3',
  compact: 'px-3 py-1.5',
};

export function Table<T>({
  columns,
  rows,
  rowKey,
  caption,
  density = 'comfortable',
  onRowClick,
  rowActions,
  selection,
}: TableProps<T>) {
  const [sort, setSort] = useState<SortState>(null);

  const sortColumn = sort
    ? columns.find((column) => column.key === sort.key)
    : undefined;

  const sortedRows =
    sort && sortColumn?.sortValue
      ? [...rows].sort((a, b) => {
          const left = sortColumn.sortValue?.(a) ?? '';
          const right = sortColumn.sortValue?.(b) ?? '';
          const comparison =
            typeof left === 'number' && typeof right === 'number'
              ? left - right
              : String(left).localeCompare(String(right), 'es');
          return sort.direction === 'asc' ? comparison : -comparison;
        })
      : rows;

  const toggleSort = (key: string) => {
    setSort((current) =>
      current?.key === key
        ? current.direction === 'asc'
          ? { key, direction: 'desc' }
          : null
        : { key, direction: 'asc' },
    );
  };

  const allSelected =
    selection !== undefined &&
    rows.length > 0 &&
    rows.every((row) => selection.selected.has(rowKey(row)));

  const toggleAll = () => {
    if (!selection) return;
    selection.onChange(
      allSelected ? new Set() : new Set(rows.map((row) => rowKey(row))),
    );
  };

  const toggleOne = (key: string) => {
    if (!selection) return;
    const next = new Set(selection.selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    selection.onChange(next);
  };

  const padding = CELL_PADDING[density];

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 z-10 bg-surface-muted">
            <tr className="border-b border-line text-left">
              {selection && (
                <th scope="col" className={cx(padding, 'w-10')}>
                  <input
                    type="checkbox"
                    aria-label="Seleccionar todas las filas"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="size-3.5 accent-[var(--color-accent)]"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    sort?.key === column.key
                      ? sort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                  className={cx(
                    padding,
                    'text-xs font-semibold tracking-wide text-content-muted uppercase',
                    column.numeric && 'text-right',
                  )}
                >
                  {column.sortValue ? (
                    <button
                      type="button"
                      title="Ordena las filas cargadas en esta página"
                      onClick={() => {
                        toggleSort(column.key);
                      }}
                      className={cx(
                        'inline-flex items-center gap-1 transition-colors hover:text-content',
                        column.numeric && 'flex-row-reverse',
                      )}
                    >
                      {column.header}
                      <SortGlyph
                        direction={
                          sort?.key === column.key ? sort.direction : undefined
                        }
                      />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
              {rowActions && (
                <th scope="col" className={cx(padding, 'w-12')}>
                  <span className="sr-only">Acciones</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sortedRows.map((row) => {
              const key = rowKey(row);
              return (
                <tr
                  key={key}
                  onClick={
                    onRowClick
                      ? () => {
                          onRowClick(row);
                        }
                      : undefined
                  }
                  className={cx(
                    'transition-colors hover:bg-surface-muted',
                    onRowClick && 'cursor-pointer',
                    selection?.selected.has(key) && 'bg-accent-soft/40',
                  )}
                >
                  {selection && (
                    <td className={padding}>
                      <input
                        type="checkbox"
                        aria-label="Seleccionar fila"
                        checked={selection.selected.has(key)}
                        onClick={(event) => {
                          event.stopPropagation();
                        }}
                        onChange={() => {
                          toggleOne(key);
                        }}
                        className="size-3.5 accent-[var(--color-accent)]"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cx(
                        padding,
                        'text-content',
                        column.numeric && 'text-right tabular-nums',
                      )}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                  {rowActions && (
                    <td
                      className={padding}
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                    >
                      {rowActions(row)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Below md a table forces horizontal scrolling; cards do not. */}
      <ul className="divide-y divide-line md:hidden">
        {sortedRows.map((row) => {
          const key = rowKey(row);
          return (
            <li key={key} className="flex items-start gap-3 px-4 py-3">
              {selection && (
                <input
                  type="checkbox"
                  aria-label="Seleccionar fila"
                  checked={selection.selected.has(key)}
                  onChange={() => {
                    toggleOne(key);
                  }}
                  className="mt-1 size-3.5 accent-[var(--color-accent)]"
                />
              )}
              <button
                type="button"
                disabled={!onRowClick}
                onClick={
                  onRowClick
                    ? () => {
                        onRowClick(row);
                      }
                    : undefined
                }
                className="flex flex-1 flex-col gap-1.5 text-left disabled:cursor-default"
              >
                {columns
                  .filter((column) => column.onCard !== false)
                  .map((column) => (
                    <div
                      key={column.key}
                      className="flex items-baseline justify-between gap-3"
                    >
                      <span className="text-xs text-content-subtle">
                        {column.header}
                      </span>
                      <span
                        className={cx(
                          'text-sm text-content',
                          column.numeric && 'tabular-nums',
                        )}
                      >
                        {column.render(row)}
                      </span>
                    </div>
                  ))}
              </button>
              {rowActions?.(row)}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function SortGlyph({ direction }: { direction?: 'asc' | 'desc' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className={cx('size-3', !direction && 'opacity-30')}
    >
      {direction !== 'desc' && <path d="M3 5.5 6 2.5l3 3" />}
      {direction !== 'asc' && <path d="M3 6.5 6 9.5l3-3" />}
    </svg>
  );
}

export interface DensityToggleProps {
  density: Density;
  onChange: (density: Density) => void;
}

export function DensityToggle({ density, onChange }: DensityToggleProps) {
  return (
    <div className="inline-flex rounded-md border border-line-strong p-0.5">
      {(['comfortable', 'compact'] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={density === option}
          onClick={() => {
            onChange(option);
          }}
          className={cx(
            'rounded px-2 py-1 text-xs transition-colors',
            density === option
              ? 'bg-accent-soft text-accent-soft-content'
              : 'text-content-muted hover:text-content',
          )}
        >
          {option === 'comfortable' ? 'Cómoda' : 'Compacta'}
        </button>
      ))}
    </div>
  );
}
