/** The API surface. Everything outside `src/api/` imports from here. */

export * from './types';
export {
  clearSession,
  isApiError,
  onPasswordChangeRequired,
  onSessionExpired,
} from './http';

export * as authApi from './auth.api';
export * as clientsApi from './clients.api';
export * as tariffsApi from './tariffs.api';
export * as sitesApi from './sites.api';
export * as gatewaysApi from './gateways.api';
export * as gatewayCredentialApi from './gatewayCredential.api';
export * as enrollmentApi from './enrollment.api';
export * as firmwareApi from './firmware.api';
export * as equipmentApi from './equipment.api';
export * as variablesApi from './variables.api';
export * as variableCatalogApi from './variableCatalog.api';
export * as usersApi from './users.api';
export * as serviceAccountsApi from './serviceAccounts.api';
export * as platformSettingsApi from './platformSettings.api';
