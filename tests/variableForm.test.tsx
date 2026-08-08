/**
 * The address has to leave the form exactly as it was typed, with the base
 * beside it. Converting here as well would put the same rule in two places,
 * and the day they disagree the gateway reads the wrong register without
 * anything failing.
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
import { VariableForm } from '../src/features/variables/VariableForm';

const originalAdapter = http.defaults.adapter;
let sent: unknown = null;

function mount() {
  render(
    <ToastProvider>
      <VariableForm
        equipmentId="eq-1"
        variable={null}
        onClose={() => undefined}
        onSaved={() => undefined}
      />
    </ToastProvider>,
  );
}

/** Lo mínimo del catálogo para que el desplegable tenga qué ofrecer. */
const CATALOGO = [
  {
    nombre: 'PhV_phsA',
    etiqueta: 'Tensión fase A',
    magnitud: 'tension',
    fase: 'A',
    unidad: 'V',
    acumulativa: false,
  },
  {
    nombre: 'TotWh_import',
    etiqueta: 'Energía activa importada',
    magnitud: 'energia_importada',
    fase: 'total',
    unidad: 'kWh',
    acumulativa: true,
  },
];

function reply(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  if (config.url?.includes('/variable-catalog')) {
    return Promise.resolve({
      data: CATALOGO,
      status: 200,
      statusText: '',
      headers: new AxiosHeaders(),
      config,
    });
  }
  sent = config.data;
  return Promise.resolve({
    data: {},
    status: 201,
    statusText: '',
    headers: new AxiosHeaders(),
    config,
  });
}

/**
 * Always set explicitly: the chosen base is remembered across openings on
 * purpose, so a test that relied on the default would depend on the order the
 * others ran in.
 */
function setBase(base: 'decimal' | 'hex') {
  fireEvent.change(screen.getByLabelText('Base del registro'), {
    target: { value: base },
  });
}

async function fill(register: string) {
  // El desplegable se llena con el catálogo, que llega por HTTP.
  const medicion = await screen.findByLabelText(/^Medición/);
  fireEvent.change(medicion, { target: { value: 'PhV_phsA' } });
  fireEvent.change(screen.getByLabelText(/^Registro Modbus/), {
    target: { value: register },
  });
}

function submit() {
  // El botón vive en el pie del Drawer y se ata al form por `form=`, así que
  // el evento va sobre el formulario, no sobre el botón.
  const form = document.getElementById('variable-form');
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

describe('VariableForm register field', () => {
  test('shows what the address would mean in the other base', async () => {
    mount();
    setBase('hex');
    await fill('2006');

    // The whole point: the operator sees 8198 before saving and can tell the
    // base is the one they meant.
    expect(screen.getByText('= 8198 decimal')).toBeInTheDocument();
  });

  test('complains at once when the text contradicts the base', async () => {
    mount();
    setBase('decimal');
    await fill('0x2006');

    expect(screen.getByText(/Parece hexadecimal/i)).toBeInTheDocument();
  });

  test('refuses hex letters while the base is decimal', async () => {
    mount();
    setBase('decimal');
    await fill('20ff');

    expect(screen.getByLabelText(/^Registro Modbus/)).toHaveValue('20');
  });

  test('sends the text as typed plus the notation, not a converted number', async () => {
    mount();
    setBase('hex');
    await fill('2006');
    submit();

    await waitFor(() => {
      expect(sent).not.toBeNull();
    });
    const payload: unknown = JSON.parse(String(sent));
    expect(payload).toMatchObject({
      registro_modbus: '2006',
      notacion_registro: 'hex',
    });
  });

  test('the chosen base carries over to the next variable', () => {
    mount();
    setBase('hex');
    cleanup();

    // A fleet is loaded from one vendor's datasheets, so the next variable is
    // almost always in the base the previous one used.
    mount();
    expect(screen.getByLabelText('Base del registro')).toHaveValue('hex');
  });

  test('an existing variable opens in its own base, unconverted', () => {
    render(
      <ToastProvider>
        <VariableForm
          equipmentId="eq-1"
          variable={{
            id: 'v-1',
            equipment_id: 'eq-1',
            nombre: 'PhV_phsA',
            registro_modbus: 8198,
            notacion_registro: 'hex',
            registro_display: '0x2006',
            tipo_registro: 'holding',
            tipo_dato: 'float32',
            escala: '1',
            unidad: 'V',
            magnitud: 'tension',
            fase: 'A',
            acumulativa: false,
            created_at: '2026-08-04T00:00:00Z',
            updated_at: '2026-08-04T00:00:00Z',
          }}
          onClose={() => undefined}
          onSaved={() => undefined}
        />
      </ToastProvider>,
    );

    expect(screen.getByLabelText(/^Registro Modbus/)).toHaveValue('0x2006');
    expect(screen.getByLabelText('Base del registro')).toHaveValue('hex');
  });
});

describe('el catálogo cerrado', () => {
  test('la medición se elige, no se escribe', async () => {
    mount();

    const medicion = await screen.findByLabelText(/^Medición/);
    // Un <select>: no admite un nombre que no esté en la lista, y ahí muere
    // la posibilidad de que convivan `Voltaje A` y `VOLTAGE_A`.
    expect(medicion.tagName).toBe('SELECT');
  });

  test('la unidad se muestra pero no se teclea', async () => {
    mount();
    fireEvent.change(await screen.findByLabelText(/^Medición/), {
      target: { value: 'PhV_phsA' },
    });

    // Derivada de qué se mide. Por eso `kw` contra `kW` dejó de ser posible.
    expect(await screen.findByText('V')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Unidad/)).not.toBeInstanceOf(
      HTMLInputElement,
    );
  });

  test('avisa cuál es un contador antes de guardar', async () => {
    mount();
    fireEvent.change(await screen.findByLabelText(/^Medición/), {
      target: { value: 'TotWh_import' },
    });

    // Un contador solo admite diferencias; tratarlo como instantáneo daría
    // promedios sin sentido. Que se vea al elegirlo evita la confusión.
    expect(
      await screen.findByText(/contador acumulativo/i),
    ).toBeInTheDocument();
  });

  test('no envía la unidad al backend', async () => {
    mount();
    await fill('2006');
    submit();

    await screen.findByText(/Variable creada/i).catch(() => undefined);
    const payload = JSON.parse(String(sent ?? '{}'));
    expect(payload).not.toHaveProperty('unidad');
    expect(payload.nombre).toBe('PhV_phsA');
  });
});
