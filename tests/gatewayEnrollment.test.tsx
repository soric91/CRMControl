/**
 * El comando de instalación, en la ficha del gateway.
 *
 * Un comando vivo entrega la configuración entera del equipo: la contraseña
 * del broker, la credencial, las URLs. Así que lo que se prueba es sobre todo
 * que se vea una sola vez y que no quede en ningún lado — ni en el estado, ni
 * en el DOM, ni en una segunda petición.
 */

import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from '@rstest/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http } from '../src/api/http';
import type { Gateway } from '../src/api';
import { GatewayEnrollmentPanel } from '../src/features/gateways/GatewayEnrollmentPanel';
import { ToastProvider } from '../src/context/ToastContext';

const COMANDO =
  'curl -fsSL https://ems.example/install.sh | sudo EMS_TOKEN=k3f9x2 bash';

const GATEWAY = {
  id: 'gw-1',
  uuid: '5ed37c34-2b2d-47b4-858f-ae401a6f9d5a',
  numero_serie: 'GW-0042',
} as unknown as Gateway;

function Con({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

async function generar() {
  fireEvent.click(screen.getByText('Generar comando'));
  // El diálogo de confirmación aparece primero: emitir invalida los comandos
  // anteriores y rota la credencial del equipo.
  await waitFor(() => expect(screen.getByText('Generar')).toBeInTheDocument());
  fireEvent.click(screen.getByText('Generar'));
}

describe('emitir el comando', () => {
  test('pide confirmación antes, no después', async () => {
    // Emitirlo sin querer deja sin conexión a un equipo que funcionaba: al
    // usarse rota la credencial que ese equipo ya tiene cargada.
    render(<GatewayEnrollmentPanel gateway={GATEWAY} writable />, {
      wrapper: Con,
    });

    fireEvent.click(screen.getByText('Generar comando'));

    expect(pedidos).toHaveLength(0);
    // El texto del diálogo, no el del panel: los dos avisan de lo mismo y hay
    // que mirar el que aparece recién al apretar.
    expect(screen.getByText(/reconfigura desde cero/)).toBeInTheDocument();
  });

  test('muestra el comando entero, no solo el token', async () => {
    // Rearmarlo a mano en un chat es una oportunidad de equivocarse: un
    // espacio de más, la URL vieja, el token cortado.
    render(<GatewayEnrollmentPanel gateway={GATEWAY} writable />, {
      wrapper: Con,
    });

    await generar();

    await waitFor(() => expect(screen.getByText(COMANDO)).toBeInTheDocument());
  });

  test('avisa que no se puede volver a ver', async () => {
    render(<GatewayEnrollmentPanel gateway={GATEWAY} writable />, {
      wrapper: Con,
    });

    await generar();

    await waitFor(() =>
      expect(screen.getByText(/no se puede volver a ver/)).toBeInTheDocument(),
    );
  });

  test('al cerrar, el comando desaparece del DOM', async () => {
    // No basta con ocultarlo: si siguiera montado, estaría en las
    // herramientas de desarrollo de quien abra esa pantalla después.
    render(<GatewayEnrollmentPanel gateway={GATEWAY} writable />, {
      wrapper: Con,
    });
    await generar();
    await waitFor(() => expect(screen.getByText(COMANDO)).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText(/cerrar/i));

    await waitFor(() => expect(screen.queryByText(COMANDO)).toBeNull());
  });

  test('no se pide de nuevo al reabrir', async () => {
    // Si el panel guardara el último comando y lo volviera a mostrar, dejaría
    // de ser de un solo uso en la práctica.
    render(<GatewayEnrollmentPanel gateway={GATEWAY} writable />, {
      wrapper: Con,
    });
    await generar();
    await waitFor(() => expect(screen.getByText(COMANDO)).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText(/cerrar/i));
    await waitFor(() => expect(screen.queryByText(COMANDO)).toBeNull());

    fireEvent.click(screen.getByText('Generar comando'));

    expect(screen.queryByText(COMANDO)).toBeNull();
  });
});

describe('quién puede', () => {
  test('sin permiso de escritura no se ofrece', async () => {
    render(<GatewayEnrollmentPanel gateway={GATEWAY} writable={false} />, {
      wrapper: Con,
    });

    expect(screen.queryByText('Generar comando')).toBeNull();
  });

  test('el panel explica qué rompe, no solo qué hace', async () => {
    // Quien lo genere sin saberlo puede dejar sin conexión un equipo que
    // estaba funcionando.
    render(<GatewayEnrollmentPanel gateway={GATEWAY} writable />, {
      wrapper: Con,
    });

    expect(screen.getByText(/deja de servir/)).toBeInTheDocument();
  });
});

// --- andamiaje ---------------------------------------------------------

const adapterOriginal = http.defaults.adapter;
let pedidos: string[] = [];

beforeEach(() => {
  pedidos = [];
  http.defaults.adapter = (config) => {
    pedidos.push(`${(config.method ?? 'get').toUpperCase()} ${config.url}`);
    return Promise.resolve({
      data: {
        token: 'k3f9x2',
        expira_en: '2026-08-08T04:00:00Z',
        comando: COMANDO,
      },
      status: 201,
      statusText: 'Created',
      headers: {},
      config,
    });
  };
});

afterEach(() => {
  pedidos = [];
});

afterAll(() => {
  http.defaults.adapter = adapterOriginal;
});
