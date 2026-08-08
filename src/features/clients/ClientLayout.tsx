import { Outlet, useOutletContext, useParams } from 'react-router';
import { clientsApi } from '../../api';
import type { Client } from '../../api';
import { useCrumb } from '../../components/layout/Breadcrumbs';
import { ErrorState } from '../../components/ui/ErrorState';
import { SkeletonPanel } from '../../components/ui/Skeleton';
import { useResource } from '../../hooks/useResource';

export interface ClientOutletContext {
  client: Client;
  /** Swaps the cached client after an edit, without a round trip. */
  setClient: (client: Client) => void;
}

export function useClientOutlet(): ClientOutletContext {
  return useOutletContext<ClientOutletContext>();
}

/**
 * Owns the client for every screen below it and contributes its breadcrumb,
 * so a deep page never has to re-fetch its ancestors.
 */
export function ClientLayout() {
  const { clientId = '' } = useParams();
  const resource = useResource(
    () => clientsApi.getClient(clientId),
    [clientId],
  );
  const client = resource.data;

  useCrumb(
    client
      ? { to: `/clients/${client.id}`, label: client.nombre_empresa }
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
        notFoundTitle="Este cliente no existe o no está a tu alcance"
      />
    );
  }

  if (!client) return null;

  const context: ClientOutletContext = { client, setClient: resource.set };
  return <Outlet context={context} />;
}
