import { http } from './http';
import type {
  PlatformSetting,
  PlatformSettingCreate,
  PlatformSettingRevealed,
  PlatformSettingUpdate,
} from './types';

/** Todas las variables. Los secretos vienen con `valor: null`. */
export async function listPlatformSettings(): Promise<PlatformSetting[]> {
  const { data } = await http.get<PlatformSetting[]>('/platform-settings');
  // Se comprueba la forma acá y no en el componente: una respuesta inesperada
  // reventaba la pantalla entera de credenciales con «filter is not a
  // function», que no dice nada de dónde está el problema.
  if (!Array.isArray(data)) {
    throw new TypeError(
      'La lista de configuración llegó con una forma inesperada',
    );
  }
  return data;
}

/**
 * El valor en claro de una variable.
 *
 * Petición aparte y no un campo del listado: así ver un secreto es un acto
 * deliberado, y del lado del servidor queda registrado quién lo pidió.
 */
export async function revealPlatformSetting(
  clave: string,
): Promise<PlatformSettingRevealed> {
  const { data } = await http.get<PlatformSettingRevealed>(
    `/platform-settings/${encodeURIComponent(clave)}/reveal`,
  );
  return data;
}

export async function createPlatformSetting(
  payload: PlatformSettingCreate,
): Promise<PlatformSetting> {
  const { data } = await http.post<PlatformSetting>(
    '/platform-settings',
    payload,
  );
  return data;
}

export async function updatePlatformSetting(
  clave: string,
  payload: PlatformSettingUpdate,
): Promise<PlatformSetting> {
  const { data } = await http.patch<PlatformSetting>(
    `/platform-settings/${encodeURIComponent(clave)}`,
    payload,
  );
  return data;
}

export async function deletePlatformSetting(clave: string): Promise<void> {
  await http.delete(`/platform-settings/${encodeURIComponent(clave)}`);
}
