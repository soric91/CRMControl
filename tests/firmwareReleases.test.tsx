/**
 * El catálogo de versiones del firmware.
 *
 * Publicar no es desplegar, y la pantalla tiene que sostener esa separación:
 * publicar no toca ningún equipo, retirar avisa a cuántos deja sin nada, y un
 * despliegue masivo muestra también a quién no llegó.
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
import type { FirmwareRelease, RolloutResult } from '../src/api/types';
import { ToastProvider } from '../src/context/ToastContext';
import { FirmwarePage } from '../src/features/firmware/FirmwarePage';

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
  gateways_apuntando: 3,
};

const ROLLOUT: RolloutResult = {
  version: 'v1.4.0',
  flota_activa: true,
  programados: [
    {
      gateway_id: 'gw-1',
      numero_serie: 'GW-1',
      version_anterior: '1.3.0',
      aplicar_desde: '2026-08-22T08:00:00Z',
      descenso: false,
    },
  ],
  omitidos: [
    {
      gateway_id: 'gw-2',
      numero_serie: 'GW-2',
      motivo: 'Ya está corriendo v1.4.0',
    },
  ],
};

const originalAdapter = http.defaults.adapter;
let posted: { url: string; body: unknown }[] = [];

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
  releases: FirmwareRelease[],
  options: { rollout?: RolloutResult } = {},
) {
  http.defaults.adapter = (config: InternalAxiosRequestConfig) => {
    const method = (config.method ?? 'get').toLowerCase();
    const url = config.url ?? '';

    if (method === 'post') {
      posted.push({ url, body: config.data });
      if (url.includes('/rollouts')) {
        return ok(options.rollout ?? ROLLOUT, config);
      }
      if (url.includes('/retire')) {
        return ok(
          { ...releases[0], retirado_en: '2026-08-21T00:00:00Z' },
          config,
        );
      }
      return ok(RELEASE, config);
    }
    if (url.includes('/clients')) {
      return ok(
        {
          items: [{ id: 'cli-1', nombre_empresa: 'Industrias Andinas' }],
          total: 1,
          limit: 100,
          offset: 0,
        },
        config,
      );
    }
    return ok(releases, config);
  };
}

function mount() {
  render(
    <ToastProvider>
      <FirmwarePage />
    </ToastProvider>,
  );
}

beforeEach(() => {
  posted = [];
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

describe('FirmwarePage', () => {
  test('sin versiones, invita a publicar una', async () => {
    serve([]);
    mount();

    expect(
      await screen.findByText(/Todavía no hay versiones publicadas/i),
    ).toBeInTheDocument();
  });

  test('cada versión dice cuántos equipos la tienen pedida', async () => {
    serve([RELEASE]);
    mount();

    expect(
      await screen.findByText(/3 equipo\(s\) la tienen pedida/i),
    ).toBeInTheDocument();
  });

  test('una versión retirada se ve marcada', async () => {
    serve([{ ...RELEASE, retirado_en: '2026-08-21T00:00:00Z' }]);
    mount();

    expect(await screen.findByText('retirada')).toBeInTheDocument();
  });

  test('publicar manda la versión y el checksum en minúsculas', async () => {
    serve([]);
    mount();

    fireEvent.click(
      await screen.findByRole('button', { name: /Publicar versión/i }),
    );
    fireEvent.change(await screen.findByLabelText(/^Versión/i), {
      target: { value: 'v1.4.0' },
    });
    fireEvent.change(screen.getByLabelText(/Checksum/i), {
      target: { value: 'A'.repeat(64) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));

    await waitFor(() => {
      expect(posted.length).toBeGreaterThan(0);
    });
    expect(JSON.parse(String(posted[0].body))).toEqual({
      version: 'v1.4.0',
      sha256: 'a'.repeat(64),
      canal: 'beta',
      notas: '',
    });
  });

  test('una versión que no se puede comparar no se publica', async () => {
    serve([]);
    mount();

    fireEvent.click(
      await screen.findByRole('button', { name: /Publicar versión/i }),
    );
    fireEvent.change(await screen.findByLabelText(/^Versión/i), {
      target: { value: 'latest' },
    });

    expect(
      await screen.findByText(/Tiene que ser 1.2.3 o v1.2.3/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeDisabled();
  });

  test('un checksum que no es un sha256 no se publica', async () => {
    serve([]);
    mount();

    fireEvent.click(
      await screen.findByRole('button', { name: /Publicar versión/i }),
    );
    fireEvent.change(await screen.findByLabelText(/Checksum/i), {
      target: { value: 'abc' },
    });

    expect(
      await screen.findByText(/64 caracteres hexadecimales/i),
    ).toBeInTheDocument();
  });

  test('una versión nueva nace en beta', async () => {
    serve([]);
    mount();

    fireEvent.click(
      await screen.findByRole('button', { name: /Publicar versión/i }),
    );

    expect(await screen.findByLabelText(/Canal/i)).toHaveValue('beta');
  });

  test('retirar avisa a cuántos equipos deja sin nada', async () => {
    serve([RELEASE]);
    mount();

    fireEvent.click(
      await screen.findByRole('button', {
        name: /Acciones de la versión v1.4.0/i,
      }),
    );
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Retirar' }));

    expect(
      await screen.findByText(/Los 3 equipo\(s\) que iban hacia ella/i),
    ).toBeInTheDocument();
  });

  test('el despliegue masivo muestra también a quién no llegó', async () => {
    serve([RELEASE]);
    mount();

    fireEvent.click(
      await screen.findByRole('button', {
        name: /Acciones de la versión v1.4.0/i,
      }),
    );
    fireEvent.click(
      await screen.findByRole('menuitem', {
        name: /Desplegar en una empresa/i,
      }),
    );
    fireEvent.change(await screen.findByLabelText(/Empresa/i), {
      target: { value: 'cli-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Desplegar' }));

    expect(await screen.findByText(/Sin pedir \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Ya está corriendo v1.4.0/i)).toBeInTheDocument();
    expect(screen.getByText(/Programados \(1\)/i)).toBeInTheDocument();
  });

  test('un despliegue con la flota apagada lo dice en el resultado', async () => {
    serve([RELEASE], { rollout: { ...ROLLOUT, flota_activa: false } });
    mount();

    fireEvent.click(
      await screen.findByRole('button', {
        name: /Acciones de la versión v1.4.0/i,
      }),
    );
    fireEvent.click(
      await screen.findByRole('menuitem', {
        name: /Desplegar en una empresa/i,
      }),
    );
    fireEvent.change(await screen.findByLabelText(/Empresa/i), {
      target: { value: 'cli-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Desplegar' }));

    expect(
      await screen.findByText(/ningún equipo va a bajarla/i),
    ).toBeInTheDocument();
  });
});
