import { cx } from '../../lib/cx';

export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cx('animate-pulse rounded bg-surface-muted', className)}
    />
  );
}

export interface SkeletonTableProps {
  rows?: number;
  columns: number;
}

/** Placeholder that keeps the table's shape while the page loads. */
export function SkeletonTable({ rows = 6, columns }: SkeletonTableProps) {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="divide-y divide-line border-t border-line"
    >
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 px-4 py-3.5">
          {Array.from({ length: columns }, (_, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={cx(
                'h-4',
                columnIndex === 0 ? 'w-1/4' : 'flex-1 max-w-40',
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Placeholder for a detail panel: a title and a few key/value rows. */
export function SkeletonPanel({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Cargando" className="flex flex-col gap-3">
      <Skeleton className="h-5 w-40" />
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex gap-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-48" />
        </div>
      ))}
    </div>
  );
}
