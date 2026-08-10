import type { Magnitud } from '../api/types';
/** Display helpers. Everything user-facing is Spanish; values stay raw. */

import type {
  ClientStatus,
  EquipmentType,
  GatewayLogLevel,
  GatewayStatus,
  ModbusDataType,
  ModbusRegisterType,
  ModbusFunction,
  ModbusTransport,
  SerialParity,
  UserRole,
} from '../api/types';

// Exhaustive `Record`s on purpose: if the backend adds an enum value, the
// compiler flags every map that has not caught up.

export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  activo: 'Activo',
  suspendido: 'Suspendido',
  prospecto: 'Prospecto',
};

export const GATEWAY_STATUS_LABEL: Record<GatewayStatus, string> = {
  online: 'En línea',
  offline: 'Sin conexión',
};

export const EQUIPMENT_TYPE_LABEL: Record<EquipmentType, string> = {
  medidor: 'Medidor',
  analizador: 'Analizador',
  inversor: 'Inversor',
  sensor: 'Sensor',
};

export const MODBUS_REGISTER_TYPE_LABEL: Record<ModbusRegisterType, string> = {
  holding: 'Holding',
  input: 'Input',
  coil: 'Coil',
  discrete: 'Discrete',
};

export const MODBUS_DATA_TYPE_LABEL: Record<ModbusDataType, string> = {
  int16: 'int16',
  uint16: 'uint16',
  int32: 'int32',
  uint32: 'uint32',
  float32: 'float32',
};

export const GATEWAY_LOG_LEVEL_LABEL: Record<GatewayLogLevel, string> = {
  DEBUG: 'DEBUG — todo, para diagnosticar',
  INFO: 'INFO — operación normal',
  WARNING: 'WARNING — solo avisos',
  ERROR: 'ERROR — solo fallas',
  CRITICAL: 'CRITICAL — solo fallas graves',
};

/** El número es lo que el firmware manda al bus; el texto, para leerlo. */
export const MODBUS_FUNCTION_LABEL: Record<ModbusFunction, string> = {
  1: '01 · Coils',
  2: '02 · Discrete inputs',
  3: '03 · Holding registers',
  4: '04 · Input registers',
};

export const MODBUS_TRANSPORT_LABEL: Record<ModbusTransport, string> = {
  rtu: 'Modbus RTU (serie)',
  tcp: 'Modbus TCP (red)',
};

/** Short form, for table cells where the long label does not fit. */
export const MODBUS_TRANSPORT_SHORT: Record<ModbusTransport, string> = {
  rtu: 'RTU',
  tcp: 'TCP',
};

export const SERIAL_PARITY_LABEL: Record<SerialParity, string> = {
  N: 'Sin paridad (N)',
  E: 'Par (E)',
  O: 'Impar (O)',
};

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrador',
  tecnico: 'Técnico',
  cliente: 'Cliente',
  solo_lectura: 'Solo lectura',
};

const dateFormatter = new Intl.DateTimeFormat('es', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('es', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const monthFormatter = new Intl.DateTimeFormat('es', {
  month: 'long',
  year: 'numeric',
});

const relativeFormatter = new Intl.RelativeTimeFormat('es', {
  numeric: 'auto',
});

const numberFormatter = new Intl.NumberFormat('es');

/** Placeholder for a value the backend left null. */
export const EMPTY_VALUE = '—';

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  // A bare `YYYY-MM-DD` parses as UTC midnight, which can render as the day
  // before west of Greenwich. Reading the parts avoids the shift.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (dateOnly) {
    return new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
    );
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(iso: string | null | undefined): string {
  const date = parse(iso);
  return date ? dateFormatter.format(date) : EMPTY_VALUE;
}

/** `2026-01-01` → `enero de 2026`. Tariffs are periods, not days. */
export function formatMonth(iso: string | null | undefined): string {
  const date = parse(iso);
  return date ? monthFormatter.format(date) : EMPTY_VALUE;
}

export function formatDateTime(iso: string | null | undefined): string {
  const date = parse(iso);
  return date ? dateTimeFormatter.format(date) : EMPTY_VALUE;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
  ['second', 1],
];

/** "hace 5 min"-style label. The exact timestamp goes in the tooltip. */
export function formatRelative(
  iso: string | null | undefined,
  now: Date = new Date(),
): string {
  const date = parse(iso);
  if (!date) return EMPTY_VALUE;

  const seconds = (date.getTime() - now.getTime()) / 1000;
  for (const [unit, secondsPerUnit] of UNITS) {
    if (Math.abs(seconds) >= secondsPerUnit || unit === 'second') {
      return relativeFormatter.format(
        Math.round(seconds / secondsPerUnit),
        unit,
      );
    }
  }
  return EMPTY_VALUE;
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** Decimals arrive as strings and are shown as-is so no precision is lost. */
export function formatText(value: string | null | undefined): string {
  return value === null || value === undefined || value === ''
    ? EMPTY_VALUE
    : value;
}

/** Cómo se llama cada magnitud en el panel. Agrupa el desplegable de variables. */
export const MAGNITUD_LABEL: Record<Magnitud, string> = {
  tension: 'Tensión',
  tension_compuesta: 'Tensión entre fases',
  corriente: 'Corriente',
  potencia_activa: 'Potencia activa',
  potencia_reactiva: 'Potencia reactiva',
  potencia_aparente: 'Potencia aparente',
  factor_potencia: 'Factor de potencia',
  frecuencia: 'Frecuencia',
  energia_importada: 'Energía importada',
  energia_exportada: 'Energía exportada',
  energia_reactiva_importada: 'Energía reactiva importada',
  energia_reactiva_exportada: 'Energía reactiva exportada',
  estado_digital: 'Entradas digitales',
};
