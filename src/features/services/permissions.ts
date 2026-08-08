/**
 * Vocabulary of the service-credential screen, kept out of the components so
 * the table and the form cannot drift apart on what a permission is called.
 */

import type { ServiceAccount, ServicePermission } from '../../api';

export const PERMISSION_LABEL: Record<ServicePermission, string> = {
  'tariffs:read': 'Tarifas',
  'fleet:read': 'Flota',
};

/** What each permission actually opens, said in terms of the data. */
export const PERMISSION_DESCRIPTION: Record<ServicePermission, string> = {
  'tariffs:read':
    'Leer los precios mensuales de energía. Es lo que ApiEMS necesita para valorizar el consumo.',
  'fleet:read':
    'Leer el árbol de instalaciones: empresas, sedes, gateways con su UUID, equipos y registros.',
};

/** How close a credential is to its deadline. */
export type ExpiryState = 'none' | 'ok' | 'soon' | 'expired';

/** A week: enough para rotarla sin apuro, poco para que se olvide. */
const SOON_DAYS = 7;

export function expiryState(account: ServiceAccount): ExpiryState {
  if (!account.expira_en) return 'none';

  const remainingMs = new Date(account.expira_en).getTime() - Date.now();
  if (Number.isNaN(remainingMs)) return 'none';
  if (remainingMs <= 0) return 'expired';
  return remainingMs <= SOON_DAYS * 24 * 60 * 60 * 1000 ? 'soon' : 'ok';
}
