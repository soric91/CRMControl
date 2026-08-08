/**
 * The long-lived credential a gateway is loaded with once.
 *
 * The firmware exchanges it for a 24 h token at `POST /gateway/token`, which
 * is why that token never reaches the panel: it lives in the device.
 */

import { http } from './http';
import type { GatewayCredential, GatewayCredentialCreated } from './types';

/** State only. The secret is not part of this response. */
export async function getGatewayCredential(
  gatewayId: string,
): Promise<GatewayCredential> {
  const { data } = await http.get<GatewayCredential>(
    `/gateways/${gatewayId}/credential`,
  );
  return data;
}

/**
 * Issues a credential and returns it, the only time it is ever readable.
 * Issuing again replaces the previous one, so the gateway stops being able to
 * ask for a token until the new one is loaded into it.
 */
export async function issueGatewayCredential(
  gatewayId: string,
): Promise<GatewayCredentialCreated> {
  const { data } = await http.post<GatewayCredentialCreated>(
    `/gateways/${gatewayId}/credential`,
  );
  return data;
}

/** Drops the credential. The gateway can no longer obtain a token. */
export async function revokeGatewayCredential(
  gatewayId: string,
): Promise<void> {
  await http.delete(`/gateways/${gatewayId}/credential`);
}
