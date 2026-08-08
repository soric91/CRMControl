/**
 * List + pagination + loading + error, once, for every resource.
 *
 * The fetcher is read through a ref so callers can pass an inline arrow
 * without re-triggering the request; `deps` is the explicit list of things
 * that *should* re-trigger it (a parent id, a filter).
 */

import { useEffect, useRef, useState } from 'react';
import { PAGE_LIMIT_DEFAULT } from '../api';
import type { ApiError, Page, PaginationParams } from '../api';
import { asApiError } from '../lib/errors';

export interface PaginatedResource<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  /** 1-based, for display. */
  page: number;
  pageCount: number;
  loading: boolean;
  error: ApiError | null;
  goToPage: (page: number) => void;
  setLimit: (limit: number) => void;
  reload: () => void;
}

export function usePaginatedResource<T>(
  fetcher: (params: PaginationParams) => Promise<Page<T>>,
  deps: readonly unknown[] = [],
  initialLimit: number = PAGE_LIMIT_DEFAULT,
): PaginatedResource<T> {
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const [limit, setLimitState] = useState(initialLimit);
  const [offset, setOffset] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcherRef
      .current({ limit, offset })
      .then((page) => {
        if (cancelled) return;
        setItems(page.items);
        setTotal(page.total);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
        setError(asApiError(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [limit, offset, reloadToken, ...deps]);

  const pageCount = Math.max(1, Math.ceil(total / limit));

  return {
    items,
    total,
    limit,
    offset,
    page: Math.floor(offset / limit) + 1,
    pageCount,
    loading,
    error,
    goToPage: (nextPage) => {
      const clamped = Math.min(Math.max(nextPage, 1), pageCount);
      setOffset((clamped - 1) * limit);
    },
    setLimit: (nextLimit) => {
      setLimitState(nextLimit);
      // Row 300 of the old page size is meaningless under the new one.
      setOffset(0);
    },
    reload: () => {
      setReloadToken((token) => token + 1);
    },
  };
}
