/**
 * La configuración compartida de la flota.
 *
 * Es la única pantalla del panel que muestra secretos **recuperables**. Todo
 * lo demás —la credencial de un gateway, el secreto de una cuenta de
 * servicio— se ve una vez al emitirlo y nunca más.
 *
 * Entonces lo que se prueba es lo que compensa esa diferencia: que el valor
 * no llegue al navegador hasta que alguien lo pida, y que «tapado» y «sin
 * cargar» no se vean igual.
 */

import { afterAll, afterEach, describe, expect, test } from '@rstest/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http } from '../src/api/http';
import type { PlatformSetting } from '../src/api';
import { PlatformSettingsPanel } from '../src/features/services/PlatformSettingsPanel';
import { agrupar } from '../src/features/services/grouping';
import { ToastProvider } from '../src/context/ToastContext';

const PUERTO: PlatformSetting = {
  id: '1',
  clave: 'MQTT_PORT',
  origen: 'plataforma',
  valor: '8883',
  es_secreto: false,
  tiene_valor: true,
  descripcion: 'Puerto del broker. 8883 exige TLS',
  updated_at: '2026-08-07T12:00:00Z',
};

const CLAVE_CARGADA: PlatformSetting = {
  id: '2',
  clave: 'MQTT_PASSWORD',
  origen: 'plataforma',
  valor: null,
  es_secreto: true,
  tiene_valor: true,
  descripcion: '',
  updated_at: '2026-08-07T12:00:00Z',
};

const CLAVE_VACIA: PlatformSetting = {
  ...CLAVE_CARGADA,
  id: '3',
  clave: 'INFLUXDB_SERVER_TOKEN',
  tiene_valor: false,
};

const SECRETO = 'la-clave-de-verdad';

describe('lo que se muestra', () => {
  test('un valor que no es secreto se ve', async () => {
    // Tapar `MQTT_PORT=8883` es teatro y vuelve la pantalla inútil.
    servir([PUERTO]);

    render(<PlatformSettingsPanel />, { wrapper: ConToasts });

    await waitFor(() => expect(screen.getByText('8883')).toBeInTheDocument());
  });

  test('un secreto cargado se ve tapado', async () => {
    servir([CLAVE_CARGADA]);

    render(<PlatformSettingsPanel />, { wrapper: ConToasts });

    await waitFor(() =>
      expect(screen.getByText('MQTT_PASSWORD')).toBeInTheDocument(),
    );
    expect(screen.getByText(/•+/)).toBeInTheDocument();
  });

  test('un secreto sin cargar no se ve tapado: se ve vacío', async () => {
    // Si se vieran igual, la carga pendiente parecería hecha — y un secreto
    // vacío es un gateway que no va a poder conectar.
    servir([CLAVE_VACIA]);

    render(<PlatformSettingsPanel />, { wrapper: ConToasts });

    await waitFor(() =>
      expect(screen.getByText('sin cargar')).toBeInTheDocument(),
    );
  });

  test('avisa cuántos secretos faltan cargar', async () => {
    servir([PUERTO, CLAVE_VACIA]);

    render(<PlatformSettingsPanel />, { wrapper: ConToasts });

    await waitFor(() =>
      expect(
        screen.getByText(/Falta cargar INFLUXDB_SERVER_TOKEN/),
      ).toBeInTheDocument(),
    );
  });
});

