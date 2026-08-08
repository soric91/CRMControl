import { Outlet, useOutletContext, useParams } from 'react-router';
import { sitesApi } from '../../api';
import type { Site } from '../../api';
import { useCrumb } from '../../components/layout/Breadcrumbs';
import { ErrorState } from '../../components/ui/ErrorState';
import { SkeletonPanel } from '../../components/ui/Skeleton';
import { useResource } from '../../hooks/useResource';
import { useClientOutlet } from '../clients/ClientLayout';
import type { ClientOutletContext } from '../clients/ClientLayout';

export interface SiteOutletContext extends ClientOutletContext {
  site: Site;
  setSite: (site: Site) => void;
}

export function useSiteOutlet(): SiteOutletContext {
  return useOutletContext<SiteOutletContext>();
}

export function SiteLayout() {
  const parent = useClientOutlet();
  const { siteId = '' } = useParams();
  const resource = useResource(() => sitesApi.getSite(siteId), [siteId]);
  const site = resource.data;

  useCrumb(
    site
      ? {
          to: `/clients/${parent.client.id}/sites/${site.id}`,
          label: site.nombre,
        }
      : null,
  );

  if (resource.loading) {
    return (
      <div className="rounded-xl border border-line bg-surface p-5">
        <SkeletonPanel />
      </div>
    );
  }

  if (resource.error) {
    return (
      <ErrorState
        error={resource.error}
        onRetry={resource.reload}
        notFoundTitle="Esta sede no existe o no está a tu alcance"
      />
    );
  }

  if (!site) return null;

  const context: SiteOutletContext = {
    ...parent,
    site,
    setSite: resource.set,
  };
  return <Outlet context={context} />;
}
