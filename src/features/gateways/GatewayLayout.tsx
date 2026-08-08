import { Outlet, useOutletContext, useParams } from 'react-router';
import { gatewaysApi } from '../../api';
import type { Gateway } from '../../api';
import { useCrumb } from '../../components/layout/Breadcrumbs';
import { ErrorState } from '../../components/ui/ErrorState';
import { SkeletonPanel } from '../../components/ui/Skeleton';
import { useResource } from '../../hooks/useResource';
import { useSiteOutlet } from '../sites/SiteLayout';
import type { SiteOutletContext } from '../sites/SiteLayout';

export interface GatewayOutletContext extends SiteOutletContext {
  gateway: Gateway;
  setGateway: (gateway: Gateway) => void;
}

export function useGatewayOutlet(): GatewayOutletContext {
  return useOutletContext<GatewayOutletContext>();
}

export function GatewayLayout() {
  const parent = useSiteOutlet();
  const { gatewayId = '' } = useParams();
  const resource = useResource(
    () => gatewaysApi.getGateway(gatewayId),
    [gatewayId],
  );
  const gateway = resource.data;

  useCrumb(
    gateway
      ? {
          to: `/clients/${parent.client.id}/sites/${parent.site.id}/gateways/${gateway.id}`,
          label: gateway.numero_serie,
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
        notFoundTitle="Este gateway no existe o no está a tu alcance"
      />
    );
  }

  if (!gateway) return null;

  const context: GatewayOutletContext = {
    ...parent,
    gateway,
    setGateway: resource.set,
  };
  return <Outlet context={context} />;
}
