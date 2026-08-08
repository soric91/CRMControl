/**
 * The single-entity counterpart of {@link usePaginatedResource}: one fetch,
 * loading, error, reload. Detail pages and the breadcrumb trail use it.
 */

import { useEffect, useRef, useState } from 'react';
import type { ApiError } from '../api';
import { asApiError } from '../lib/errors';

export interface Resource<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  /** Replaces the cached entity, e.g. after a successful edit. */
  set: (value: T) => void;
  reload: () => void;
}

export function useResource<T>(
  fetcher: () => Promise<T>,
  deps: readonly unknown[] = [],
): Resource<T> {
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcherRef
      .current()
      .then((value) => {
        if (!cancelled) setData(value);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setData(null);
        setError(asApiError(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken, ...deps]);

  return {
    data,
    loading,
    error,
    set: setData,
    reload: () => {
      setReloadToken((token) => token + 1);
    },
  };
}
