/**
 * The session: tokens, the current user and the role everything else keys off.
 *
 * The role is always read from `GET /auth/me`, never decoded out of the JWT —
 * the token is the server's business and the claim could go stale.
 */

import { createContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  authApi,
  clearSession,
  onPasswordChangeRequired,
  onSessionExpired,
} from '../api';
import type { LoginPayload, User } from '../api';
import { getAccessToken } from '../api/http';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  /**
   * The account holds a password the system generated, so its token reaches
   * nothing until it is replaced. `/auth/me` does not report this, so it is
   * learnt from the first `password_change_required` the backend answers.
   */
  passwordChangeRequired: boolean;
  signIn: (payload: LoginPayload) => Promise<User>;
  signOut: () => void;
  /** Called once the new password is accepted, to lift the block. */
  clearPasswordChangeRequired: () => void;
  /** Re-reads `/auth/me`, e.g. after an admin changed the account. */
  reloadUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);
  const [status, setStatus] = useState<AuthStatus>(() =>
    getAccessToken() ? 'loading' : 'anonymous',
  );

  // A stored token is only a hint; `/auth/me` decides whether it still works.
  useEffect(() => {
    if (!getAccessToken()) return;

    let cancelled = false;
    authApi
      .getCurrentUser()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus('authenticated');
      })
      .catch(() => {
        if (cancelled) return;
        clearSession();
        setUser(null);
        setStatus('anonymous');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // The refresh interceptor gave up: drop the user and let the route guards
  // do the redirecting.
  useEffect(
    () =>
      onSessionExpired(() => {
        setUser(null);
        setStatus('anonymous');
        setPasswordChangeRequired(false);
      }),
    [],
  );

  // Any 403 with this code means the token is restricted, whichever call
  // tripped over it.
  useEffect(
    () =>
      onPasswordChangeRequired(() => {
        setPasswordChangeRequired(true);
      }),
    [],
  );

  const value: AuthContextValue = {
    user,
    status,
    passwordChangeRequired,
    signIn: async (payload) => {
      await authApi.login(payload);
      const me = await authApi.getCurrentUser();
      setUser(me);
      setStatus('authenticated');
      return me;
    },
    signOut: () => {
      authApi.logout();
      setUser(null);
      setStatus('anonymous');
      setPasswordChangeRequired(false);
    },
    clearPasswordChangeRequired: () => {
      setPasswordChangeRequired(false);
    },
    reloadUser: async () => {
      setUser(await authApi.getCurrentUser());
    },
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}
