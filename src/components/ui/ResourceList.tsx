/**
 * A paginated list, with the four states every list has: loading, error,
 * empty, and rows. Every listing screen in the app is this component plus a
 * column definition.
 */

import { useState } from 'react';
import type { ReactNode } from 'react';
import type { PaginatedResource } from '../../hooks/usePaginatedResource';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { Pagination } from './Pagination';
import { SkeletonTable } from './Skeleton';
import { DensityToggle, Table } from './Table';
import type { Column, Density, Selection } from './Table';

export interface ResourceListProps<T> {
  resource: PaginatedResource<T>;
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /** Describes the table for screen readers. */
  caption: string;
  title?: ReactNode;
  toolbar?: ReactNode;
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => ReactNode;
  /** Enables the checkbox column. Only worth it with a bulk action. */
  selection?: Selection;
}

export function ResourceList<T>({
  resource,
  columns,
  rowKey,
  caption,
  title,
  toolbar,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onRowClick,
  rowActions,
  selection,
}: ResourceListProps<T>) {
  const [density, setDensity] = useState<Density>('comfortable');

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface">
      {(title || toolbar) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="text-sm font-semibold text-content">{title}</div>
          <div className="flex items-center gap-2">
            {toolbar}
            <DensityToggle density={density} onChange={setDensity} />
          </div>
        </header>
      )}

      {resource.loading ? (
        <SkeletonTable columns={Math.min(columns.length, 5)} />
      ) : resource.error ? (
        <ErrorState error={resource.error} onRetry={resource.reload} />
      ) : resource.items.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      ) : (
        <>
          <Table
            columns={columns}
            rows={resource.items}
            rowKey={rowKey}
            caption={caption}
            density={density}
            onRowClick={onRowClick}
            rowActions={rowActions}
            selection={selection}
          />
          {resource.total > resource.limit && (
            <Pagination
              page={resource.page}
              pageCount={resource.pageCount}
              total={resource.total}
              limit={resource.limit}
              onPageChange={resource.goToPage}
              onLimitChange={resource.setLimit}
            />
          )}
        </>
      )}
    </section>
  );
}
