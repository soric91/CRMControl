import { http } from './http';
import type { EnrollmentTokenIssued } from './types';

/**
 * Emitir el permiso con el que este gateway se configura solo.
 *
 * Emitir uno nuevo vence los anteriores: si no, cada intento fallido dejaría
 * un token vivo dando vueltas en un chat o un papel.
 */
export async function issueEnrollmentToken(
  gatewayId: string,
): Promise<EnrollmentTokenIssued> {
  const { data } = await http.post<EnrollmentTokenIssued>(
    `/gateways/${gatewayId}/enrollment-token`,
  );
  return data;
}
