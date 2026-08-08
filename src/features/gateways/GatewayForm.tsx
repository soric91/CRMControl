import {
  GATEWAY_HOUR_MAX,
  GATEWAY_HOUR_MIN,
  GATEWAY_LOG_LEVEL,
  GATEWAY_READ_INTERVAL_DEFAULT,
  gatewaysApi,
  sitesApi,
} from '../../api';
import type { Gateway, GatewayLogLevel } from '../../api';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Drawer';
import { Input } from '../../components/ui/Input';
import { Select, optionsFrom } from '../../components/ui/Select';
import { useResourceForm } from '../../hooks/useResourceForm';
import { useToast } from '../../hooks/useToast';
import { GATEWAY_LOG_LEVEL_LABEL } from '../../lib/formatters';

interface GatewayFormValues {
  numero_serie: string;
  firmware_version: string;
  ip_actual: string;
  // --- lo que termina en el config.ini ---
  log_level: GatewayLogLevel;
  intervalo_lectura_segundos: string;
  hora_inicio: string;
  hora_fin: string;
}

/** Whole hours, 0..23, as the firmware's config file expects them. */
const HOUR_OPTIONS = Array.from(
  { length: GATEWAY_HOUR_MAX + 1 },
  (_, hour) => ({
    value: String(hour),
    label: `${String(hour).padStart(2, '0')}:00`,
  }),
);

function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export interface GatewayFormProps {
  siteId: string;
  gateway: Gateway | null;
  onClose: () => void;
  onSaved: (gateway: Gateway) => void;
}

export function GatewayForm({
  siteId,
  gateway,
  onClose,
  onSaved,
}: GatewayFormProps) {
  const { notify } = useToast();
  const isEdit = gateway !== null;

  const form = useResourceForm<GatewayFormValues, Gateway>({
    initialValues: {
      numero_serie: gateway?.numero_serie ?? '',
      firmware_version: gateway?.firmware_version ?? '',
      ip_actual: gateway?.ip_actual ?? '',
      log_level: gateway?.log_level ?? 'INFO',
      intervalo_lectura_segundos: String(
        gateway?.intervalo_lectura_segundos ?? GATEWAY_READ_INTERVAL_DEFAULT,
      ),
      hora_inicio: String(gateway?.hora_inicio ?? GATEWAY_HOUR_MIN),
      hora_fin: String(gateway?.hora_fin ?? GATEWAY_HOUR_MAX),
    },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (values.numero_serie.trim() === '') {
        errors.numero_serie = 'El número de serie es obligatorio';
      }

      const intervalo = Number(values.intervalo_lectura_segundos);
      if (!Number.isInteger(intervalo) || intervalo <= 0) {
        errors.intervalo_lectura_segundos = 'Tiene que ser mayor a 0';
      }
      // El backend rechaza el rango invertido con un 422; validarlo acá evita
      // el viaje.
      if (Number(values.hora_fin) < Number(values.hora_inicio)) {
        errors.hora_fin = 'No puede ser anterior a la hora de inicio';
      }
      return errors;
    },
    conflictField: 'numero_serie',
    submit: async (values) => {
      const common = {
        numero_serie: values.numero_serie.trim(),
        firmware_version: orNull(values.firmware_version),
        ip_actual: orNull(values.ip_actual),
        log_level: values.log_level,
        intervalo_lectura_segundos: Number(values.intervalo_lectura_segundos),
        hora_inicio: Number(values.hora_inicio),
        hora_fin: Number(values.hora_fin),
      };

      return gateway
        ? gatewaysApi.updateGateway(gateway.id, common)
        : sitesApi.createSiteGateway(siteId, common);
    },
    onSuccess: (saved) => {
      notify('success', isEdit ? 'Gateway actualizado' : 'Gateway creado');
      onSaved(saved);
    },
  });

  // Una vez que el equipo late, él es la fuente de estos dos campos.
  const reportsItself = gateway?.ultima_conexion != null;

  return (
    <Drawer
      open
      onClose={onClose}
      title={isEdit ? 'Editar gateway' : 'Nuevo gateway'}
      description={isEdit ? gateway.numero_serie : undefined}
      footer={
        <>
          <Button onClick={onClose} disabled={form.submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="gateway-form"
            variant="primary"
            loading={form.submitting}
          >
            {isEdit ? 'Guardar cambios' : 'Crear gateway'}
          </Button>
        </>
      }
    >
      <form
        id="gateway-form"
        onSubmit={form.handleSubmit}
        className="flex flex-col gap-4"
      >
        <Input
          id="gateway-serie"
          label="Número de serie"
          required
          autoFocus
          maxLength={80}
          value={form.values.numero_serie}
          error={form.errorFor('numero_serie')}
          onChange={(event) => {
            form.setValue('numero_serie', event.target.value);
          }}
        />
        <Input
          id="gateway-firmware"
          label="Versión de firmware"
          maxLength={40}
          hint={
            reportsItself
              ? 'La reporta el gateway en cada latido; lo que pongas acá se sobrescribe.'
              : 'Se completa sola cuando el gateway reporte por primera vez.'
          }
          value={form.values.firmware_version}
          error={form.errorFor('firmware_version')}
          onChange={(event) => {
            form.setValue('firmware_version', event.target.value);
          }}
        />

        <Input
          id="gateway-ip"
          label="IP actual"
          maxLength={45}
          inputMode="numeric"
          hint={
            reportsItself
              ? 'La reporta el gateway en cada latido; lo que pongas acá se sobrescribe.'
              : 'Opcional. Cargala si el equipo tiene una IP fija; si no, la reporta al conectarse.'
          }
          value={form.values.ip_actual}
          error={form.errorFor('ip_actual')}
          onChange={(event) => {
            form.setValue('ip_actual', event.target.value);
          }}
        />

        <fieldset className="flex flex-col gap-4 rounded-lg border border-line p-4">
          <legend className="px-1 text-xs font-semibold tracking-wide text-content-subtle uppercase">
            Configuración del firmware
          </legend>
          <p className="text-xs text-content-subtle">
            Estos cuatro valores salen tal cual en el archivo de configuración
            que descarga el gateway.
          </p>

          <Select
            id="gateway-log-level"
            label="Nivel de log"
            value={form.values.log_level}
            options={optionsFrom(GATEWAY_LOG_LEVEL, GATEWAY_LOG_LEVEL_LABEL)}
            error={form.errorFor('log_level')}
            onValueChange={(value) => {
              form.setValue('log_level', value);
            }}
          />
          <Input
            id="gateway-intervalo"
            label="Intervalo de lectura (segundos)"
            required
            numeric
            inputMode="numeric"
            hint="Un ciclo recorre todos los equipos del gateway, así que la cadencia es del gateway y no de cada equipo."
            value={form.values.intervalo_lectura_segundos}
            error={form.errorFor('intervalo_lectura_segundos')}
            onChange={(event) => {
              form.setValue('intervalo_lectura_segundos', event.target.value);
            }}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              id="gateway-hora-inicio"
              label="Hora de inicio"
              value={form.values.hora_inicio}
              options={HOUR_OPTIONS}
              error={form.errorFor('hora_inicio')}
              onValueChange={(value) => {
                form.setValue('hora_inicio', value);
              }}
            />
            <Select
              id="gateway-hora-fin"
              label="Hora de fin"
              value={form.values.hora_fin}
              options={HOUR_OPTIONS}
              error={form.errorFor('hora_fin')}
              onValueChange={(value) => {
                form.setValue('hora_fin', value);
              }}
            />
          </div>
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
