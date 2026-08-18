import {
  MODBUS_DATA_TYPE,
  MODBUS_REGISTER_TYPE,
  REGISTER_NOTATION,
  equipmentApi,
  variablesApi,
} from '../../api';
import type {
  ModbusDataType,
  ModbusRegisterType,
  RegisterNotation,
  Variable,
} from '../../api';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Drawer';
import {
  Field,
  controlBorder,
  controlClassName,
  describedBy,
} from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { Select, optionsFrom } from '../../components/ui/Select';
import type { SelectOption } from '../../components/ui/Select';
import { useVariableCatalog } from '../../hooks/useVariableCatalog';
import { MAGNITUD_LABEL } from '../../lib/formatters';
import { useResourceForm } from '../../hooks/useResourceForm';
import { useToast } from '../../hooks/useToast';
import { cx } from '../../lib/cx';
import { isRegisterChar, previewHex, readRegister } from '../../lib/modbus';
import {
  MODBUS_DATA_TYPE_LABEL,
  MODBUS_REGISTER_TYPE_LABEL,
} from '../../lib/formatters';

const NOTATION_LABEL: Record<RegisterNotation, string> = {
  decimal: 'Decimal',
  hex: 'Hex',
};

/**
 * Sticks within the page's lifetime: a fleet is usually loaded from one
 * vendor's datasheets, so the second variable is almost always in the base the
 * first one used. Deliberately not persisted — a new session starts from the
 * base that is already stored, `decimal`.
 */
let lastNotation: RegisterNotation = 'decimal';

/**
 * La etiqueta del catálogo sin repetir el encabezado de su grupo.
 *
 * Casi todas empiezan por su magnitud —"Potencia activa fase A" bajo
 * "Potencia activa"— y con el encabezado arriba esa parte no aporta nada,
 * solo ancho. Se devuelve la etiqueta entera cuando no hay prefijo que quitar
 * ("Entrada digital 1" bajo "Entradas digitales") o cuando quitarlo dejaría
 * el renglón vacío ("Frecuencia" bajo "Frecuencia").
 */
function sinElGrupo(etiqueta: string, grupo: string): string {
  if (!etiqueta.toLowerCase().startsWith(grupo.toLowerCase())) return etiqueta;
  const resto = etiqueta.slice(grupo.length).replace(/^\s+(de\s+)?/i, '');
  if (resto === '') return etiqueta;
  return resto.charAt(0).toUpperCase() + resto.slice(1);
}

interface VariableFormValues {
  nombre: string;
  /** Exactly what the operator typed. The backend reads it in the notation. */
  registro_modbus: string;
  notacion_registro: RegisterNotation;
  tipo_registro: ModbusRegisterType;
  tipo_dato: ModbusDataType;
  /** Decimal: kept as text end to end so no precision is lost. */
  escala: string;
}

export interface VariableFormProps {
  equipmentId: string;
  variable: Variable | null;
  onClose: () => void;
  onSaved: (variable: Variable) => void;
}

