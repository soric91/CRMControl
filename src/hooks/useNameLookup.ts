/**
 * Ids into names, for the screens that show rows from one resource but have to
 * label them with another's.
 *
 * The listings carry foreign keys and nothing else — a gateway knows its
 * `site_id`, not what the site is called — so the table would otherwise print
 * UUIDs. One page is enough to label a screenful; past `PAGE_LIMIT_MAX` rows
 * the missing ones fall back to the id rather than lying.
 */

import { PAGE_LIMIT_MAX } from '../api';
import type { Page } from '../api';
import { useResource } from './useResource';

export interface NameLookup<T> {
  names: Map<string, string>;
  items: T[];
  loading: boolean;
}

export function useNameLookup<T>(
  fetcher: (limit: number) => Promise<Page<T>>,
  identify: (item: T) => string,
  describe: (item: T) => string,
  deps: readonly unknown[] = [],
): NameLookup<T> {
  const resource = useResource(() => fetcher(PAGE_LIMIT_MAX), deps);
  const items = resource.data?.items ?? [];

  return {
    items,
    loading: resource.loading,
    names: new Map(items.map((item) => [identify(item), describe(item)])),
  };
}
