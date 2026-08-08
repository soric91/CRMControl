/**
 * The acknowledgement turns the download switch off, so anything edited after
 * it sits undelivered until someone turns it back on. Nothing fails while that
 * is true — the screen is the only thing that says so.
 */

import { afterEach, beforeEach, describe, expect, test } from '@rstest/core';
import { AxiosHeaders } from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { http, storeSession } from '../src/api/http';
import type { Gateway, GatewayConfigStatus } from '../src/api/types';
import { ToastProvider } from '../src/context/ToastContext';
import { GatewayConfigPanel } from '../src/features/gateways/GatewayConfigPanel';

const GATEWAY: Gateway = {
  id: 'gw-1',
  site_id: 's-1',
  numero_serie: 'GW-1',
  uuid: '911bbd6c-0000-4000-8000-000000000000',
  firmware_version: null,
  ultima_conexion: null,
  ip_actual: null,
  estado: 'online',
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

const BASE: GatewayConfigStatus = {
  gateway_id: GATEWAY.id,
  uuid: GATEWAY.uuid,
  config_habilitada: false,
  config_version_actual: 'a'.repeat(64),
  config_version_aplicada: 'a'.repeat(64),
  config_aplicada_en: '2026-08-04T12:30:00Z',
  ultima_conexion: '2026-08-04T12:35:00Z',
  desactualizada: false,
};

const originalAdapter = http.defaults.adapter;
let patched: unknown = null;

function serve(status: GatewayConfigStatus) {
  http.defaults.adapter = (config: InternalAxiosRequestConfig) => {
    if ((config.method ?? 'get').toLowerCase() === 'patch') {
      patched = config.data;
      return Promise.resolve({
        data: { ...GATEWAY, config_habilitada: true },
        status: 200,
        statusText: '',
        headers: new AxiosHeaders(),
        config,
      } satisfies AxiosResponse);
    }
    return Promise.resolve({
      data: status,
      status: 200,
      statusText: '',
      headers: new AxiosHeaders(),
      config,
    } satisfies AxiosResponse);
  };
}

function mount(compact = false) {
  render(
    <ToastProvider>
      <GatewayConfigPanel
        gateway={GATEWAY}
        writable
        compact={compact}
        onGatewayChange={() => undefined}
      />
    </ToastProvider>,
  );
}

beforeEach(() => {
  patched = null;
  localStorage.clear();
  storeSession({
    access_token: 'a',
    refresh_token: 'r',
    token_type: 'bearer',
    expires_in: 1800,
  });
});

afterEach(() => {
  cleanup();
  http.defaults.adapter = originalAdapter;
  localStorage.clear();
});

describe('GatewayConfigPanel', () => {
  test('up to date: says so and offers no action', async () => {
    serve(BASE);
    mount();

    expect(
      await screen.findByText(/está corriendo la configuración actual/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Habilitar descarga' }),
    ).toBeNull();
  });

  test('edited but not enabled: warns and brings the action', async () => {
    serve({
      ...BASE,
      desactualizada: true,
      config_version_actual: 'b'.repeat(64),
    });
    mount();

    expect(
      await screen.findByText(/cambios que el gateway todavía no tiene/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Habilitar descarga' }),
    ).toBeInTheDocument();
  });

  test('enabling sends exactly the switch', async () => {
    serve({
      ...BASE,
      desactualizada: true,
      config_version_actual: 'b'.repeat(64),
    });
    mount();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Habilitar descarga' }),
    );

    await waitFor(() => {
      expect(patched).not.toBeNull();
    });
    expect(JSON.parse(String(patched))).toEqual({ config_habilitada: true });
  });

  test('enabled and waiting: no action, it is the gateway’s turn', async () => {
    serve({
      ...BASE,
      desactualizada: true,
      config_habilitada: true,
      config_version_actual: 'b'.repeat(64),
    });
    mount();

    expect(
      await screen.findByText(/esperando que el gateway consulte/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Habilitar descarga' }),
    ).toBeNull();
  });

  test('never applied: a new install, not a failure', async () => {
    serve({
      ...BASE,
      desactualizada: true,
      config_version_aplicada: null,
      config_aplicada_en: null,
    });
    mount();

    expect(
      await screen.findByText(/todavía no aplicó ninguna configuración/i),
    ).toBeInTheDocument();
  });

  test('never shows a whole hash', async () => {
    serve(BASE);
    mount();

    await screen.findByText(/está corriendo la configuración actual/i);
    expect(document.body.textContent).not.toContain('a'.repeat(64));
  });

  test('compact mode shows only what needs an action', async () => {
    serve(BASE);
    mount(true);
    await waitFor(() => {
      expect(screen.queryByRole('status')).toBeNull();
    });

    cleanup();
    serve({
      ...BASE,
      desactualizada: true,
      config_version_actual: 'b'.repeat(64),
    });
    mount(true);
    expect(
      await screen.findByRole('button', { name: 'Habilitar descarga' }),
    ).toBeInTheDocument();
  });
});
