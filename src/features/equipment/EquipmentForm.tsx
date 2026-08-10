import {
  DEVICE_TYPE_SUGGESTIONS,
  EQUIPMENT_BAUDRATE_DEFAULT,
  EQUIPMENT_PORT_DEFAULT,
  EQUIPMENT_TYPE,
  MODBUS_ID_MAX,
  MODBUS_ID_MIN,
  MODBUS_TRANSPORT,
  SERIAL_PARITY,
  MODBUS_FUNCTION,
  TCP_PORT_DEFAULT,
  TCP_PORT_MAX,
  TCP_PORT_MIN,
  equipmentApi,
  gatewaysApi,
} from '../../api';
import type {
  Equipment,
  EquipmentCreate,
  EquipmentType,
  ModbusFunction,
  ModbusTransport,
  SerialParity,
} from '../../api';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Drawer';
import { Input } from '../../components/ui/Input';
import { Select, optionsFrom } from '../../components/ui/Select';
import { Toggle } from '../../components/ui/Toggle';
import { useResourceForm } from '../../hooks/useResourceForm';
import { useToast } from '../../hooks/useToast';
import {
  EQUIPMENT_TYPE_LABEL,
  MODBUS_FUNCTION_LABEL,
  MODBUS_TRANSPORT_LABEL,
  SERIAL_PARITY_LABEL,
} from '../../lib/formatters';

interface EquipmentFormValues {
  tipo: EquipmentType;
  /** Numbers stay text while typing so the field can be emptied. */
  modbus_id: string;
  modbus_function: string;
  transporte: ModbusTransport;
  nombre_dispositivo: string;
  device_type: string;
  marca: string;
  modelo: string;
  modbusconnect: boolean;
  modbusread: boolean;
  blockreading: boolean;
  // Modbus RTU
  puerto: string;
  baudrate: string;
  paridad: SerialParity;
  bits: string;
  stop_bits: string;
  // Modbus TCP
  host: string;
  puerto_tcp: string;
}

const BITS_OPTIONS = [
  { value: '7', label: '7' },
  { value: '8', label: '8' },
];

const STOP_BITS_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
];

function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * What the firmware's section is called by default. `Modbus_DTSU666` is the
 * shape the existing configs use; an empty model proposes nothing.
 */
function suggestedName(modelo: string): string {
  const trimmed = modelo.trim();
  return trimmed === '' ? '' : `Modbus_${trimmed.replace(/\s+/g, '_')}`;
}

function integerError(
  value: string,
  { min, max }: { min: number; max?: number },
): string | undefined {
  if (value.trim() === '') return 'Obligatorio';
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return 'Tiene que ser un número entero';
  if (parsed < min) return `Mínimo ${min}`;
  if (max !== undefined && parsed > max) return `Máximo ${max}`;
  return undefined;
}

export interface EquipmentFormProps {
  gatewayId: string;
  equipment: Equipment | null;
  onClose: () => void;
  onSaved: (equipment: Equipment) => void;
}

