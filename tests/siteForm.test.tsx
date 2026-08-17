/**
 * F0.6 — la sede declara si tiene generación propia.
 *
 * Tres estados y no dos: sin declarar, la analítica deduce el modo de la
 * energía exportada. Marcar "no" en una sede que sí tiene solar le apagaría la
 * exportación y el balance neto en el panel, así que el formulario nunca elige
 * por su cuenta.
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
import { ToastProvider } from '../src/context/ToastContext';
import { SiteForm } from '../src/features/sites/SiteForm';
import type { Site } from '../src/api';

const originalAdapter = http.defaults.adapter;
let sent: unknown = null;

const SEDE_SOLAR: Site = {
  id: 'sede-1',
  client_id: 'cli-1',
  nombre: 'Casa',
  direccion: null,
  timezone: 'America/Bogota',
  ciudad: 'Medellín',
  responsable_nombre: null,
  tiene_generacion: true,
  capacidad_kwp: '5.50',
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
};

function mount(site: Site | null = null) {
  render(
    <ToastProvider>
      <SiteForm
        clientId="cli-1"
        site={site}
        onClose={() => undefined}
        onSaved={() => undefined}
      />
    </ToastProvider>,
  );
}

function reply(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  sent = config.data;
  return Promise.resolve({
    data: {},
    status: 201,
    statusText: '',
    headers: new AxiosHeaders(),
    config,
  });
}

function enviado(): Record<string, unknown> {
  return JSON.parse(String(sent)) as Record<string, unknown>;
}

async function submitAndWait() {
  submit();
  // El envío es asíncrono: sin esperar, `sent` todavía es null.
  await waitFor(() => {
    expect(sent).not.toBe(null);
  });
}

function submit() {
  // El botón vive en el pie del Drawer y se ata por `form=`.
  const form = document.getElementById('site-form');
  if (!form) throw new Error('El formulario no está montado');
  fireEvent.submit(form);
}

beforeEach(() => {
  sent = null;
  localStorage.clear();
  storeSession({
    access_token: 'a',
    refresh_token: 'r',
    token_type: 'bearer',
    expires_in: 1800,
  });
  http.defaults.adapter = reply;
});

afterEach(() => {
  cleanup();
  http.defaults.adapter = originalAdapter;
  localStorage.clear();
});

describe('la generación propia de una sede', () => {
  test('una sede nueva se manda sin declarar, para que se detecte', async () => {
    mount();
    fireEvent.change(screen.getByLabelText(/^Nombre/), {
      target: { value: 'Bodega' },
    });

    await submitAndWait();

    // null, no false: nadie revisó la instalación todavía.
    expect(enviado().tiene_generacion).toBe(null);
    expect(enviado().capacidad_kwp).toBe(null);
  });

  test('declararla con generación habilita la capacidad y la manda', async () => {
    mount();
    fireEvent.change(screen.getByLabelText(/^Nombre/), {
      target: { value: 'Casa' },
    });
    fireEvent.change(screen.getByLabelText('Generación propia'), {
      target: { value: 'si' },
    });
    fireEvent.change(screen.getByLabelText('Capacidad instalada (kWp)'), {
      target: { value: '5.5' },
    });

    await submitAndWait();

    expect(enviado().tiene_generacion).toBe(true);
    expect(enviado().capacidad_kwp).toBe('5.5');
  });

  test('la capacidad solo aparece con generación declarada', () => {
    mount();

    expect(
      screen.queryByLabelText('Capacidad instalada (kWp)'),
    ).not.toBeInTheDocument();
  });

  test('pasar una sede solar a solo consumo limpia la capacidad', async () => {
    mount(SEDE_SOLAR);
    fireEvent.change(screen.getByLabelText('Generación propia'), {
      target: { value: 'no' },
    });

    await submitAndWait();

    expect(enviado().tiene_generacion).toBe(false);
    // Quedarse con los 5.5 kWp de un arreglo que ya no se declara sería un
    // dato contradictorio esperando a confundir a alguien.
    expect(enviado().capacidad_kwp).toBe(null);
  });

  test('una capacidad no positiva no se manda', () => {
    mount();
    fireEvent.change(screen.getByLabelText(/^Nombre/), {
      target: { value: 'Techo' },
    });
    fireEvent.change(screen.getByLabelText('Generación propia'), {
      target: { value: 'si' },
    });
    fireEvent.change(screen.getByLabelText('Capacidad instalada (kWp)'), {
      target: { value: '0' },
    });

    submit();

    expect(sent).toBe(null);
    expect(
      screen.getByText('La capacidad debe ser un número mayor que cero'),
    ).toBeInTheDocument();
  });

  test('al editar arranca con lo que la sede ya tenía', () => {
    mount(SEDE_SOLAR);

    expect(screen.getByLabelText('Generación propia')).toHaveValue('si');
    expect(screen.getByLabelText('Capacidad instalada (kWp)')).toHaveValue(
      '5.50',
    );
  });
});
