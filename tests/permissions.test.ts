import { describe, expect, test } from '@rstest/core';
import { USER_ROLE } from '../src/api/types';
import type { UserRole } from '../src/api/types';
import {
  canBrowsePlatform,
  canManageUsers,
  canWrite,
} from '../src/lib/permissions';

/** The table from the spec, as data. */
const EXPECTED: Record<
  UserRole,
  { write: boolean; users: boolean; platform: boolean }
> = {
  admin: { write: true, users: true, platform: true },
  tecnico: { write: true, users: false, platform: true },
  solo_lectura: { write: false, users: false, platform: true },
  // `cliente` cannot reach the CRM at all — the backend refuses it at
  // `/auth/login`. Its home is the monitoring web.
  cliente: { write: false, users: false, platform: false },
};

describe('permissions', () => {
  for (const role of USER_ROLE) {
    const expected = EXPECTED[role];

    test(`${role} write access`, () => {
      expect(canWrite(role)).toBe(expected.write);
    });

    test(`${role} user management`, () => {
      expect(canManageUsers(role)).toBe(expected.users);
    });

    test(`${role} platform-wide browsing`, () => {
      expect(canBrowsePlatform(role)).toBe(expected.platform);
    });
  }

  test('cliente is the only role kept out of the CRM', () => {
    expect(USER_ROLE.filter((role) => !canBrowsePlatform(role))).toEqual([
      'cliente',
    ]);
  });

  test('a tecnico can write but never touches accounts', () => {
    // Narrower than canWrite on purpose: a tecnico able to create users
    // could mint an admin and promote itself.
    expect(canWrite('tecnico')).toBe(true);
    expect(canManageUsers('tecnico')).toBe(false);
  });
});
