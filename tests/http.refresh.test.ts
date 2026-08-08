/**
 * The refresh interceptor is the piece most likely to break in silence: it
 * only runs on an expired token, and a bug shows up as a random logout or as a
 * storm of refresh calls. These tests drive it through a fake axios adapter,
 * so the real interceptor chain runs.
 */

import { afterEach, beforeEach, describe, expect, test } from '@rstest/core';
import { AxiosError, AxiosHeaders } from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '../src/api/types';
import {
  clearSession,
  getAccessToken,
  http,
  onSessionExpired,
  storeSession,
} from '../src/api/http';
import { isApiError } from '../src/lib/errors';

const UNAUTHORIZED_BODY = {
  error: {
    code: 'authentication_failed',
    message: 'Token expired',
    details: {},
  },
};

const NEW_TOKENS = {
  access_token: 'access-2',
  refresh_token: 'refresh-2',
  token_type: 'bearer',
  expires_in: 1800,
};

function reply(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown,
): Promise<AxiosResponse> {
  const response: AxiosResponse = {
    data,
    status,
    statusText: '',
    headers: new AxiosHeaders(),
    config,
  };
  return status >= 200 && status < 300
    ? Promise.resolve(response)
    : Promise.reject(
        new AxiosError(
          'Request failed',
          String(status),
          config,
          null,
          response,
        ),
      );
}

function authHeader(config: InternalAxiosRequestConfig): string {
  return String(config.headers.get('Authorization') ?? '');
}

/** Awaits a request that must fail and hands back the normalised error. */
async function rejection(request: Promise<unknown>): Promise<ApiError> {
  try {
    await request;
  } catch (caught: unknown) {
    if (isApiError(caught)) return caught;
    throw new Error(`Expected an ApiError, got ${String(caught)}`);
  }
  throw new Error('Expected the request to reject');
}

/** Lets every pending microtask settle. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const originalAdapter = http.defaults.adapter;

beforeEach(() => {
  localStorage.clear();
  storeSession({
    access_token: 'access-1',
    refresh_token: 'refresh-1',
    token_type: 'bearer',
    expires_in: 1800,
  });
});

afterEach(() => {
  http.defaults.adapter = originalAdapter;
  localStorage.clear();
});

describe('401 handling', () => {
  test('refreshes once, retries the original request and returns its data', async () => {
    const calls: string[] = [];

    http.defaults.adapter = (config) => {
      const url = config.url ?? '';
      calls.push(url);

      if (url === '/auth/refresh') return reply(config, 200, NEW_TOKENS);
      return authHeader(config) === 'Bearer access-2'
        ? reply(config, 200, { items: [], total: 0, limit: 50, offset: 0 })
        : reply(config, 401, UNAUTHORIZED_BODY);
    };

    const { data } = await http.get('/clients');

    expect(data).toEqual({ items: [], total: 0, limit: 50, offset: 0 });
    expect(calls).toEqual(['/clients', '/auth/refresh', '/clients']);
    expect(getAccessToken()).toBe('access-2');
  });

  test('concurrent 401s trigger exactly one refresh and all of them recover', async () => {
    const calls: string[] = [];
    let openGate: () => void = () => undefined;
    // Held open so all three requests queue behind the same refresh.
    const gate = new Promise<void>((resolve) => {
      openGate = resolve;
    });

    http.defaults.adapter = async (config) => {
      const url = config.url ?? '';
      calls.push(url);

      if (url === '/auth/refresh') {
        await gate;
        return reply(config, 200, NEW_TOKENS);
      }
      return authHeader(config) === 'Bearer access-2'
        ? reply(config, 200, { url })
        : reply(config, 401, UNAUTHORIZED_BODY);
    };

    const pending = Promise.all([
      http.get('/clients'),
      http.get('/sites/site-1'),
      http.get('/users'),
    ]);

    await flush();
    openGate();
    const responses = await pending;

    expect(calls.filter((url) => url === '/auth/refresh')).toHaveLength(1);
    expect(responses.map((response) => response.data)).toEqual([
      { url: '/clients' },
      { url: '/sites/site-1' },
      { url: '/users' },
    ]);
  });

  test('a failed refresh clears the session and notifies once', async () => {
    let expiredCount = 0;
    const unsubscribe = onSessionExpired(() => {
      expiredCount += 1;
    });

    http.defaults.adapter = (config) => reply(config, 401, UNAUTHORIZED_BODY);

    const error = await rejection(http.get('/clients'));

    expect(error.status).toBe(401);
    expect(getAccessToken()).toBeNull();
    expect(expiredCount).toBe(1);
    unsubscribe();
  });

  test('a 401 on login is not retried and does not end the session', async () => {
    const calls: string[] = [];
    http.defaults.adapter = (config) => {
      calls.push(config.url ?? '');
      return reply(config, 401, {
        error: {
          code: 'authentication_failed',
          message: 'Invalid credentials',
          details: {},
        },
      });
    };

    const error = await rejection(
      http.post('/auth/login', { email: 'a@b.co', password: 'secret12' }),
    );

    expect(error.code).toBe('authentication_failed');
    expect(calls).toEqual(['/auth/login']);
    expect(getAccessToken()).toBe('access-1');
  });

  test('gives up after one retry instead of looping', async () => {
    const calls: string[] = [];
    http.defaults.adapter = (config) => {
      calls.push(config.url ?? '');
      return config.url === '/auth/refresh'
        ? reply(config, 200, NEW_TOKENS)
        : reply(config, 401, UNAUTHORIZED_BODY);
    };

    const error = await rejection(http.get('/clients'));

    expect(error.status).toBe(401);
    expect(calls).toEqual(['/clients', '/auth/refresh', '/clients']);
  });

  test('with no refresh token stored the session ends immediately', async () => {
    clearSession();
    const calls: string[] = [];
    http.defaults.adapter = (config) => {
      calls.push(config.url ?? '');
      return reply(config, 401, UNAUTHORIZED_BODY);
    };

    const error = await rejection(http.get('/clients'));

    expect(error.status).toBe(401);
    expect(calls).toEqual(['/clients']);
  });
});

describe('request interceptor', () => {
  test('attaches the bearer token to protected calls only', async () => {
    const seen = new Map<string, string>();
    http.defaults.adapter = (config) => {
      seen.set(config.url ?? '', authHeader(config));
      return reply(config, 200, {});
    };

    await http.get('/clients');
    await http.post('/auth/login', {});
    await http.post('/auth/refresh', {});

    expect(seen.get('/clients')).toBe('Bearer access-1');
    expect(seen.get('/auth/login')).toBe('');
    expect(seen.get('/auth/refresh')).toBe('');
  });

  test('errors reach the caller already normalised', async () => {
    http.defaults.adapter = (config) =>
      reply(config, 422, {
        error: {
          code: 'validation_error',
          message: 'Request payload failed validation',
          details: { errors: [{ loc: ['body', 'modbus_id'], msg: 'too big' }] },
        },
      });

    const error = await rejection(http.post('/gateways/g-1/equipment', {}));

    expect(error.code).toBe('validation_error');
    expect(error.fieldErrors).toEqual({ modbus_id: 'too big' });
  });
});
