import { http } from './http';
import type {
  Client,
  ClientCreate,
  ClientUpdate,
  MonitorAccess,
  MonitorAccessCreated,
  Page,
  PaginationParams,
  Site,
  SiteCreate,
} from './types';

export async function listClients(
  params: PaginationParams = {},
): Promise<Page<Client>> {
  const { data } = await http.get<Page<Client>>('/clients', { params });
  return data;
}

export async function getClient(clientId: string): Promise<Client> {
  const { data } = await http.get<Client>(`/clients/${clientId}`);
  return data;
}

export async function createClient(payload: ClientCreate): Promise<Client> {
  const { data } = await http.post<Client>('/clients', payload);
  return data;
}

export async function updateClient(
  clientId: string,
  payload: ClientUpdate,
): Promise<Client> {
  const { data } = await http.patch<Client>(`/clients/${clientId}`, payload);
  return data;
}

export async function listClientSites(
  clientId: string,
  params: PaginationParams = {},
): Promise<Page<Site>> {
  const { data } = await http.get<Page<Site>>(`/clients/${clientId}/sites`, {
    params,
  });
  return data;
}

export async function createClientSite(
  clientId: string,
  payload: SiteCreate,
): Promise<Site> {
  const { data } = await http.post<Site>(`/clients/${clientId}/sites`, payload);
  return data;
}

// --- Acceso a la web de monitoreo ------------------------------------------

/** Rejects with a `not_found` ApiError when the client has no access yet. */
export async function getMonitorAccess(
  clientId: string,
): Promise<MonitorAccess> {
  const { data } = await http.get<MonitorAccess>(
    `/clients/${clientId}/monitor-access`,
  );
  return data;
}

/**
 * Grants the access. The address is the client's `contacto_email`, so this
 * fails with `business_rule_violation` when the client has none. A previously
 * revoked access is reactivated with a fresh password.
 */
export async function createMonitorAccess(
  clientId: string,
): Promise<MonitorAccessCreated> {
  const { data } = await http.post<MonitorAccessCreated>(
    `/clients/${clientId}/monitor-access`,
  );
  return data;
}

/** New one-off password. Does not change whether the access is on. */
export async function resetMonitorAccess(
  clientId: string,
): Promise<MonitorAccessCreated> {
  const { data } = await http.post<MonitorAccessCreated>(
    `/clients/${clientId}/monitor-access/reset`,
  );
  return data;
}

/** Disables the access. The row stays, so the trace of who entered stays. */
export async function revokeMonitorAccess(clientId: string): Promise<void> {
  await http.delete(`/clients/${clientId}/monitor-access`);
}
