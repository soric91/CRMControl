import type { ApiError } from '../../api';
import { Button } from './Button';

export interface ErrorStateProps {
  error: ApiError;
  onRetry?: () => void;
  /** Shown instead of the generic title when the resource is simply gone. */
  notFoundTitle?: string;
}

export function ErrorState({ error, onRetry, notFoundTitle }: ErrorStateProps) {
  const isNotFound = error.code === 'not_found';
  const title = isNotFound
    ? (notFoundTitle ?? 'No encontramos este registro')
    : 'No pudimos cargar los datos';

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 px-6 py-14 text-center"
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-content">{title}</p>
        <p className="max-w-md text-sm text-content-muted">{error.message}</p>
      </div>
      {/* A 404 or a 403 will not change on a second try. */}
      {onRetry && !isNotFound && error.code !== 'not_authorized' && (
        <Button onClick={onRetry}>Reintentar</Button>
      )}
    </div>
  );
}
