import { http } from './http';
import type {
  Page,
  PaginationParams,
  Tariff,
  TariffCreate,
  TariffUpdate,
} from './types';

/** Newest period first: that is the one being consulted most of the time. */
export async function listTariffs(
  params: PaginationParams = {},
): Promise<Page<Tariff>> {
  const { data } = await http.get<Page<Tariff>>('/tariffs', { params });
  return data;
}

export async function createTariff(payload: TariffCreate): Promise<Tariff> {
  const { data } = await http.post<Tariff>('/tariffs', payload);
  return data;
}

export async function updateTariff(
  tariffId: string,
  payload: TariffUpdate,
): Promise<Tariff> {
  const { data } = await http.patch<Tariff>(`/tariffs/${tariffId}`, payload);
  return data;
}

export async function deleteTariff(tariffId: string): Promise<void> {
  await http.delete(`/tariffs/${tariffId}`);
}
