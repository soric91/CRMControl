import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** The one thing that makes sense to do from here. */
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      {icon && <div className="text-content-subtle">{icon}</div>}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-content">{title}</p>
        {description && (
          <p className="max-w-md text-sm text-content-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
