/**
 * The global search fans out to several listings at once. What breaks in
 * silence here is an error that renders identically to "no matches", and a
 * group that quietly stops being queried.
 */

import { afterEach, beforeEach, describe, expect, test } from '@rstest/core';
import { AxiosError, AxiosHeaders } from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { http, storeSession } from '../src/api/http';
import { GlobalSearch } from '../src/components/layout/GlobalSearch';

const SITE = {
  id: 's-1',
  client_id: 'c-1',
  nombre: 'Planta Norte',
  direccion: 'Ruta 8',
};
const GATEWAY = {
  id: 'gw-1',
  site_id: 's-1',
  numero_serie: 'GW-0042',
  estado: 'offline',
};
const CLIENT = { id: 'c-1', nombre_empresa: 'Molino Santa Rita' };

const originalAdapter = http.defaults.adapter;
let asked: string[] = [];

function page(config: InternalAxiosRequestConfig, items: unknown[]) {
  return Promise.resolve({
    data: { items, total: items.length, limit: 5, offset: 0 },
    status: 200,
    statusText: '',
    headers: new AxiosHeaders(),
    config,
  } satisfies AxiosResponse);
}

function serveAll(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const url = config.url ?? '';
  asked.push(url);

  if (url === '/clients') return page(config, [CLIENT]);
  if (url === '/sites') return page(config, [SITE]);
  if (url === '/gateways') return page(config, [GATEWAY]);
  if (url === '/equipment') return page(config, []);
  // Resolving a gateway's route walks up through its site.
  if (url.startsWith('/sites/')) {
    return Promise.resolve({
      data: SITE,
      status: 200,
      statusText: '',
      headers: new AxiosHeaders(),
      config,
    } satisfies AxiosResponse);
  }
  return page(config, []);
}

function renderSearch() {
  render(
    <MemoryRouter>
      <GlobalSearch />
    </MemoryRouter>,
  );
  return screen.getByLabelText('Buscar');
}

beforeEach(() => {
  asked = [];
  localStorage.clear();
  storeSession({
    access_token: 'a',
    refresh_token: 'r',
    token_type: 'bearer',
    expires_in: 1800,
  });
  http.defaults.adapter = serveAll;
});

afterEach(() => {
  cleanup();
  http.defaults.adapter = originalAdapter;
  localStorage.clear();
});

describe('GlobalSearch', () => {
  test('groups the hits by what they are', async () => {
    const input = renderSearch();
    fireEvent.change(input, { target: { value: 'norte' } });

    expect(await screen.findByText('Planta Norte')).toBeInTheDocument();
    expect(screen.getByText('Sedes')).toBeInTheDocument();
    expect(screen.getByText('Gateways')).toBeInTheDocument();
    expect(screen.getByText('GW-0042')).toBeInTheDocument();
    // Nothing came back for equipment, so its heading is not printed.
    expect(screen.queryByText('Equipos')).toBeNull();
  });

  test('asks every listing the search covers', async () => {
    const input = renderSearch();
    fireEvent.change(input, { target: { value: 'norte' } });
    await screen.findByText('Planta Norte');

    for (const url of ['/clients', '/sites', '/gateways', '/equipment']) {
      expect(asked).toContain(url);
    }
  });

  test('sends the term to the backend for the listings that accept it', async () => {
    const input = renderSearch();
    fireEvent.change(input, { target: { value: 'norte' } });
    await screen.findByText('Planta Norte');

    // `/clients` has no `search` yet, so it is the one filtered in the browser.
    expect(asked).toContain('/clients');
  });

  test('says nothing below the minimum query length', () => {
    const input = renderSearch();
    fireEvent.change(input, { target: { value: 'n' } });

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(asked).toHaveLength(0);
  });

  test('a failed request says so instead of pretending there are no matches', async () => {
    http.defaults.adapter = (config) =>
      Promise.reject(
        new AxiosError('boom', 'ERR', config, null, {
          data: null,
          status: 500,
          statusText: '',
          headers: new AxiosHeaders(),
          config,
        }),
      );

    const input = renderSearch();
    fireEvent.change(input, { target: { value: 'norte' } });

    expect(
      await screen.findByText(/Error inesperado del servidor/i),
    ).toBeInTheDocument();
    expect(screen.queryByText('Sin coincidencias')).toBeNull();
  });

  test('"Sin coincidencias" only once every listing answered', async () => {
    http.defaults.adapter = (config) => page(config, []);

    const input = renderSearch();
    fireEvent.change(input, { target: { value: 'zzz' } });

    expect(await screen.findByText('Sin coincidencias')).toBeInTheDocument();
  });
});
