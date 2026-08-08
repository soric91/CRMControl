/**
 * The credential exists in clear exactly once, in the response that issues it.
 * The rule that matters is that it never outlives the dialog showing it: not
 * in storage, not in a later response, not in the console.
 */

import { afterEach, beforeEach, describe, expect, test } from '@rstest/core';
import { AxiosHeaders } from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { http, storeSession } from '../src/api/http';
import type { Gateway } from '../src/api/types';
import { ToastProvider } from '../src/context/ToastContext';
import { GatewayCredentialPanel } from '../src/features/gateways/GatewayCredentialPanel';

const SECRET = 'gw-credential-de-prueba-0123456789';

const GATEWAY: Gateway = {
  id: 'gw-1',
  site_id: 's-1',
  numero_serie: 'GW-1',
  uuid: '911bbd6c-0000-4000-8000-000000000000',
  firmware_version: null,
  ultima_conexion: null,
  ip_actual: null,
  estado: 'offline',
  config_habilitada: false,
  log_level: 'INFO',
  intervalo_lectura_segundos: 60,
  hora_inicio: 0,
  hora_fin: 23,
  config_version_aplicada: null,
  config_aplicada_en: null,
  created_at: '2026-08-04T00:00:00Z',
  updated_at: '2026-08-04T00:00:00Z',
};

const NO_CREDENTIAL = {
  gateway_id: GATEWAY.id,
  uuid: GATEWAY.uuid,
  numero_serie: GATEWAY.numero_serie,
  tiene_credencial: false,
  credential_emitida_en: null,
  config_habilitada: false,
};

const originalAdapter = http.defaults.adapter;
let issuedOnce = false;

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

function mount() {
  render(
    <ToastProvider>
      <GatewayCredentialPanel gateway={GATEWAY} writable />
    </ToastProvider>,
  );
}

beforeEach(() => {
  issuedOnce = false;
  localStorage.clear();
  storeSession({
    access_token: 'a',
    refresh_token: 'r',
    token_type: 'bearer',
    expires_in: 1800,
  });

  http.defaults.adapter = (config) => {
    const method = (config.method ?? 'get').toLowerCase();
    if (method === 'post') {
      issuedOnce = true;
      return reply(config, {
        ...NO_CREDENTIAL,
        tiene_credencial: true,
        credential_emitida_en: '2026-08-04T10:00:00Z',
        credential: SECRET,
      });
    }
    // Once issued, the state endpoint reports it exists but never returns it.
    return reply(
      config,
      issuedOnce
        ? {
            ...NO_CREDENTIAL,
            tiene_credencial: true,
            credential_emitida_en: '2026-08-04T10:00:00Z',
          }
        : NO_CREDENTIAL,
    );
  };
});

afterEach(() => {
  cleanup();
  http.defaults.adapter = originalAdapter;
  localStorage.clear();
});

describe('GatewayCredentialPanel', () => {
  test('offers to generate one when the gateway has none', async () => {
    mount();
    expect(
      await screen.findByRole('button', { name: 'Generar credencial' }),
    ).toBeInTheDocument();
    // Nothing to reveal yet.
    expect(screen.queryByText(SECRET)).toBeNull();
  });

  test('shows the secret once and drops it when the dialog closes', async () => {
    mount();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Generar credencial' }),
    );

    expect(await screen.findByText(SECRET)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ya la copié' }));
    expect(screen.queryByText(SECRET)).toBeNull();

    // And it is nowhere it could outlive the component.
    expect(JSON.stringify(localStorage)).not.toContain(SECRET);
  });

  test('always shows the uuid, which the firmware needs alongside it', async () => {
    mount();
    expect(await screen.findByText(GATEWAY.uuid)).toBeInTheDocument();
  });

  test('destructive actions say what breaks, not "are you sure"', async () => {
    mount();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Generar credencial' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Ya la copié' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Revocar' }));
    expect(
      await screen.findByText(/deja de poder pedir su token/i),
    ).toBeInTheDocument();
  });
});
