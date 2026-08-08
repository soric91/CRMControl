/**
 * The hierarchy trail: Cliente → Sede → Gateway → Equipo.
 *
 * Each nested layout route registers its own crumb once it knows the entity's
 * name, so no screen has to re-fetch its ancestors just to draw the path.
 * Crumbs are ordered by path depth, which for nested routes is their order.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, Outlet } from 'react-router';
import { IconChevronRight } from '../ui/Icon';

export interface Crumb {
  /** Absolute path of the crumb; also its identity in the trail. */
  to: string;
  label: string;
}

interface CrumbRegistry {
  register: (crumb: Crumb) => () => void;
}

const RegistryContext = createContext<CrumbRegistry | null>(null);
const TrailContext = createContext<Crumb[]>([]);

function depth(path: string): number {
  return path.split('/').filter(Boolean).length;
}

export function BreadcrumbsProvider({ children }: { children: ReactNode }) {
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);

  // Built once so the registry identity never changes and the effects in
  // `useCrumb` do not re-run on every render.
  const [registry] = useState<CrumbRegistry>(() => ({
    register: (crumb) => {
      setCrumbs((current) =>
        [...current.filter((item) => item.to !== crumb.to), crumb].sort(
          (a, b) => depth(a.to) - depth(b.to),
        ),
      );
      return () => {
        setCrumbs((current) => current.filter((item) => item.to !== crumb.to));
      };
    },
  }));

  return (
    <RegistryContext value={registry}>
      <TrailContext value={crumbs}>{children}</TrailContext>
    </RegistryContext>
  );
}

/** Adds a crumb while the calling route is mounted. `null` adds nothing. */
export function useCrumb(crumb: Crumb | null): void {
  const registry = useContext(RegistryContext);
  const to = crumb?.to;
  const label = crumb?.label;

  useEffect(() => {
    if (!registry || !to || !label) return;
    return registry.register({ to, label });
  }, [registry, to, label]);
}

/** Layout route whose only job is to contribute a fixed crumb. */
export function CrumbRoute({ to, label }: Crumb) {
  useCrumb({ to, label });
  return <Outlet />;
}

export function Breadcrumbs() {
  const crumbs = useContext(TrailContext);
  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Ruta de navegación">
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={crumb.to} className="flex items-center gap-1">
              {index > 0 && (
                <IconChevronRight className="size-3.5 text-content-subtle" />
              )}
              {isLast ? (
                <span aria-current="page" className="font-medium text-content">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.to}
                  className="rounded text-content-muted transition-colors hover:text-content"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
