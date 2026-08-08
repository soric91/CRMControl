/**
 * Turns anything axios can throw into the single `ApiError` shape the UI knows.
 * Nothing above this file ever looks at an HTTP response body.
 */

import { API_ERROR_CODE } from '../api/types';
import type {
  ApiError,
  ApiErrorCode,
  ApiErrorEnvelope,
  ValidationIssue,
} from '../api/types';

const MESSAGES: Record<ApiErrorCode, string> = {
  authentication_failed: 'Tu sesión expiró. Iniciá sesión de nuevo.',
  password_change_required:
    'Tenés que cambiar tu contraseña antes de continuar',
  not_authorized: 'No tenés permiso para esta acción',
  not_found: 'No encontramos lo que buscabas',
  already_exists: 'Ya existe un registro con esos datos',
  business_rule_violation: 'La operación no es válida',
  validation_error: 'Revisá los datos del formulario',
  internal_error: 'Error inesperado del servidor',
  network_error: 'No pudimos contactar al servidor',
};

/** Segments the backend prefixes `loc` with; they are not field names. */
const LOCATION_PREFIXES = new Set([
  'body',
  'query',
  'path',
  'header',
  'cookie',
]);

export function isApiError(error: unknown): error is ApiError {
  if (typeof error !== 'object' || error === null) return false;
  return (
    'status' in error &&
    typeof error.status === 'number' &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string' &&
    'fieldErrors' in error &&
    typeof error.fieldErrors === 'object' &&
    error.fieldErrors !== null
  );
}

function isKnownCode(code: string): code is ApiErrorCode {
  const codes: readonly string[] = API_ERROR_CODE;
  return codes.includes(code);
}

function isEnvelope(body: unknown): body is ApiErrorEnvelope {
  if (typeof body !== 'object' || body === null || !('error' in body)) {
    return false;
  }
  const inner = body.error;
  return (
    typeof inner === 'object' &&
    inner !== null &&
    'code' in inner &&
    typeof inner.code === 'string'
  );
}

function isValidationIssue(issue: unknown): issue is ValidationIssue {
  if (typeof issue !== 'object' || issue === null) return false;
  return (
    'loc' in issue &&
    Array.isArray(issue.loc) &&
    'msg' in issue &&
    typeof issue.msg === 'string'
  );
}

/**
 * Maps the Pydantic issues of a 422 to `{ field: message }`.
 *
 * `loc` arrives as `["body", "modbus_id"]`; the leading location tag is
 * dropped and the rest joined, so a nested field lands on `parent.child`.
 * The first message per field wins — that is the one the user sees.
 */
export function fieldErrorsFromDetails(
  details: Record<string, unknown> | undefined,
): Record<string, string> {
  const issues = details?.errors;
  if (!Array.isArray(issues)) return {};

  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    if (!isValidationIssue(issue)) continue;

    const path = issue.loc.map(String);
    const start =
      path.length > 1 && LOCATION_PREFIXES.has(path[0] ?? '') ? 1 : 0;
    const field = path.slice(start).join('.');
    if (!field || field in fieldErrors) continue;

    fieldErrors[field] = issue.msg;
  }
  return fieldErrors;
}

/** Builds an `ApiError` from an HTTP status and whatever body came with it. */
export function toApiError(status: number, body: unknown): ApiError {
  if (!isEnvelope(body)) {
    const code: ApiErrorCode =
      status === 0 ? 'network_error' : 'internal_error';
    return { status, code, message: MESSAGES[code], fieldErrors: {} };
  }

  const { code: rawCode, message, details } = body.error;
  const code: ApiErrorCode = isKnownCode(rawCode) ? rawCode : 'internal_error';

  return {
    status,
    code,
    // A `business_rule_violation` message is written for the user and is
    // actionable, so it is shown verbatim. The rest get a Spanish default.
    message:
      code === 'business_rule_violation' && message ? message : MESSAGES[code],
    fieldErrors:
      code === 'validation_error' ? fieldErrorsFromDetails(details) : {},
  };
}

/**
 * Narrows anything caught to an `ApiError`. Everything thrown from `src/api/`
 * already is one; this covers the odd bug thrown from our own code so screens
 * never have to branch on the shape.
 */
export function asApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;
  return {
    status: 0,
    code: 'internal_error',
    message: MESSAGES.internal_error,
    fieldErrors: {},
  };
}
