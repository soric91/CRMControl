/**
 * The one axios instance. Everything HTTP happens through it and nothing
 * outside `src/api/` ever imports axios.
 */

import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toApiError } from '../lib/errors';
import type { ApiError, TokenPair } from './types';

const baseURL = process.env.PUBLIC_API_BASE_URL;

if (!baseURL) {
  throw new Error(
    'PUBLIC_API_BASE_URL is not set. Copy .env.example to .env and restart the dev server.',
  );
}

/**
 * Tokens live in `localStorage`, which is readable by any script that manages
 * to run on the page — an XSS becomes a stolen session. The alternative is an
 * httpOnly cookie set by the server, which this backend cannot do today: it
 * returns the pair in the response body. Moving to cookies is a backend change
 * (Set-Cookie on login/refresh, CSRF protection, credentialed CORS).
 */
const ACCESS_TOKEN_KEY = 'crm.access_token';
const REFRESH_TOKEN_KEY = 'crm.refresh_token';

/** Endpoints that carry no Authorization header and are never retried. */
const PUBLIC_PATHS = ['/auth/login', '/auth/refresh'] as const;

/** Flagged so a request is only ever retried once per 401. */
interface RetriableConfig extends InternalAxiosRequestConfig {
  retried?: boolean;
}

export const http = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

// --- session storage --------------------------------------------------------

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function storeSession(tokens: TokenPair): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Fired when the session is gone for good: the refresh failed, or there was no
 * refresh token to begin with. `AuthContext` subscribes and drops the user,
 * which sends `ProtectedRoute` to `/login` — no hard reload.
 */
type SessionExpiredListener = () => void;
const sessionExpiredListeners = new Set<SessionExpiredListener>();

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

function endSession(): void {
  clearSession();
  for (const listener of sessionExpiredListeners) listener();
}

/**
 * Fired when the backend answers `password_change_required`: the token only
 * reaches `/auth/me` and `/auth/password` until the user picks a new password.
 * `/auth/me` succeeds without saying so, so this 403 is how the CRM finds out.
 */
type PasswordChangeListener = () => void;
const passwordChangeListeners = new Set<PasswordChangeListener>();

export function onPasswordChangeRequired(
  listener: PasswordChangeListener,
): () => void {
  passwordChangeListeners.add(listener);
  return () => {
    passwordChangeListeners.delete(listener);
  };
}

// --- refresh ----------------------------------------------------------------

function isPublicPath(url: string | undefined): boolean {
  return PUBLIC_PATHS.some((path) => url?.includes(path) === true);
}

/**
 * The in-flight refresh, if any. Concurrent 401s all await this same promise,
 * so N failed requests trigger exactly one `POST /auth/refresh`.
 */
let refreshInFlight: Promise<string> | null = null;

async function requestNewAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token stored');

  const { data } = await http.post<TokenPair>('/auth/refresh', {
    refresh_token: refreshToken,
  });
  storeSession(data);
  return data.access_token;
}

/**
 * Also used on purpose after a password change: the access token carries its
 * scope as a claim, so a token minted while the password was pending stays
 * restricted until it is replaced. The refresh token has no scope, and the new
 * access token is issued from the account's current state.
 */
export function renewAccessToken(): Promise<string> {
  refreshInFlight ??= requestNewAccessToken().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

// --- interceptors -----------------------------------------------------------

http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && !isPublicPath(config.url)) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

function normalize(error: AxiosError): ApiError {
  const apiError = error.response
    ? toApiError(error.response.status, error.response.data)
    : toApiError(0, null);

  if (apiError.code === 'password_change_required') {
    for (const listener of passwordChangeListeners) listener();
  }
  return apiError;
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config: RetriableConfig | undefined = error.config;

    const canRetry =
      error.response?.status === 401 &&
      config !== undefined &&
      !config.retried &&
      !isPublicPath(config.url);

    // A 401 on login is just wrong credentials, and a 401 on refresh is
    // handled by whoever awaited the refresh — neither is retried here.
    if (!canRetry || !config) return Promise.reject(normalize(error));

    config.retried = true;
    try {
      const token = await renewAccessToken();
      config.headers.set('Authorization', `Bearer ${token}`);
      return await http.request(config);
    } catch {
      // No usable session left. The caller still gets the original 401,
      // which is the error it actually asked about.
      endSession();
      return Promise.reject(normalize(error));
    }
  },
);

export { isApiError } from '../lib/errors';