export function VariableForm({
  equipmentId,
  variable,
  onClose,
  onSaved,
}: VariableFormProps) {
  const { notify } = useToast();
  const isEdit = variable !== null;
  const { mediciones } = useVariableCatalog();

  // Agrupadas por magnitud y en el orden del catálogo: las tensiones juntas,
  // las corrientes juntas, los contadores al final. El grupo es un `optgroup`
  // de verdad y no un prefijo en cada renglón — con el prefijo, la lista
  // repetía la magnitud en cada opción ("Potencia activa · Potencia activa
  // fase A") y quedaba más ancha que el panel, así que el navegador recortaba
  // justo la parte que distingue una opción de la otra.
  const opciones: SelectOption<string>[] = mediciones.map((medicion) => {
    const grupo = MAGNITUD_LABEL[medicion.magnitud];
    return {
      value: medicion.nombre,
      label: sinElGrupo(medicion.etiqueta, grupo),
      group: grupo,
    };
  });

  const form = useResourceForm<VariableFormValues, Variable>({
    initialValues: {
      nombre: variable?.nombre ?? '',
      // Ya viene escrito en su propia base; no hay nada que reconvertir.
      registro_modbus: variable?.registro_display ?? '',
      notacion_registro: variable?.notacion_registro ?? lastNotation,
      tipo_registro: variable?.tipo_registro ?? 'holding',
      tipo_dato: variable?.tipo_dato ?? 'uint16',
      escala: variable?.escala ?? '1',
    },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (values.nombre === '') errors.nombre = 'Elegí qué mide este registro';

      const registro = readRegister(
        values.registro_modbus,
        values.notacion_registro,
      );
      if (!registro.ok) errors.registro_modbus = registro.error;

      const escala = Number(values.escala);
      if (values.escala.trim() === '' || Number.isNaN(escala)) {
        errors.escala = 'Tiene que ser un número';
      } else if (escala === 0) {
        // A zero multiplier would turn every reading into zero.
        errors.escala = 'La escala no puede ser 0';
      }

      return errors;
    },
    conflictField: 'nombre',
    submit: async (values) => {
      const payload = {
        nombre: values.nombre,
        // Va tal cual se tipeó, con su base: convertirlo acá pondría la misma
        // regla en dos lugares.
        registro_modbus: values.registro_modbus.trim(),
        notacion_registro: values.notacion_registro,
        tipo_registro: values.tipo_registro,
        tipo_dato: values.tipo_dato,
        escala: values.escala.trim(),
      };
      return variable
        ? variablesApi.updateVariable(variable.id, payload)
        : equipmentApi.createEquipmentVariable(equipmentId, payload);
    },
    onSuccess: (saved) => {
      notify('success', isEdit ? 'Variable actualizada' : 'Variable creada');
      onSaved(saved);
    },
  });

  const elegida = mediciones.find(
    (medicion) => medicion.nombre === form.values.nombre,
  );
  const notation = form.values.notacion_registro;
  const isHex = notation === 'hex';
  const reading = readRegister(form.values.registro_modbus, notation);

  /**
   * La equivalencia en la otra base, en vivo. Es lo que deja ver que la base
   * elegida no es la de la hoja de datos, antes de guardar.
   */
  const equivalence = reading.ok
    ? isHex
      ? `= ${reading.value} decimal`
      : `= ${previewHex(reading.value)} en hexadecimal`
    : isHex
      ? 'Como en la hoja de datos: 2006 o 0x2006.'
      : 'Solo dígitos decimales.';

  return (
    <Drawer
      open
      onClose={onClose}
      title={isEdit ? 'Editar variable' : 'Nueva variable'}
      description={isEdit ? variable.nombre : undefined}
      footer={
        <>
          <Button onClick={onClose} disabled={form.submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="variable-form"
            variant="primary"
            loading={form.submitting}
          >
            {isEdit ? 'Guardar cambios' : 'Crear variable'}
          </Button>
        </>
      }
    >
      <form
        id="variable-form"
        onSubmit={form.handleSubmit}
        className="flex flex-col gap-4"
      >
        <Select
          id="variable-nombre"
          label="Medición"
          required
          autoFocus
          hint={
            elegida
              ? `Se guarda como ${elegida.nombre}${elegida.acumulativa ? ' · contador acumulativo' : ''}`
              : 'Qué mide este registro. El nombre y la unidad salen de acá.'
          }
          value={form.values.nombre}
          options={opciones}
          error={form.errorFor('nombre')}
          onValueChange={(value) => {
            form.setValue('nombre', value);
          }}
        />
        <Field
          id="variable-registro"
          label="Registro Modbus"
          required
          error={form.errorFor('registro_modbus')}
          hint={equivalence}
        >
          <div className="flex gap-2">
            <input
              id="variable-registro"
              required
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              placeholder={isHex ? '2006' : '2000'}
              aria-invalid={form.errorFor('registro_modbus') ? true : undefined}
              aria-describedby={describedBy(
                'variable-registro',
                form.errorFor('registro_modbus'),
                equivalence,
              )}
              value={form.values.registro_modbus}
              onChange={(event) => {
                // Lo que no puede ser válido en esta base no llega a escribirse.
                const cleaned = [...event.target.value]
                  .filter((char) => isRegisterChar(char, notation))
                  .join('');
                form.setValue('registro_modbus', cleaned);
              }}
              className={cx(
                controlClassName,
                controlBorder(Boolean(form.errorFor('registro_modbus'))),
                'flex-1 tabular-nums',
              )}
            />
            {/* El ancho va en el contenedor: `controlClassName` ya trae
                `w-full`, y dos utilidades de ancho en el mismo elemento
                dependen del orden del stylesheet, no del de las clases. */}
            <div className="w-28 shrink-0">
              <select
                aria-label="Base del registro"
                value={notation}
                onChange={(event) => {
                  const next =
                    REGISTER_NOTATION.find(
                      (option) => option === event.target.value,
                    ) ?? 'decimal';
                  lastNotation = next;
                  form.setValue('notacion_registro', next);
                }}
                className={cx(controlClassName, controlBorder(false))}
              >
                {REGISTER_NOTATION.map((option) => (
                  <option key={option} value={option}>
                    {NOTATION_LABEL[option]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Select
            id="variable-tipo-registro"
            label="Espacio de direcciones"
            value={form.values.tipo_registro}
            options={optionsFrom(
              MODBUS_REGISTER_TYPE,
              MODBUS_REGISTER_TYPE_LABEL,
            )}
            error={form.errorFor('tipo_registro')}
            onValueChange={(value) => {
              form.setValue('tipo_registro', value);
            }}
          />
        </div>
        <Select
          id="variable-tipo-dato"
          label="Tipo de dato"
          value={form.values.tipo_dato}
          options={optionsFrom(MODBUS_DATA_TYPE, MODBUS_DATA_TYPE_LABEL)}
          error={form.errorFor('tipo_dato')}
          onValueChange={(value) => {
            form.setValue('tipo_dato', value);
          }}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="variable-escala"
            label="Escala"
            required
            numeric
            inputMode="decimal"
            hint="Multiplicador de la lectura cruda."
            value={form.values.escala}
            error={form.errorFor('escala')}
            onChange={(event) => {
              form.setValue('escala', event.target.value);
            }}
          />
          {/* La unidad no se pregunta: sale de qué se está midiendo. Se
              muestra para confirmar que la elección fue la correcta. */}
          <Field id="variable-unidad" label="Unidad">
            <p className="rounded-lg border border-line bg-surface-muted px-3 py-2.5 text-sm text-content-muted">
              {elegida
                ? elegida.unidad || 'adimensional'
                : 'Elegí una medición'}
            </p>
          </Field>
        </div>
        {/* El intervalo de lectura ya no vive acá ni en el equipo: es del
            gateway, porque un ciclo recorre todos sus dispositivos. */}

        {form.formError && (
          <p role="alert" className="text-sm text-danger">
            {form.formError}
          </p>
        )}
      </form>
    </Drawer>
  );
}
