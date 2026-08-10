/**
 * Mirror of the backend contract. Every type the UI speaks lives here and
 * nowhere else: when the API changes a field, this file changes and the
 * compiler points at everything that has to follow.
 *
 * Enums are literal unions plus a `const` array, not TypeScript `enum`s: the
 * array drives the `<select>` options and the union makes any label map that
 * forgets a new value a compile error.
 *
 * Decimals (`escala`) travel as strings and stay
 * strings all the way to the input, so JS floats never round them.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const CLIENT_STATUS = ['activo', 'suspendido', 'prospecto'] as const;
export type ClientStatus = (typeof CLIENT_STATUS)[number];

export const GATEWAY_STATUS = ['online', 'offline'] as const;
export type GatewayStatus = (typeof GATEWAY_STATUS)[number];

export const EQUIPMENT_TYPE = [
  'medidor',
  'analizador',
  'inversor',
  'sensor',
] as const;
export type EquipmentType = (typeof EQUIPMENT_TYPE)[number];

export const MODBUS_REGISTER_TYPE = [
  'holding',
  'input',
  'coil',
  'discrete',
] as const;
export type ModbusRegisterType = (typeof MODBUS_REGISTER_TYPE)[number];

/**
 * The base a register address was read in. Datasheets print addresses in
 * either one, and `2006` means two different registers depending on which.
 */
export const REGISTER_NOTATION = ['decimal', 'hex'] as const;
export type RegisterNotation = (typeof REGISTER_NOTATION)[number];

export const MODBUS_DATA_TYPE = [
  'int16',
  'uint16',
  'int32',
  'uint32',
  'float32',
] as const;
export type ModbusDataType = (typeof MODBUS_DATA_TYPE)[number];

export const SERIAL_PARITY = ['N', 'E', 'O'] as const;
export type SerialParity = (typeof SERIAL_PARITY)[number];

/**
 * How the gateway reaches the slave. Decides which connection fields apply:
 * the serial ones for RTU, the network ones for TCP. The backend rejects the
 * other transport's fields instead of ignoring them.
 */
/**
 * Códigos de función de **lectura**. Escribir (5, 6, 15, 16) no se ofrece: el
 * gateway lee medidores, no los opera.
 */
export const MODBUS_FUNCTION = [1, 2, 3, 4] as const;
export type ModbusFunction = (typeof MODBUS_FUNCTION)[number];

export const MODBUS_TRANSPORT = ['rtu', 'tcp'] as const;
export type ModbusTransport = (typeof MODBUS_TRANSPORT)[number];

/** Verbosity the firmware writes with, mirrored into its config file. */
export const GATEWAY_LOG_LEVEL = [
  'DEBUG',
  'INFO',
  'WARNING',
  'ERROR',
  'CRITICAL',
] as const;
export type GatewayLogLevel = (typeof GATEWAY_LOG_LEVEL)[number];

export const USER_ROLE = [
  'admin',
  'tecnico',
  'cliente',
  'solo_lectura',
] as const;
export type UserRole = (typeof USER_ROLE)[number];

// ---------------------------------------------------------------------------
// Envelopes
// ---------------------------------------------------------------------------

/** Every listing endpoint returns this shape. */
export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/** `limit` above this is rejected by the backend with a 422. */
export const PAGE_LIMIT_MAX = 200;
export const PAGE_LIMIT_DEFAULT = 50;

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export const API_ERROR_CODE = [
  'authentication_failed',
  /**
   * The token only works for changing the password. Its own code, not a plain
   * 403, so the UI can send the user to the right screen instead of showing a
   * permission error.
   */
  'password_change_required',
  'not_authorized',
  'not_found',
  'already_exists',
  'business_rule_violation',
  'validation_error',
  'internal_error',
  /** Client-side only: the request never reached the backend. */
  'network_error',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODE)[number];

/**
 * The single error shape the UI deals with. `http.ts` builds it from the
 * backend envelope so no component ever parses a raw response.
 */
export interface ApiError {
  status: number;
  code: ApiErrorCode;
  message: string;
  /** Field name (as sent in the payload) to message, ready for the form. */
  fieldErrors: Record<string, string>;
}

