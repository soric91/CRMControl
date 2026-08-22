/**
 * El panel de firmware de un gateway.
 *
 * Lo que se prueba es lo que hace que un despliegue no sea a ciegas: que la
 * pantalla nombre el estado del equipo, que ofrezca cancelar sólo cuando
 * todavía se puede, y que un equipo omitido —o una flota apagada— no se lea
 * como un despliegue hecho.
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
import type {
  FirmwareRelease,
  FirmwareUpdateStatus,
  Gateway,
  RolloutResult,
} from '../src/api/types';
import { ToastProvider } from '../src/context/ToastContext';
import { GatewayFirmwarePanel } from '../src/features/gateways/GatewayFirmwarePanel';

const GATEWAY: Gateway = {
  id: 'gw-1',
  site_id: 's-1',
  numero_serie: 'GW-1',
  uuid: '911bbd6c-0000-4000-8000-000000000000',
  firmware_version: '1.3.0',
  ultima_conexion: '2026-08-21T12:00:00Z',
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

const SIN_PENDIENTE: FirmwareUpdateStatus = {
  gateway_uuid: GATEWAY.uuid,
  estado: 'sin_pendiente',
  version_objetivo: null,
  version_actual: '1.3.0',
  aplicar_desde: null,
  intentos: 0,
  intentos_restantes: 3,
  error: null,
  reportado_en: null,
};

const RELEASE: FirmwareRelease = {
  id: 'rel-1',
  version: 'v1.4.0',
  canal: 'estable',
  sha256: 'a'.repeat(64),
  tamano_bytes: 4_194_304,
  notas: 'Arregla el watchdog',
  retirado_en: null,
  publicado_por: null,
  created_at: '2026-08-20T00:00:00Z',
  gateways_apuntando: 0,
};

const ROLLOUT_OK: RolloutResult = {
  version: 'v1.4.0',
  flota_activa: true,
  programados: [
    {
      gateway_id: GATEWAY.id,
      numero_serie: 'GW-1',
      version_anterior: '1.3.0',
      aplicar_desde: '2026-08-22T08:00:00Z',
      descenso: false,
    },
  ],
  omitidos: [],
};

const originalAdapter = http.defaults.adapter;
let enviado: unknown = null;
let cancelado = false;

function ok(data: unknown, config: InternalAxiosRequestConfig) {
  return Promise.resolve({
    data,
    status: 200,
    statusText: '',
    headers: new AxiosHeaders(),
    config,
  } satisfies AxiosResponse);
}

function serve(
  status: FirmwareUpdateStatus,
  options: { rollout?: RolloutResult; releases?: FirmwareRelease[] } = {},
) {
  http.defaults.adapter = (config: InternalAxiosRequestConfig) => {
    const method = (config.method ?? 'get').toLowerCase();
    const url = config.url ?? '';

    if (method === 'delete') {
      cancelado = true;
      return ok({ ...status, estado: 'sin_pendiente' }, config);
    }
    if (method === 'post') {
      enviado = config.data;
      return ok(options.rollout ?? ROLLOUT_OK, config);
    }
    if (url.includes('/firmware/releases')) {
      return ok(options.releases ?? [RELEASE], config);
    }
    return ok(status, config);
  };
}

function mount(manageable = true) {
  render(
    <ToastProvider>
      <GatewayFirmwarePanel gateway={GATEWAY} manageable={manageable} />
    </ToastProvider>,
  );
}

beforeEach(() => {
  enviado = null;
  cancelado = false;
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

describe('GatewayFirmwarePanel', () => {
  test('sin nada pedido, lo dice y no ofrece cancelar', async () => {
    serve(SIN_PENDIENTE);
    mount();

    expect(
      await screen.findByText(/Sin actualización pendiente/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Cancelar la actualización/i }),
    ).toBeNull();
  });

  test('programada: nombra la versión pedida y deja cancelar', async () => {
    serve({
      ...SIN_PENDIENTE,
      estado: 'programada',
      version_objetivo: 'v1.4.0',
      aplicar_desde: '2026-08-22T08:00:00Z',
    });
    mount();

    expect(
      await screen.findByText(/Actualización programada/i),
    ).toBeInTheDocument();
    expect(screen.getByText('v1.4.0')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Cancelar la actualización/i }),
    ).toBeInTheDocument();
  });

  test('aplicando: no se puede cancelar, porque ya se está reiniciando', async () => {
    serve({
      ...SIN_PENDIENTE,
      estado: 'aplicando',
      version_objetivo: 'v1.4.0',
      intentos: 1,
      intentos_restantes: 2,
    });
    mount();

    expect(
      await screen.findByText(/Aplicando la versión nueva/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Cancelar la actualización/i }),
    ).toBeNull();
  });

  test('fallida: muestra el motivo que reportó el equipo', async () => {
    serve({
      ...SIN_PENDIENTE,
      estado: 'fallida',
      version_objetivo: 'v1.4.0',
      intentos: 1,
      intentos_restantes: 2,
      error: 'sha256 no coincide',
    });
    mount();

    expect(
      await screen.findByText(/La actualización falló/i),
    ).toBeInTheDocument();
    expect(screen.getByText('sha256 no coincide')).toBeInTheDocument();
  });

  test('sin intentos: dice que el equipo dejó de intentarlo', async () => {
    serve({
      ...SIN_PENDIENTE,
      estado: 'fallida',
      version_objetivo: 'v1.4.0',
      intentos: 3,
      intentos_restantes: 0,
      error: 'el servicio no arrancó',
    });
    mount();

    expect(
      await screen.findByText(/Se agotaron los intentos/i),
    ).toBeInTheDocument();
  });

  test('sin permiso de administrador no se ofrece desplegar', async () => {
    serve(SIN_PENDIENTE);
    mount(false);

    expect(
      await screen.findByText(/Sin actualización pendiente/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Actualizar firmware/i }),
    ).toBeNull();
  });

  test('desplegar manda el gateway y la versión elegidos', async () => {
    serve(SIN_PENDIENTE);
    mount();

    fireEvent.click(
      await screen.findByRole('button', { name: /Actualizar firmware/i }),
    );
    const select = await screen.findByLabelText(/Versión/i);
    fireEvent.change(select, { target: { value: 'rel-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Desplegar' }));

    await waitFor(() => {
      expect(enviado).not.toBeNull();
    });
    expect(JSON.parse(String(enviado))).toEqual({
      release_id: 'rel-1',
      gateway_ids: ['gw-1'],
      ahora: false,
    });
  });

  test('por omisión se espera a la ventana, no se instala ya', async () => {
    serve(SIN_PENDIENTE);
    mount();

    fireEvent.click(
      await screen.findByRole('button', { name: /Actualizar firmware/i }),
    );

    expect(
      await screen.findByLabelText(/Instalar apenas el equipo pregunte/i),
    ).not.toBeChecked();
  });

  test('un equipo omitido no se lee como un despliegue hecho', async () => {
    serve(SIN_PENDIENTE, {
      rollout: {
        version: 'v1.4.0',
        flota_activa: true,
        programados: [],
        omitidos: [
          {
            gateway_id: GATEWAY.id,
            numero_serie: 'GW-1',
            motivo: 'No tiene credencial: no podría bajar el paquete',
          },
        ],
      },
    });
    mount();

    fireEvent.click(
      await screen.findByRole('button', { name: /Actualizar firmware/i }),
    );
    fireEvent.change(await screen.findByLabelText(/Versión/i), {
      target: { value: 'rel-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Desplegar' }));

    expect(await screen.findByText(/No tiene credencial/i)).toBeInTheDocument();
  });

  test('con la flota apagada, avisa que nadie va a bajarla', async () => {
    serve(SIN_PENDIENTE, {
      rollout: { ...ROLLOUT_OK, flota_activa: false },
    });
    mount();

    fireEvent.click(
      await screen.findByRole('button', { name: /Actualizar firmware/i }),
    );
    fireEvent.change(await screen.findByLabelText(/Versión/i), {
      target: { value: 'rel-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Desplegar' }));

    expect(
      await screen.findByText(/actualizaciones están desactivadas/i),
    ).toBeInTheDocument();
  });

  test('una versión retirada no se ofrece para desplegar', async () => {
    serve(SIN_PENDIENTE, {
      releases: [{ ...RELEASE, retirado_en: '2026-08-21T00:00:00Z' }],
    });
    mount();

    fireEvent.click(
      await screen.findByRole('button', { name: /Actualizar firmware/i }),
    );

    expect(
      await screen.findByText(/No hay versiones publicadas/i),
    ).toBeInTheDocument();
  });

  test('cancelar llama al backend y deja el equipo sin nada pedido', async () => {
    serve({
      ...SIN_PENDIENTE,
      estado: 'programada',
      version_objetivo: 'v1.4.0',
    });
    mount();

    fireEvent.click(
      await screen.findByRole('button', { name: /Cancelar la actualización/i }),
    );

    await waitFor(() => {
      expect(cancelado).toBe(true);
    });
    expect(
      await screen.findByText(/Sin actualización pendiente/i),
    ).toBeInTheDocument();
  });
});
