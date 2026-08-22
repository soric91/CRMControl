/**
 * The role rules, as pure functions. Components ask these questions instead of
 * comparing role strings, so a rule change happens in one place.
 *
 * These only decide what the UI *offers*. The backend is the authority: every
 * call can still come back 403 and the screens handle it.
 */

import type { UserRole } from '../api/types';

/** Roles that administer the platform and see every client. */
const STAFF_ROLES: readonly UserRole[] = ['admin', 'tecnico', 'solo_lectura'];

/** Roles allowed to create, modify or delete. */
const WRITER_ROLES: readonly UserRole[] = ['admin', 'tecnico'];

export function canWrite(role: UserRole): boolean {
  return WRITER_ROLES.includes(role);
}

/**
 * Only admins touch accounts — narrower than {@link canWrite} on purpose: a
 * `tecnico` able to create users could mint an admin and promote itself.
 */
export function canManageUsers(role: UserRole): boolean {
  return role === 'admin';
}

/**
 * Only admins issue machine credentials. Narrower than {@link canWrite} for
 * the same reason as accounts, and one more: a service credential outlives
 * whoever created it and lives in a system nobody in this panel operates.
 */
export function canManageServiceAccounts(role: UserRole): boolean {
  return role === 'admin';
}

/**
 * Only admins publish firmware and deploy it.
 *
 * Narrower than {@link canWrite} for the same reason as service credentials:
 * whoever can do this decides what software runs on every installed device. A
 * `tecnico` maintains equipment; choosing the fleet's firmware is not that job.
 */
export function canManageFirmware(role: UserRole): boolean {
  return role === 'admin';
}

/**
 * Whether the role browses the whole platform rather than a single company.
 *
 * Only `cliente` is left out, and that role cannot reach the CRM at all: the
 * backend refuses it at `/auth/login`. Its home is the monitoring web.
 */
export function canBrowsePlatform(role: UserRole): boolean {
  return STAFF_ROLES.includes(role);
}

/** Where every CRM role goes after login, and when it hits `/`. */
export const LANDING_PATH = '/clients';
