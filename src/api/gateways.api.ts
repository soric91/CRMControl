import { http } from './http';
import type {
  Equipment,
  FleetFilters,
  GatewayConfigStatus,
  EquipmentCreate,
  Gateway,
  GatewayUpdate,
  Page,
  PaginationParams,
} from './types';

/**
 * Every gateway the caller may see, across clients and sites. This is what
 * answers "which of my gateways are down right now" without walking the tree.
 */
export async function listGateways(
  params: FleetFilters = {},
): Promise<Page<Gateway>> {
  const { data } = await http.get<Page<Gateway>>('/gateways', { params });
  return data;
}

export async function getGateway(gatewayId: string): Promise<Gateway> {
  const { data } = await http.get<Gateway>(`/gateways/${gatewayId}`);
  return data;
}

export async function updateGateway(
  gatewayId: string,
  payload: GatewayUpdate,
): Promise<Gateway> {
  const { data } = await http.patch<Gateway>(`/gateways/${gatewayId}`, payload);
  return data;
}

/** Whether the device is running what is configured for it, and since when. */
export async function getGatewayConfigStatus(
  gatewayId: string,
): Promise<GatewayConfigStatus> {
  const { data } = await http.get<GatewayConfigStatus>(
    `/gateways/${gatewayId}/config-status`,
  );
  return data;
}

/** Cascades: the gateway takes its equipment and their variables with it. */
export async function deleteGateway(gatewayId: string): Promise<void> {
  await http.delete(`/gateways/${gatewayId}`);
}

export async function listGatewayEquipment(
  gatewayId: string,
  params: PaginationParams = {},
): Promise<Page<Equipment>> {
  const { data } = await http.get<Page<Equipment>>(
    `/gateways/${gatewayId}/equipment`,
    { params },
  );
  return data;
}

export async function createGatewayEquipment(
  gatewayId: string,
  payload: EquipmentCreate,
): Promise<Equipment> {
  const { data } = await http.post<Equipment>(
    `/gateways/${gatewayId}/equipment`,
    payload,
  );
  return data;
}
