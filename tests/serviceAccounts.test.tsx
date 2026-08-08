/**
 * The credential another system is configured with.
 *
 * Same rule as the gateway's: the secret exists in clear exactly once, in the
 * response that issues or rotates it, and must not outlive the dialog that
 * shows it. On top of that, this screen has to be honest about what a
 * permission opens and what rotating one breaks.
 */

import { afterEach, beforeEach, describe, expect, test } from '@rstest/core';
import { AxiosHeaders } from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { http, storeSession } from '../src/api/http';
import type { ServiceAccount } from '../src/api/types';
import { ToastProvider } from '../src/context/ToastContext';
import { ServiceAccountsPage } from '../src/features/services/ServiceAccountsPage';
import { expiryState } from '../src/features/services/permissions';
import { canManageServiceAccounts } from '../src/lib/permissions';
import { USER_ROLE } from '../src/api/types';

const SECRET = 'svcsec_un-secreto-de-prueba-0123456789';

const ACCOUNT: ServiceAccount = {
  id: 'svc-1',
  nombre: 'ApiEMS',
  descripcion: 'Lee tarifas y la flota',
  credencial_id: 'svc_abc123',
  permisos: ['tariffs:read', 'fleet:read'],
  client_id: null,
  activo: true,
  expira_en: null,
  secret_emitido_en: '2026-08-06T10:00:00Z',
  ultimo_uso_en: null,
  created_at: '2026-08-06T10:00:00Z',
  updated_at: '2026-08-06T10:00:00Z',
};

const originalAdapter = http.defaults.adapter;

function reply(
  config: InternalAxiosRequestConfig,
  data: unknown,
): Promise<AxiosResponse> {
  return Promise.resolve({
    data,
    status: 200,
    statusText: '',
    headers: new AxiosHeaders(),
    config,
  });
}

/** The row menu, taking the first of the two the list renders. */
async function openRowMenu(): Promise<HTMLElement> {
  const buttons = await screen.findAllByRole('button', {
    name: `Acciones de ${ACCOUNT.nombre}`,
  });
  return buttons[0];
}

async function firstMenuItem(name: string): Promise<HTMLElement> {
  const items = await screen.findAllByRole('menuitem', { name });
  return items[0];
}

function mount() {
  render(
    <ToastProvider>
      <ServiceAccountsPage />
    </ToastProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  storeSession({
    access_token: 'a',
    refresh_token: 'r',
    token_type: 'bearer',
    expires_in: 1800,
  });

  http.defaults.adapter = (config) => {
    const url = config.url ?? '';
    const method = (config.method ?? 'get').toLowerCase();

    if (method === 'post' && url.endsWith('/secret')) {
      return reply(config, { ...ACCOUNT, client_secret: SECRET });
    }
    // La pantalla también monta la configuración de la flota, que responde
    // una lista y no una página.
    if (url.startsWith('/platform-settings')) {
      return reply(config, []);
    }
    if (url.startsWith('/clients')) {
      return reply(config, { items: [], total: 0, limit: 50, offset: 0 });
    }
    return reply(config, {
      items: [ACCOUNT],
      total: 1,
      limit: 50,
      offset: 0,
    });
  };
});

afterEach(() => {
  cleanup();
  http.defaults.adapter = originalAdapter;
  localStorage.clear();
});

describe('ServiceAccountsPage', () => {
  test('shows the public identifier but never a secret', async () => {
    mount();

    // Twice: once in the table, once in the card list beside it.
    expect(await screen.findAllByText(ACCOUNT.credencial_id)).toHaveLength(2);
    expect(screen.queryByText(SECRET)).toBeNull();
  });

  test('says what each credential may read', async () => {
    mount();

    expect((await screen.findAllByText('Tarifas')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Flota').length).toBeGreaterThan(0);
  });

  test('a credential never used says so', async () => {
    mount();

    expect(await screen.findByText('Nunca')).toBeInTheDocument();
  });

  test('rotating reveals the new secret once and then drops it', async () => {
    mount();

    // The list renders twice — a table for wide screens and cards for narrow
    // ones — so both menus are in the DOM. Either one drives the same action.
    fireEvent.click(await openRowMenu());
    fireEvent.click(await firstMenuItem('Rotar secreto'));
    fireEvent.click(await screen.findByRole('button', { name: 'Rotar' }));

    expect(await screen.findByText(SECRET)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ya la copié' }));
    expect(screen.queryByText(SECRET)).toBeNull();

    // And nowhere it could outlive the component.
    expect(JSON.stringify(localStorage)).not.toContain(SECRET);
  });

  test('rotating warns what it breaks, not "are you sure"', async () => {
    mount();

    // The list renders twice — a table for wide screens and cards for narrow
    // ones — so both menus are in the DOM. Either one drives the same action.
    fireEvent.click(await openRowMenu());
    fireEvent.click(await firstMenuItem('Rotar secreto'));

    expect(
      await screen.findByText(/no va a poder pedir tokens nuevos/i),
    ).toBeInTheDocument();
  });

  test('deleting points at deactivating as the reversible option', async () => {
    mount();

    // The list renders twice — a table for wide screens and cards for narrow
    // ones — so both menus are in the DOM. Either one drives the same action.
    fireEvent.click(await openRowMenu());
    fireEvent.click(await firstMenuItem('Eliminar'));

    expect(
      await screen.findByText(/desactivala en vez de borrarla/i),
    ).toBeInTheDocument();
  });
});

describe('who reaches the screen', () => {
  test('only an admin', () => {
    expect(USER_ROLE.filter(canManageServiceAccounts)).toEqual(['admin']);
  });
});

describe('expiryState', () => {
  const at = (offsetMs: number): ServiceAccount => ({
    ...ACCOUNT,
    expira_en: new Date(Date.now() + offsetMs).toISOString(),
  });

  const DAY = 24 * 60 * 60 * 1000;

  test('a credential with no deadline is never nagged about', () => {
    expect(expiryState(ACCOUNT)).toBe('none');
  });

  test('a past deadline reads as expired', () => {
    expect(expiryState(at(-DAY))).toBe('expired');
  });

  test('within a week it is worth flagging', () => {
    expect(expiryState(at(3 * DAY))).toBe('soon');
  });

  test('further out it is not', () => {
    expect(expiryState(at(30 * DAY))).toBe('ok');
  });

  test('an unparseable date is not treated as expired', () => {
    // Better to say nothing than to raise a false alarm about a credential
    // that is in fact working.
    expect(expiryState({ ...ACCOUNT, expira_en: 'no-es-una-fecha' })).toBe(
      'none',
    );
  });
});