export function EquipmentForm({
  gatewayId,
  equipment,
  onClose,
  onSaved,
}: EquipmentFormProps) {
  const { notify } = useToast();
  const isEdit = equipment !== null;

  const form = useResourceForm<EquipmentFormValues, Equipment>({
    initialValues: {
      tipo: equipment?.tipo ?? 'medidor',
      modbus_id: equipment ? String(equipment.modbus_id) : '',
      // 3 por defecto: es lo que usa casi todo medidor comercial.
      modbus_function: String(equipment?.modbus_function ?? 3),
      transporte: equipment?.transporte ?? 'rtu',
      nombre_dispositivo: equipment?.nombre_dispositivo ?? '',
      device_type: equipment?.device_type ?? '',
      marca: equipment?.marca ?? '',
      modelo: equipment?.modelo ?? '',
      modbusconnect: equipment?.modbusconnect ?? true,
      modbusread: equipment?.modbusread ?? true,
      blockreading: equipment?.blockreading ?? true,
      puerto: equipment?.puerto ?? EQUIPMENT_PORT_DEFAULT,
      baudrate: String(equipment?.baudrate ?? EQUIPMENT_BAUDRATE_DEFAULT),
      paridad: equipment?.paridad ?? 'N',
      bits: String(equipment?.bits ?? 8),
      stop_bits: String(equipment?.stop_bits ?? 1),
      host: equipment?.host ?? '',
      puerto_tcp: String(equipment?.puerto_tcp ?? TCP_PORT_DEFAULT),
    },
    validate: (values) => {
      const errors: Record<string, string> = {};

      const modbusId = integerError(values.modbus_id, {
        min: MODBUS_ID_MIN,
        max: MODBUS_ID_MAX,
      });
      if (modbusId) errors.modbus_id = modbusId;

      if (values.nombre_dispositivo.trim() === '') {
        errors.nombre_dispositivo = 'Obligatorio';
      }
      if (values.device_type.trim() === '') errors.device_type = 'Obligatorio';

      // Only the fields of the chosen transport are validated: the others are
      // not sent at all.
      if (values.transporte === 'rtu') {
        if (values.puerto.trim() === '') errors.puerto = 'Obligatorio';
        const baudrate = integerError(values.baudrate, { min: 1 });
        if (baudrate) errors.baudrate = baudrate;
      } else {
        if (values.host.trim() === '') {
          errors.host = 'Obligatorio para Modbus TCP';
        }
        const puertoTcp = integerError(values.puerto_tcp, {
          min: TCP_PORT_MIN,
          max: TCP_PORT_MAX,
        });
        if (puertoTcp) errors.puerto_tcp = puertoTcp;
      }

      return errors;
    },
    // Un `nombre_dispositivo` repetido en el gateway también da 409, pero el
    // choque más frecuente es el del id de bus.
    conflictField: 'modbus_id',
    submit: async (values) => {
      const connection: Partial<EquipmentCreate> =
        values.transporte === 'rtu'
          ? {
              puerto: values.puerto.trim(),
              baudrate: Number(values.baudrate),
              paridad: values.paridad,
              bits: Number(values.bits),
              stop_bits: Number(values.stop_bits),
            }
          : {
              host: values.host.trim(),
              puerto_tcp: Number(values.puerto_tcp),
            };

      const payload: EquipmentCreate = {
        tipo: values.tipo,
        modbus_id: Number(values.modbus_id),
        modbus_function: Number(values.modbus_function) as ModbusFunction,
        transporte: values.transporte,
        nombre_dispositivo: values.nombre_dispositivo.trim(),
        device_type: values.device_type.trim(),
        marca: orNull(values.marca),
        modelo: orNull(values.modelo),
        modbusconnect: values.modbusconnect,
        modbusread: values.modbusread,
        blockreading: values.blockreading,
        ...connection,
      };

      return equipment
        ? equipmentApi.updateEquipment(equipment.id, payload)
        : gatewaysApi.createGatewayEquipment(gatewayId, payload);
    },
    onSuccess: (saved) => {
      notify('success', isEdit ? 'Equipo actualizado' : 'Equipo creado');
      onSaved(saved);
    },
  });

  const isSerial = form.values.transporte === 'rtu';

  return (
    <Drawer
      open
      onClose={onClose}
      title={isEdit ? 'Editar equipo' : 'Nuevo equipo'}
      description={
        isEdit
          ? `${EQUIPMENT_TYPE_LABEL[equipment.tipo]} · Modbus ${equipment.modbus_id}`
          : undefined
      }
      footer={
        <>
          <Button onClick={onClose} disabled={form.submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="equipment-form"
            variant="primary"
            loading={form.submitting}
          >
            {isEdit ? 'Guardar cambios' : 'Crear equipo'}
          </Button>
        </>
      }
    >
      <form
        id="equipment-form"
        onSubmit={form.handleSubmit}
        className="flex flex-col gap-4"
      >
        <Select
          id="equipment-tipo"
          label="Tipo"
          required
          value={form.values.tipo}
          options={optionsFrom(EQUIPMENT_TYPE, EQUIPMENT_TYPE_LABEL)}
          error={form.errorFor('tipo')}
          onValueChange={(value) => {
            form.setValue('tipo', value);
          }}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="equipment-marca"
            label="Marca"
            maxLength={100}
            value={form.values.marca}
            error={form.errorFor('marca')}
            onChange={(event) => {
              form.setValue('marca', event.target.value);
            }}
          />
          <Input
            id="equipment-modelo"
            label="Modelo"
            maxLength={100}
            value={form.values.modelo}
            error={form.errorFor('modelo')}
            onChange={(event) => {
              const modelo = event.target.value;
              // Propone el nombre del firmware mientras nadie lo haya tocado:
              // en cuanto el usuario lo edita, deja de pisárselo.
              if (
                !isEdit &&
                form.values.nombre_dispositivo ===
                  suggestedName(form.values.modelo)
              ) {
                form.setValue('nombre_dispositivo', suggestedName(modelo));
              }
              form.setValue('modelo', modelo);
            }}
          />
        </div>

        <fieldset className="flex flex-col gap-4 rounded-lg border border-line p-4">
          <legend className="px-1 text-xs font-semibold tracking-wide text-content-subtle uppercase">
            Identidad del dispositivo
          </legend>

          <Input
            id="equipment-nombre-dispositivo"
            label="Nombre del dispositivo"
            required
            maxLength={80}
            hint="Titula su sección en el config.ini y nombra su archivo de mapa. Único dentro del gateway."
            value={form.values.nombre_dispositivo}
            error={form.errorFor('nombre_dispositivo')}
            onChange={(event) => {
              form.setValue('nombre_dispositivo', event.target.value);
            }}
          />
          <Input
            id="equipment-device-type"
            label="Tipo de dispositivo"
            required
            maxLength={60}
            suggestions={DEVICE_TYPE_SUGGESTIONS}
            hint="Etiqueta con la que viaja en cada lectura. Podés elegir una conocida o escribir otra."
            value={form.values.device_type}
            error={form.errorFor('device_type')}
            onChange={(event) => {
              form.setValue('device_type', event.target.value);
            }}
          />

          <div className="flex flex-col gap-3 border-t border-line pt-3">
            <Toggle
              id="equipment-modbusconnect"
              label="Conectar"
              description="El gateway abre la conexión con este equipo."
              checked={form.values.modbusconnect}
              onCheckedChange={(checked) => {
                form.setValue('modbusconnect', checked);
              }}
            />
            <Toggle
              id="equipment-modbusread"
              label="Leer"
              description="El gateway consulta sus registros en cada ciclo."
              checked={form.values.modbusread}
              onCheckedChange={(checked) => {
                form.setValue('modbusread', checked);
              }}
            />
            <Toggle
              id="equipment-blockreading"
              label="Lectura por bloques"
              description="Pide registros contiguos de una vez en lugar de uno por uno."
              checked={form.values.blockreading}
              onCheckedChange={(checked) => {
                form.setValue('blockreading', checked);
              }}
            />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-4 rounded-lg border border-line p-4">
          <legend className="px-1 text-xs font-semibold tracking-wide text-content-subtle uppercase">
            Conexión
          </legend>

          <Select
            id="equipment-transporte"
            label="Transporte"
            required
            value={form.values.transporte}
            options={optionsFrom(MODBUS_TRANSPORT, MODBUS_TRANSPORT_LABEL)}
            error={form.errorFor('transporte')}
            hint={
              isSerial
                ? 'El gateway llega al equipo por el puerto serie.'
                : 'El gateway llega al equipo por la red.'
            }
            onValueChange={(value) => {
              form.setValue('transporte', value);
            }}
          />

          <Input
            id="equipment-modbus-id"
            label="ID Modbus"
            required
            numeric
            inputMode="numeric"
            hint={
              isSerial
                ? `Entre ${MODBUS_ID_MIN} y ${MODBUS_ID_MAX}, único por puerto dentro del gateway.`
                : `Unit id del esclavo detrás del gateway Modbus. Entre ${MODBUS_ID_MIN} y ${MODBUS_ID_MAX}.`
            }
            value={form.values.modbus_id}
            error={form.errorFor('modbus_id')}
            onChange={(event) => {
              form.setValue('modbus_id', event.target.value);
            }}
          />

          <Select
            id="equipment-modbus-function"
            label="Function Code"
            required
            value={form.values.modbus_function}
            options={MODBUS_FUNCTION.map((code) => ({
              value: String(code),
              label: MODBUS_FUNCTION_LABEL[code],
            }))}
            error={form.errorFor('modbus_function')}
            hint="Con qué código lee el firmware este equipo. Va por dispositivo: se emite una sola petición de bloque."
            onValueChange={(value) => {
              form.setValue('modbus_function', value);
            }}
          />

          {isSerial ? (
            <>
              <Input
                id="equipment-puerto"
                label="Puerto serie"
                required
                maxLength={60}
                value={form.values.puerto}
                error={form.errorFor('puerto')}
                onChange={(event) => {
                  form.setValue('puerto', event.target.value);
                }}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="equipment-baudrate"
                  label="Baudrate"
                  required
                  numeric
                  inputMode="numeric"
                  value={form.values.baudrate}
                  error={form.errorFor('baudrate')}
                  onChange={(event) => {
                    form.setValue('baudrate', event.target.value);
                  }}
                />
                <Select
                  id="equipment-paridad"
                  label="Paridad"
                  value={form.values.paridad}
                  options={optionsFrom(SERIAL_PARITY, SERIAL_PARITY_LABEL)}
                  error={form.errorFor('paridad')}
                  onValueChange={(value) => {
                    form.setValue('paridad', value);
                  }}
                />
                <Select
                  id="equipment-bits"
                  label="Bits de datos"
                  value={form.values.bits}
                  options={BITS_OPTIONS}
                  error={form.errorFor('bits')}
                  onValueChange={(value) => {
                    form.setValue('bits', value);
                  }}
                />
                <Select
                  id="equipment-stop-bits"
                  label="Bits de parada"
                  value={form.values.stop_bits}
                  options={STOP_BITS_OPTIONS}
                  error={form.errorFor('stop_bits')}
                  onValueChange={(value) => {
                    form.setValue('stop_bits', value);
                  }}
                />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-[1fr_7rem] gap-3">
              <Input
                id="equipment-host"
                label="Host"
                required
                maxLength={255}
                hint="IP o nombre del equipo en la red."
                value={form.values.host}
                error={form.errorFor('host')}
                onChange={(event) => {
                  form.setValue('host', event.target.value);
                }}
              />
              <Input
                id="equipment-puerto-tcp"
                label="Puerto TCP"
                required
                numeric
                inputMode="numeric"
                value={form.values.puerto_tcp}
                error={form.errorFor('puerto_tcp')}
                onChange={(event) => {
                  form.setValue('puerto_tcp', event.target.value);
                }}
              />
            </div>
          )}
        </fieldset>

        {form.formError && (
          <p role="alert" className="text-sm text-danger">
            {form.formError}
          </p>
        )}
      </form>
    </Drawer>
  );
}
