import { http } from './http';
import type {
  FleetFilters,
  Gateway,
  GatewayCreate,
  Page,
  PaginationParams,
  Site,
  SiteUpdate,
} from './types';

/** Every site the caller may see, across clients. */
export async function listSites(
  params: FleetFilters = {},
): Promise<Page<Site>> {
  const { data } = await http.get<Page<Site>>('/sites', { params });
  return data;
}

export async function getSite(siteId: string): Promise<Site> {
  const { data } = await http.get<Site>(`/sites/${siteId}`);
  return data;
}

export async function updateSite(
  siteId: string,
  payload: SiteUpdate,
): Promise<Site> {
  const { data } = await http.patch<Site>(`/sites/${siteId}`, payload);
  return data;
}

/** Cascades: the site takes its gateways, equipment and variables with it. */
export async function deleteSite(siteId: string): Promise<void> {
  await http.delete(`/sites/${siteId}`);
}

export async function listSiteGateways(
  siteId: string,
  params: PaginationParams = {},
): Promise<Page<Gateway>> {
  const { data } = await http.get<Page<Gateway>>(`/sites/${siteId}/gateways`, {
    params,
  });
  return data;
}

export async function createSiteGateway(
  siteId: string,
  payload: GatewayCreate,
): Promise<Gateway> {
  const { data } = await http.post<Gateway>(
    `/sites/${siteId}/gateways`,
    payload,
  );
  return data;
}