describe('ver un secreto', () => {
  test('no llega al navegador hasta que se pide', async () => {
    // El listado no lo trae. Si llegara y solo se tapara con CSS, estaría en
    // el DOM y en las herramientas de desarrollo desde el primer render.
    servir([CLAVE_CARGADA]);

    render(<PlatformSettingsPanel />, { wrapper: ConToasts });

    await waitFor(() =>
      expect(screen.getByText('MQTT_PASSWORD')).toBeInTheDocument(),
    );
    expect(screen.queryByText(SECRETO)).toBeNull();
    expect(pedidos.some((p) => p.includes('reveal'))).toBe(false);
  });

  test('pedirlo lo trae', async () => {
    servir([CLAVE_CARGADA]);
    render(<PlatformSettingsPanel />, { wrapper: ConToasts });
    await waitFor(() =>
      expect(screen.getByText('MQTT_PASSWORD')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Ver'));

    await waitFor(() => expect(screen.getByText(SECRETO)).toBeInTheDocument());
  });

  test('se puede volver a tapar', async () => {
    servir([CLAVE_CARGADA]);
    render(<PlatformSettingsPanel />, { wrapper: ConToasts });
    await waitFor(() =>
      expect(screen.getByText('MQTT_PASSWORD')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Ver'));
    await waitFor(() => expect(screen.getByText(SECRETO)).toBeInTheDocument());

    fireEvent.click(screen.getByText('Ocultar'));

    expect(screen.queryByText(SECRETO)).toBeNull();
  });

  test('un secreto sin cargar no ofrece «Ver»', async () => {
    servir([CLAVE_VACIA]);

    render(<PlatformSettingsPanel />, { wrapper: ConToasts });

    await waitFor(() =>
      expect(screen.getByText('sin cargar')).toBeInTheDocument(),
    );
    expect(screen.queryByText('Ver')).toBeNull();
  });
});

describe('editar', () => {
  test('editar un secreto arranca con el valor real, no con los puntos', async () => {
    // Un campo que arranca con los puntos guardaría los puntos.
    servir([CLAVE_CARGADA]);
    render(<PlatformSettingsPanel />, { wrapper: ConToasts });
    await waitFor(() =>
      expect(screen.getByText('MQTT_PASSWORD')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Editar'));

    await waitFor(() =>
      expect(screen.getByLabelText('Valor de MQTT_PASSWORD')).toHaveValue(
        SECRETO,
      ),
    );
  });

  test('guardar manda el valor nuevo', async () => {
    servir([PUERTO]);
    render(<PlatformSettingsPanel />, { wrapper: ConToasts });
    await waitFor(() => expect(screen.getByText('8883')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Editar'));

    fireEvent.change(screen.getByLabelText('Valor de MQTT_PORT'), {
      target: { value: '1883' },
    });
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() =>
      expect(enviado).toEqual({
        valor: '1883',
        descripcion: 'Puerto del broker. 8883 exige TLS',
      }),
    );
  });

  test('la descripción también se edita', async () => {
    // La API siempre lo soportó; la pantalla no lo exponía, así que corregir
    // un texto mal escrito obligaba a una migración.
    servir([PUERTO]);
    render(<PlatformSettingsPanel />, { wrapper: ConToasts });
    await waitFor(() => expect(screen.getByText('8883')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Editar'));

    fireEvent.change(screen.getByLabelText('Descripción de MQTT_PORT'), {
      target: { value: 'Otro texto' },
    });
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() =>
      expect(enviado).toEqual({ valor: '8883', descripcion: 'Otro texto' }),
    );
  });
});

// --- andamiaje ---------------------------------------------------------

function ConToasts({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

const adapterOriginal = http.defaults.adapter;
let pedidos: string[] = [];
let enviado: unknown = null;

function servir(settings: PlatformSetting[]): void {
  http.defaults.adapter = (config) => {
    const url = config.url ?? '';
    pedidos.push(url);

    const responder = (data: unknown) =>
      Promise.resolve({
        data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      });

    if (url.includes('/reveal')) {
      return responder({ clave: 'MQTT_PASSWORD', valor: SECRETO });
    }
    if ((config.method ?? 'get').toLowerCase() === 'patch') {
      enviado = JSON.parse(String(config.data)) as unknown;
      return responder(settings[0]);
    }
    return responder(settings);
  };
}

afterEach(() => {
  pedidos = [];
  enviado = null;
});

afterAll(() => {
  http.defaults.adapter = adapterOriginal;
});

describe('el agrupado', () => {
  test('el InfluxDB local no queda partido por el del servidor', async () => {
    // En orden alfabético, INFLUXDB_URL (local) cae después del bloque
    // INFLUXDB_SERVER_*, así que las locales quedan separadas entre sí por
    // las del servidor. Es justo la distinción que importa: una base vive en
    // el gateway y la otra es central.
    const grupos = agrupar([
      { ...PUERTO, id: 'a', clave: 'INFLUXDB_BUCKET' },
      { ...PUERTO, id: 'b', clave: 'INFLUXDB_SERVER_ORG' },
      { ...PUERTO, id: 'c', clave: 'INFLUXDB_URL' },
    ]);

    const local = grupos.find((g) => g.titulo === 'InfluxDB local');
    expect(local?.settings.map((s) => s.clave)).toEqual([
      'INFLUXDB_BUCKET',
      'INFLUXDB_URL',
    ]);
  });

  test('las del servidor no caen en el grupo local', async () => {
    // Con el prefijo corto evaluado primero, INFLUXDB_SERVER_* entraría en
    // «InfluxDB local» — y ahí el panel diría que un token central vive en el
    // equipo, que es lo contrario de la verdad.
    const grupos = agrupar([{ ...PUERTO, clave: 'INFLUXDB_SERVER_TOKEN' }]);

    expect(grupos.map((g) => g.titulo)).toEqual(['InfluxDB central']);
  });

  test('una variable con un prefijo desconocido no desaparece', async () => {
    const grupos = agrupar([{ ...PUERTO, clave: 'MODBUS_TIMEOUT_MS' }]);

    const ultimo = grupos[grupos.length - 1];
    expect(ultimo?.titulo).toBe('Otras');
    expect(ultimo?.settings).toHaveLength(1);
  });

  test('un grupo sin variables no se dibuja', async () => {
    const grupos = agrupar([{ ...PUERTO, clave: 'MQTT_PORT' }]);

    expect(grupos.map((g) => g.titulo)).toEqual(['Broker MQTT']);
  });

  test('la pantalla muestra los títulos de grupo', async () => {
    servir([PUERTO, { ...CLAVE_VACIA, clave: 'INFLUXDB_SERVER_TOKEN' }]);

    render(<PlatformSettingsPanel />, { wrapper: ConToasts });

    await waitFor(() =>
      expect(screen.getByText('Broker MQTT')).toBeInTheDocument(),
    );
    expect(screen.getByText('InfluxDB central')).toBeInTheDocument();
  });
});

describe('las variables que el CRM no llena', () => {
  const DEL_EQUIPO: PlatformSetting = {
    ...CLAVE_CARGADA,
    id: '9',
    clave: 'INFLUXDB_TOKEN',
    origen: 'equipo',
    tiene_valor: false,
    descripcion: 'La genera el equipo al instalarse.',
  };

  const DE_IDENTIDAD: PlatformSetting = {
    ...PUERTO,
    id: '8',
    clave: 'GATEWAY_UUID',
    origen: 'identidad',
    valor: '',
    tiene_valor: false,
  };

  test('van en bloques propios, al final', async () => {
    // Mezcladas entre las editables, una fila vacía sin botones se lee como
    // una que falta cargar.
    const grupos = agrupar([PUERTO, DEL_EQUIPO, DE_IDENTIDAD]);

    expect(grupos.map((g) => g.titulo)).toEqual([
      'Broker MQTT',
      'Identidad del equipo',
      'Se generan en el equipo',
    ]);
  });

  test('sus bloques no son editables', async () => {
    const grupos = agrupar([DEL_EQUIPO]);

    expect(grupos[0]?.editable).toBe(false);
  });

  test('no ofrecen editar ni eliminar', async () => {
    // Guardar un valor que nadie va a leer es la peor configuración: la que
    // parece aplicada.
    servir([DEL_EQUIPO]);

    render(<PlatformSettingsPanel />, { wrapper: ConToasts });

    await waitFor(() =>
      expect(screen.getByText('INFLUXDB_TOKEN')).toBeInTheDocument(),
    );
    expect(screen.queryByText('Editar')).toBeNull();
    expect(screen.queryByText('Eliminar')).toBeNull();
  });

  test('dicen quién las llena', async () => {
    // Un campo vacío sin explicación se lee como algo que falta cargar.
    servir([DEL_EQUIPO]);

    render(<PlatformSettingsPanel />, { wrapper: ConToasts });

    await waitFor(() =>
      expect(screen.getByText('lo genera el equipo')).toBeInTheDocument(),
    );
  });

  test('el prefijo GATEWAY_ no se traga la identidad del equipo', async () => {
    // `GATEWAY_RELEASE_VERSION` es de plataforma y va al grupo de software.
    // `GATEWAY_UUID` y `GATEWAY_CREDENTIAL` empiezan igual pero son identidad:
    // si cayeran en ese grupo, el panel ofrecería editar la credencial del
    // gateway — y guardar ahí un valor que nadie lee es la peor
    // configuración, la que parece aplicada.
    const version: PlatformSetting = {
      ...PUERTO,
      id: '20',
      clave: 'GATEWAY_RELEASE_VERSION',
      valor: 'v0.0.2',
    };
    const credencial: PlatformSetting = {
      ...DE_IDENTIDAD,
      id: '21',
      clave: 'GATEWAY_CREDENTIAL',
    };

    const grupos = agrupar([version, DE_IDENTIDAD, credencial]);

    const software = grupos.find((g) => g.titulo === 'Software del equipo');
    expect(software?.settings.map((s) => s.clave)).toEqual([
      'GATEWAY_RELEASE_VERSION',
    ]);
    expect(software?.editable).toBe(true);

    const identidad = grupos.find((g) => g.titulo === 'Identidad del equipo');
    expect(identidad?.settings.map((s) => s.clave)).toEqual([
      'GATEWAY_UUID',
      'GATEWAY_CREDENTIAL',
    ]);
    expect(identidad?.editable).toBe(false);
  });

  test('no cuentan como secretos pendientes', async () => {
    // El aviso de arriba es para lo que alguien puede resolver en esta
    // pantalla. Contar las del equipo sería una alarma sin salida.
    servir([DEL_EQUIPO]);

    render(<PlatformSettingsPanel />, { wrapper: ConToasts });

    await waitFor(() =>
      expect(screen.getByText('INFLUXDB_TOKEN')).toBeInTheDocument(),
    );
    expect(screen.queryByText(/Falta cargar/)).toBeNull();
  });
});