/** The raw envelope the backend puts on every error. */
export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/** One entry of `details.errors[]` on a 422. */
export interface ValidationIssue {
  loc: (string | number)[];
  msg: string;
  type?: string;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface LoginPayload {
  email: string;
  password: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  /** Access token lifetime in seconds. */
  expires_in: number;
}

export interface PasswordChangePayload {
  current_password: string;
  new_password: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  client_id: string | null;
  is_active: boolean;
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export interface Client {
  id: string;
  nombre_empresa: string;
  contacto_nombre: string | null;
  contacto_email: string | null;
  contacto_telefono: string | null;
  plan_contratado: string | null;
  estado: ClientStatus;
  /** ISO date, `YYYY-MM-DD`. */
  fecha_alta: string;
  puede_ver_consumo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientCreate {
  nombre_empresa: string;
  contacto_nombre?: string | null;
  contacto_email?: string | null;
  contacto_telefono?: string | null;
  plan_contratado?: string | null;
  estado?: ClientStatus;
  fecha_alta?: string | null;
  puede_ver_consumo?: boolean;
}

export type ClientUpdate = Partial<Omit<ClientCreate, 'fecha_alta'>>;

/**
 * The client's login to the monitoring web. It is a `users` row with role
 * `cliente` behind the scenes, projected onto what the CRM needs to show.
 */
export interface MonitorAccess {
  user_id: string;
  /** Taken from the client's `contacto_email`. */
  email: string;
  is_active: boolean;
  /** True until the client picks their own password on first sign-in. */
  must_change_password: boolean;
  created_at: string;
}

/**
 * The only response that carries the password, and only once. It is never
 * stored in plaintext, so losing it means resetting the access.
 */
export interface MonitorAccessCreated extends MonitorAccess {
  temporary_password: string;
}

// ---------------------------------------------------------------------------
// Sites
// ---------------------------------------------------------------------------

export interface Site {
  id: string;
  client_id: string;
  nombre: string;
  direccion: string | null;
  /** IANA timezone name. */
  timezone: string;
  ciudad: string | null;
  responsable_nombre: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteCreate {
  nombre: string;
  direccion?: string | null;
  timezone?: string;
  ciudad?: string | null;
  responsable_nombre?: string | null;
}

export type SiteUpdate = Partial<SiteCreate>;

export const SITE_TIMEZONE_DEFAULT = 'America/Bogota';

// ---------------------------------------------------------------------------
// Tariffs
// ---------------------------------------------------------------------------

/**
 * The energy prices in force for one month, platform-wide — not per client.
 * One row per month, and the period is never rewritten: a cost computed last
 * year has to stay reproducible.
 *
 * The prices multiply consumption to produce money, so they travel as strings
 * like every other decimal in this contract.
 */
export interface Tariff {
  id: string;
  /** First day of the month, `YYYY-MM-01`. It identifies the period. */
  mes: string;
  valor_importado: string;
  /** Price paid for the surplus left after netting the imported energy. */
  valor_excedente: string;
  created_at: string;
  updated_at: string;
}

export interface TariffCreate {
  mes: string;
  valor_importado: string;
  valor_excedente?: string;
}

/** `mes` is absent on purpose: moving a price to another period rewrites history. */
export interface TariffUpdate {
  valor_importado?: string;
  valor_excedente?: string;
}

// ---------------------------------------------------------------------------
// Gateways
// ---------------------------------------------------------------------------

export interface Gateway {
  id: string;
  site_id: string;
  numero_serie: string;
  /** Identity the firmware reports with; assigned by the backend. */
  uuid: string;
  firmware_version: string | null;
  ultima_conexion: string | null;
  ip_actual: string | null;
  estado: GatewayStatus;
  /** While false the firmware gets a 403 asking for its configuration. */
  config_habilitada: boolean;
  // --- lo que termina en el config.ini del firmware ---
  log_level: GatewayLogLevel;
  /** Cadence of the whole bus: one loop walks every device of the gateway. */
  intervalo_lectura_segundos: number;
  hora_inicio: number;
  hora_fin: number;
  /** Hash of the configuration the device reported writing, if it ever did. */
  config_version_aplicada: string | null;
  config_aplicada_en: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Where the device stands against what is configured for it.
 *
 * The cycle closes on itself: the gateway downloads, acknowledges, and the
 * acknowledgement turns `config_habilitada` off. Anything edited afterwards
 * sits undelivered until someone turns it back on — which is the state this
 * screen exists to make visible.
 */
export interface GatewayConfigStatus {
  gateway_id: string;
  uuid: string;
  config_habilitada: boolean;
  /** What would be delivered right now, switch or no switch. */
  config_version_actual: string;
  config_version_aplicada: string | null;
  config_aplicada_en: string | null;
  /** Refreshed on every poll, including the ones answered with a 304. */
  ultima_conexion: string | null;
  desactualizada: boolean;
}

export interface GatewayCreate {
  numero_serie: string;
  firmware_version?: string | null;
  /** Known at install time on a fixed address; otherwise the device reports it. */
  ip_actual?: string | null;
  log_level?: GatewayLogLevel;
  intervalo_lectura_segundos?: number;
  hora_inicio?: number;
  hora_fin?: number;
}

/**
 * `estado` is absent on purpose: it is derived from `ultima_conexion`, so
 * there is nothing for an operator to set.
 */
export interface GatewayUpdate extends Partial<GatewayCreate> {
  /** Turned on once the equipment and variables are loaded. */
  config_habilitada?: boolean;
}

/**
 * Filters shared by the fleet-wide listings. All optional and combinable, and
 * they only ever narrow: asking for another company's `client_id` returns an
 * empty page, never someone else's rows.
 */
export interface FleetFilters extends PaginationParams {
  client_id?: string;
  site_id?: string;
  gateway_id?: string;
  /** Resolved against `ultima_conexion` when asked, so it is never stale. */
  estado?: GatewayStatus;
  search?: string;
}

/** `hora_fin` cannot be earlier than `hora_inicio`; the backend answers 422. */
export const GATEWAY_HOUR_MIN = 0;
export const GATEWAY_HOUR_MAX = 23;
export const GATEWAY_READ_INTERVAL_DEFAULT = 60;

/**
 * The credential the firmware carries. It is exchanged for a 24 h token at
 * `POST /gateway/token`, which is why the panel never sees that token.
 */
export interface GatewayCredential {
  gateway_id: string;
  /** What the firmware sends when asking for a token. */
  uuid: string;
  numero_serie: string;
  tiene_credencial: boolean;
  credential_emitida_en: string | null;
  config_habilitada: boolean;
}

/** The only response that carries the secret, and only this once. */
export interface GatewayCredentialCreated extends GatewayCredential {
  credential: string;
}

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------

export interface Equipment {
  id: string;
  gateway_id: string;
  marca: string | null;
  modelo: string | null;
  tipo: EquipmentType;
  /** Unit id on the bus. Applies to both transports. */
  modbus_id: number;
  /**
   * Modbus read function code: 3 holding, 4 input, 1 coils, 2 discrete.
   *
   * Per device, not per variable: the firmware issues one block read for the
   * whole device.
   */
  modbus_function: ModbusFunction;
  transporte: ModbusTransport;
  /**
   * Titles the device's section in the firmware config and names its map
   * file, so it has to be unique within the gateway.
   */
  nombre_dispositivo: string;
  /** The firmware's own vocabulary, e.g. `CT_Meter`. Free text. */
  device_type: string;
  modbusconnect: boolean;
  modbusread: boolean;
  blockreading: boolean;
  // Serial parameters: set only when `transporte` is `rtu`.
  puerto: string | null;
  baudrate: number | null;
  paridad: SerialParity | null;
  bits: number | null;
  stop_bits: number | null;
  // Network parameters: set only when `transporte` is `tcp`.
  host: string | null;
  puerto_tcp: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Send the fields of the chosen transport only: the backend rejects the
 * other set with a 422 rather than dropping it silently.
 */
export interface EquipmentCreate {
  tipo: EquipmentType;
  modbus_id: number;
  modbus_function?: ModbusFunction;
  transporte?: ModbusTransport;
  nombre_dispositivo: string;
  device_type: string;
  marca?: string | null;
  modelo?: string | null;
  modbusconnect?: boolean;
  modbusread?: boolean;
  blockreading?: boolean;
  puerto?: string | null;
  baudrate?: number | null;
  paridad?: SerialParity | null;
  bits?: number | null;
  stop_bits?: number | null;
  host?: string | null;
  puerto_tcp?: number | null;
}

export type EquipmentUpdate = Partial<EquipmentCreate>;

/** Modbus RTU reserves 0 for broadcast and stops at 247. */
export const MODBUS_ID_MIN = 1;
export const MODBUS_ID_MAX = 247;

export const EQUIPMENT_PORT_DEFAULT = '/dev/ttymxc1';
export const EQUIPMENT_BAUDRATE_DEFAULT = 9600;

/** Values the firmware already understands. The field still takes free text. */
export const DEVICE_TYPE_SUGGESTIONS = ['CT_Meter'] as const;

export const TCP_PORT_DEFAULT = 502;
export const TCP_PORT_MIN = 1;
export const TCP_PORT_MAX = 65535;

// ---------------------------------------------------------------------------
// Variables
// ---------------------------------------------------------------------------

/**
 * Qué se está midiendo. Decide con qué otras variables se agrupa en el panel
 * y si admite promedios: un contador solo admite diferencias.
 */
export const MAGNITUD = [
  'tension',
  'tension_compuesta',
  'corriente',
  'potencia_activa',
  'potencia_reactiva',
  'potencia_aparente',
  'factor_potencia',
  'frecuencia',
  'energia_importada',
  'energia_exportada',
  'energia_reactiva_importada',
  'energia_reactiva_exportada',
  'estado_digital',
] as const;
export type Magnitud = (typeof MAGNITUD)[number];

export const FASE = ['A', 'B', 'C', 'AB', 'BC', 'CA', 'N', 'total'] as const;
export type Fase = (typeof FASE)[number];

/**
 * Una entrada del catálogo de mediciones (IEC 61850).
 *
 * La lista vive en el backend y se pide con `GET /variable-catalog`. No se
 * duplica acá a propósito: dos copias de la misma lista terminan difiriendo,
 * y el síntoma —una opción que el panel ofrece y la API rechaza— aparecería
 * recién al guardar.
 */
export interface Medicion {
  /** Lo que se guarda y lo que el gateway publica por MQTT. */
  nombre: string;
  /** Lo único pensado para leerse: "Tensión fase C". */
  etiqueta: string;
  magnitud: Magnitud;
  fase: Fase;
  unidad: string;
  acumulativa: boolean;
}

export interface Variable {
  id: string;
  equipment_id: string;
  /** Del catálogo. Texto libre ya no se acepta. */
  nombre: string;
  /** Canonical numeric address, whatever base it was typed in. */
  registro_modbus: number;
  notacion_registro: RegisterNotation;
  /** The address written in its own base, ready to show without converting. */
  registro_display: string;
  /**
   * Address space of this register. Per variable, not per equipment: one
   * analyser exposes measurements as holding registers and relay states as
   * coils.
   */
  tipo_registro: ModbusRegisterType;
  tipo_dato: ModbusDataType;
  escala: string;
  /**
   * Derivadas del nombre vía el catálogo: no se guardan ni se envían. `null`
   * en variables cargadas antes de que el catálogo existiera.
   */
  unidad: string | null;
  magnitud: Magnitud | null;
  fase: Fase | null;
  acumulativa: boolean;
  created_at: string;
  updated_at: string;
}

export interface VariableCreate {
  nombre: string;
  /**
   * Send what the operator typed, as text, together with the notation: the
   * backend reads it in that base. Converting here as well would put the same
   * rule in two places, and the two would drift.
   */
  registro_modbus: number | string;
  notacion_registro?: RegisterNotation;
  tipo_registro?: ModbusRegisterType;
  tipo_dato?: ModbusDataType;
  escala?: string;
  // `unidad` no se envía: se deduce de qué se mide. Por eso no existe el caso
  // de `kw` contra `kW` que había cuando se tecleaba.
}

export type VariableUpdate = Partial<VariableCreate>;

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export interface UserCreate {
  email: string;
  password: string;
  role: UserRole;
  /** Mandatory for `cliente`, rejected for every other role. */
  client_id?: string | null;
}

export interface UserUpdate {
  role?: UserRole;
  client_id?: string | null;
  is_active?: boolean;
}

export interface UserListParams extends PaginationParams {
  client_id?: string;
  role?: UserRole;
}

export interface PasswordSetPayload {
  new_password: string;
}

/** bcrypt truncates past 72 bytes, so the backend refuses anything longer. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

// ---------------------------------------------------------------------------
// Service accounts
// ---------------------------------------------------------------------------

/**
 * What a machine credential is allowed to read. Every value is a read: there
 * is no permission that grants writing, and the backend has no way to make
 * one — a credential that lives in another system's environment file must not
 * be able to change what the fleet is.
 */
export const SERVICE_PERMISSION = ['tariffs:read', 'fleet:read'] as const;
export type ServicePermission = (typeof SERVICE_PERMISSION)[number];

/**
 * Another system that consumes this API — today, `ApiEMS` reading tariffs and
 * the installation tree.
 *
 * The credential has two halves. `credencial_id` is public and shown here as
 * often as anyone likes; the secret exists in clear exactly once, in the
 * response that issues or rotates it.
 */
export interface ServiceAccount {
  id: string;
  nombre: string;
  descripcion: string | null;
  /** Public half. On its own it opens nothing. */
  credencial_id: string;
  permisos: ServicePermission[];
  /** Null means the whole platform; set, it pins the credential to one client. */
  client_id: string | null;
  activo: boolean;
  expira_en: string | null;
  secret_emitido_en: string;
  /** Refreshed when a token is issued, not on every request it makes. */
  ultimo_uso_en: string | null;
  created_at: string;
  updated_at: string;
}

/** The only two responses that carry the secret: creation and rotation. */
export interface ServiceAccountCreated extends ServiceAccount {
  client_secret: string;
}

export interface ServiceAccountCreate {
  nombre: string;
  descripcion?: string | null;
  /** At least one. A credential that reads nothing is a secret with no purpose. */
  permisos: ServicePermission[];
  client_id?: string | null;
  expira_en?: string | null;
}

/** The secret is absent on purpose: rotating it is its own action. */
export interface ServiceAccountUpdate {
  nombre?: string;
  descripcion?: string | null;
  permisos?: ServicePermission[];
  activo?: boolean;
  expira_en?: string | null;
}

// ---------- Configuración de plataforma ----------

/**
 * Un valor del `.env` que comparten todos los gateways.
 *
 * Es la única cosa de este sistema que guarda secretos **recuperables**: la
 * contraseña del broker tiene que poder mostrarse y servirse a un equipo, y
 * un hash no se deshace. Por eso el valor no viaja en el listado y verlo es
 * una petición aparte.
 */
/** De dónde sale el valor de una variable. */
export type SettingOrigin = 'plataforma' | 'equipo' | 'identidad';

export interface PlatformSetting {
  id: string;
  clave: string;
  /**
   * Solo `plataforma` se edita desde el panel. Las otras existen para que su
   * nombre viaje en la configuración del equipo: el valor lo pone el propio
   * gateway o su ficha en el CRM.
   */
  origen: SettingOrigin;
  /** `null` cuando es secreto. No es que esté vacío: es que no viaja. */
  valor: string | null;
  es_secreto: boolean;
  /** Distingue «tapado» de «sin cargar». Un secreto vacío no conecta nada. */
  tiene_valor: boolean;
  descripcion: string;
  updated_at: string;
}

export interface PlatformSettingRevealed {
  clave: string;
  valor: string;
}

export interface PlatformSettingCreate {
  clave: string;
  valor: string;
  es_secreto: boolean;
  descripcion: string;
}

export interface PlatformSettingUpdate {
  valor?: string;
  es_secreto?: boolean;
  descripcion?: string;
}

// ---------- Enrolamiento ----------

/**
 * El permiso con el que un gateway se configura solo.
 *
 * Se ve una sola vez. Distinto de la credencial: aquella se carga a mano en el
 * firmware; este hace que el equipo se configure entero, y **rota la
 * credencial durante el canje**.
 */
export interface EnrollmentTokenIssued {
  token: string;
  expira_en: string;
  /** El comando completo, listo para copiar. Lo arma el servidor. */
  comando: string;
}
