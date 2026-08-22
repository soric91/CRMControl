/**
 * El catálogo de versiones del firmware y los despliegues.
 *
 * Publicar y desplegar son dos llamadas distintas a propósito: se publica una
 * versión, se prueba en un equipo, y recién entonces se le pide a la flota.
 * Ninguna de las dos reinicia nada — dejan escrito qué tiene que instalar
 * cada gateway, y el gateway lo busca solo.
 */

import { http } from './http';
import type {
  FirmwareRelease,
  FirmwareReleaseCreate,
  FirmwareUpdateStatus,
  RolloutCreate,
  RolloutResult,
} from './types';

/** Las versiones publicadas, la más nueva primero. */
export async function listFirmwareReleases(): Promise<FirmwareRelease[]> {
  const { data } = await http.get<FirmwareRelease[]>('/firmware/releases');
  // Se comprueba la forma acá y no en el componente: una respuesta inesperada
  // reventaría la pantalla con «map is not a function», que no dice nada de
  // dónde está el problema.
  if (!Array.isArray(data)) {
    throw new TypeError(
      'El catálogo de firmware llegó con una forma inesperada',
    );
  }
  return data;
}

/** Agrega una versión al catálogo. No la instala en ningún equipo. */
export async function publishFirmwareRelease(
  payload: FirmwareReleaseCreate,
): Promise<FirmwareRelease> {
  const { data } = await http.post<FirmwareRelease>(
    '/firmware/releases',
    payload,
  );
  return data;
}

/**
 * Deja de ofrecer una versión, sin borrarla.
 *
 * Los equipos que iban hacia ella dejan de recibirla en su próxima consulta.
 * La fila queda: es la única explicación de por qué una sede quedó corriendo
 * lo que corre.
 */
export async function retireFirmwareRelease(
  releaseId: string,
): Promise<FirmwareRelease> {
  const { data } = await http.post<FirmwareRelease>(
    `/firmware/releases/${releaseId}/retire`,
  );
  return data;
}

/**
 * Le pide una versión a un equipo, a una sede o a una empresa entera.
 *
 * La respuesta dice a quién **no** se le pidió y por qué: quien ya la tiene,
 * quien no tiene credencial, y quien está reiniciándose ahora mismo.
 */
export async function createFirmwareRollout(
  payload: RolloutCreate,
): Promise<RolloutResult> {
  const { data } = await http.post<RolloutResult>(
    '/firmware/rollouts',
    payload,
  );
  return data;
}

/** En qué anda la actualización de un equipo. */
export async function getGatewayFirmware(
  gatewayId: string,
): Promise<FirmwareUpdateStatus> {
  const { data } = await http.get<FirmwareUpdateStatus>(
    `/gateways/${gatewayId}/firmware`,
  );
  return data;
}

/**
 * Le saca la actualización que tenía pedida.
 *
 * El backend lo rechaza si el equipo ya empezó a aplicarla: para entonces el
 * paquete está en el disco y se está reiniciando con él.
 */
export async function cancelGatewayFirmware(
  gatewayId: string,
): Promise<FirmwareUpdateStatus> {
  const { data } = await http.delete<FirmwareUpdateStatus>(
    `/gateways/${gatewayId}/firmware`,
  );
  return data;
}
