import { http } from './http';
import type {
  Equipment,
  FleetFilters,
  EquipmentUpdate,
  Page,
  PaginationParams,
  Variable,
  VariableCreate,
} from './types';

/** Every Modbus device the caller may see, across gateways. */
export async function listEquipment(
  params: FleetFilters = {},
): Promise<Page<Equipment>> {
  const { data } = await http.get<Page<Equipment>>('/equipment', { params });
  return data;
}

export async function getEquipment(equipmentId: string): Promise<Equipment> {
  const { data } = await http.get<Equipment>(`/equipment/${equipmentId}`);
  return data;
}

export async function updateEquipment(
  equipmentId: string,
  payload: EquipmentUpdate,
): Promise<Equipment> {
  const { data } = await http.patch<Equipment>(
    `/equipment/${equipmentId}`,
    payload,
  );
  return data;
}

/** Cascades: the equipment takes its variables with it. */
export async function deleteEquipment(equipmentId: string): Promise<void> {
  await http.delete(`/equipment/${equipmentId}`);
}

export async function listEquipmentVariables(
  equipmentId: string,
  params: PaginationParams = {},
): Promise<Page<Variable>> {
  const { data } = await http.get<Page<Variable>>(
    `/equipment/${equipmentId}/variables`,
    { params },
  );
  return data;
}

export async function createEquipmentVariable(
  equipmentId: string,
  payload: VariableCreate,
): Promise<Variable> {
  const { data } = await http.post<Variable>(
    `/equipment/${equipmentId}/variables`,
    payload,
  );
  return data;
}
