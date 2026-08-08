import { http } from './http';
import type { Medicion } from './types';

/**
 * Las mediciones que un equipo puede reportar.
 *
 * Fija: no depende del cliente ni del equipo. Se pide una vez y se reutiliza
 * mientras dure la sesión — es vocabulario, no datos.
 */
export async function listVariableCatalog(): Promise<Medicion[]> {
  const { data } = await http.get<Medicion[]>('/variable-catalog');
  return data;
}
