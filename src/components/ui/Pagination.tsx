import { PAGE_LIMIT_MAX } from '../../api';
import { formatNumber } from '../../lib/formatters';
import { IconButton } from './Button';

/** Page sizes offered in the picker; all within the backend's 1..200. */
const PAGE_SIZES = [25, 50, 100] as const;

export interface PaginationProps {
  page: number;
  pageCount: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export function Pagination({
  page,
  pageCount,
  total,
  limit,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  const first = total === 0 ? 0 : (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3"
    >
      <p className="text-xs text-content-muted tabular-nums">
        {formatNumber(first)}–{formatNumber(last)} de {formatNumber(total)}
      </p>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-content-muted">
          Por página
          <select
            value={limit}
            onChange={(event) => {
              const next = Number(event.target.value);
              onLimitChange(Math.min(next, PAGE_LIMIT_MAX));
            }}
            className="rounded-md border border-line-strong bg-surface px-2 py-1 text-xs text-content"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <IconButton
            label="Página anterior"
            size="sm"
            disabled={page <= 1}
            onClick={() => {
              onPageChange(page - 1);
            }}
            icon={<Chevron direction="left" />}
          />
          <span className="px-2 text-xs text-content-muted tabular-nums">
            {page} / {pageCount}
          </span>
          <IconButton
            label="Página siguiente"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => {
              onPageChange(page + 1);
            }}
            icon={<Chevron direction="right" />}
          />
        </div>
      </div>
    </nav>
  );
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d={direction === 'left' ? 'M12 5 7 10l5 5' : 'M8 5l5 5-5 5'} />
    </svg>
  );
}
