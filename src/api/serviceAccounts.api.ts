import { http } from './http';
import type {
  Page,
  PaginationParams,
  ServiceAccount,
  ServiceAccountCreate,
  ServiceAccountCreated,
  ServiceAccountUpdate,
} from './types';

export async function listServiceAccounts(
  params: PaginationParams = {},
): Promise<Page<ServiceAccount>> {
  const { data } = await http.get<Page<ServiceAccount>>('/service-accounts', {
    params,
  });
  return data;
}

/** The response carries the secret. It is not stored anywhere it can be read back. */
export async function createServiceAccount(
  payload: ServiceAccountCreate,
): Promise<ServiceAccountCreated> {
  const { data } = await http.post<ServiceAccountCreated>(
    '/service-accounts',
    payload,
  );
  return data;
}

export async function updateServiceAccount(
  accountId: string,
  payload: ServiceAccountUpdate,
): Promise<ServiceAccount> {
  const { data } = await http.patch<ServiceAccount>(
    `/service-accounts/${accountId}`,
    payload,
  );
  return data;
}

/**
 * Issues a new secret and kills the previous one immediately. The consumer
 * cannot obtain new tokens until the new secret reaches it.
 */
export async function rotateServiceSecret(
  accountId: string,
): Promise<ServiceAccountCreated> {
  const { data } = await http.post<ServiceAccountCreated>(
    `/service-accounts/${accountId}/secret`,
  );
  return data;
}

export async function deleteServiceAccount(accountId: string): Promise<void> {
  await http.delete(`/service-accounts/${accountId}`);
}
