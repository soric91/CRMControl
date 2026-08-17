import { SITE_TIMEZONE_DEFAULT, clientsApi, sitesApi } from '../../api';
import type { Site } from '../../api';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Drawer';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useResourceForm } from '../../hooks/useResourceForm';
import { useToast } from '../../hooks/useToast';

/**
 * Tres estados, no dos: `''` es "nadie lo declaró", y ahí la analítica deduce
 * el modo de la energía exportada. Un interruptor de dos posiciones obligaría
 * a elegir por sedes que nunca se revisaron, y marcar "no" en una que sí tiene
 * solar le apaga la exportación y el balance neto en el panel.
 */
type Generacion = '' | 'si' | 'no';

const OPCIONES_GENERACION: readonly { value: Generacion; label: string }[] = [
  { value: '', label: 'Detectar automáticamente' },
  { value: 'si', label: 'Sí, tiene generación propia' },
  { value: 'no', label: 'No, solo consumo' },
];

interface SiteFormValues {
  nombre: string;
  direccion: string;
  timezone: string;
  ciudad: string;
  responsable_nombre: string;
  tiene_generacion: Generacion;
  capacidad_kwp: string;
}

function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function comoGeneracion(declarado: boolean | null): Generacion {
  if (declarado === null) return '';
  return declarado ? 'si' : 'no';
}

function comoBooleano(value: Generacion): boolean | null {
  if (value === '') return null;
  return value === 'si';
}

export interface SiteFormProps {
  /** Where a new site is created. Ignored when editing. */
  clientId: string;
  site: Site | null;
  onClose: () => void;
  onSaved: (site: Site) => void;
}

export function SiteForm({ clientId, site, onClose, onSaved }: SiteFormProps) {
  const { notify } = useToast();
  const isEdit = site !== null;

  const form = useResourceForm<SiteFormValues, Site>({
    initialValues: {
      nombre: site?.nombre ?? '',
      direccion: site?.direccion ?? '',
      timezone: site?.timezone ?? SITE_TIMEZONE_DEFAULT,
      ciudad: site?.ciudad ?? '',
      responsable_nombre: site?.responsable_nombre ?? '',
      tiene_generacion: comoGeneracion(site?.tiene_generacion ?? null),
      capacidad_kwp: site?.capacidad_kwp ?? '',
    },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (values.nombre.trim() === '')
        errors.nombre = 'El nombre es obligatorio';
      if (values.timezone.trim() === '') {
        errors.timezone = 'La zona horaria es obligatoria';
      }
      if (values.capacidad_kwp.trim() !== '') {
        const kwp = Number(values.capacidad_kwp);
        if (!Number.isFinite(kwp) || kwp <= 0) {
          errors.capacidad_kwp =
            'La capacidad debe ser un número mayor que cero';
        }
      }
      return errors;
    },
    conflictField: 'nombre',
    submit: async (values) => {
      const payload = {
        nombre: values.nombre.trim(),
        direccion: orNull(values.direccion),
        timezone: values.timezone.trim(),
        ciudad: orNull(values.ciudad),
        responsable_nombre: orNull(values.responsable_nombre),
        tiene_generacion: comoBooleano(values.tiene_generacion),
        // La capacidad solo tiene sentido con generación declarada: si la sede
        // se marca como de solo consumo, se limpia en vez de quedar colgando.
        capacidad_kwp:
          values.tiene_generacion === 'si'
            ? orNull(values.capacidad_kwp)
            : null,
      };
      return site
        ? sitesApi.updateSite(site.id, payload)
        : clientsApi.createClientSite(clientId, payload);
    },
    onSuccess: (saved) => {
      notify('success', isEdit ? 'Sede actualizada' : 'Sede creada');
      onSaved(saved);
    },
  });

  return (
    <Drawer
      open
      onClose={onClose}
      title={isEdit ? 'Editar sede' : 'Nueva sede'}
      description={isEdit ? site.nombre : undefined}
      footer={
        <>
          <Button onClick={onClose} disabled={form.submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="site-form"
            variant="primary"
            loading={form.submitting}
          >
            {isEdit ? 'Guardar cambios' : 'Crear sede'}
          </Button>
        </>
      }
    >
      <form
        id="site-form"
        onSubmit={form.handleSubmit}
        className="flex flex-col gap-4"
      >
        <Input
          id="site-nombre"
          label="Nombre"
          required
          autoFocus
          maxLength={150}
          value={form.values.nombre}
          error={form.errorFor('nombre')}
          onChange={(event) => {
            form.setValue('nombre', event.target.value);
          }}
        />
        <Input
          id="site-direccion"
          label="Dirección"
          maxLength={300}
          value={form.values.direccion}
          error={form.errorFor('direccion')}
          onChange={(event) => {
            form.setValue('direccion', event.target.value);
          }}
        />
        <Input
          id="site-timezone"
          label="Zona horaria"
          required
          maxLength={64}
          hint="Nombre IANA, por ejemplo America/Bogota."
          value={form.values.timezone}
          error={form.errorFor('timezone')}
          onChange={(event) => {
            form.setValue('timezone', event.target.value);
          }}
        />
        <Input
          id="site-ciudad"
          label="Ciudad"
          maxLength={120}
          value={form.values.ciudad}
          error={form.errorFor('ciudad')}
          onChange={(event) => {
            form.setValue('ciudad', event.target.value);
          }}
        />
        <Input
          id="site-responsable"
          label="Responsable"
          maxLength={150}
          value={form.values.responsable_nombre}
          error={form.errorFor('responsable_nombre')}
          onChange={(event) => {
            form.setValue('responsable_nombre', event.target.value);
          }}
        />

        <Select
          id="site-generacion"
          label="Generación propia"
          hint="Con generación, el medidor de frontera solo ve el balance neto y la analítica lo tiene en cuenta. Sin declarar, se detecta por la energía exportada."
          value={form.values.tiene_generacion}
          options={OPCIONES_GENERACION}
          onValueChange={(value) => {
            form.setValue('tiene_generacion', value);
          }}
        />
        {form.values.tiene_generacion === 'si' && (
          <Input
            id="site-capacidad-kwp"
            label="Capacidad instalada (kWp)"
            inputMode="decimal"
            hint="Opcional. Sirve para comparar la producción real con la esperada."
            value={form.values.capacidad_kwp}
            error={form.errorFor('capacidad_kwp')}
            onChange={(event) => {
              form.setValue('capacidad_kwp', event.target.value);
            }}
          />
        )}

        {form.formError && (
          <p role="alert" className="text-sm text-danger">
            {form.formError}
          </p>
        )}
      </form>
    </Drawer>
  );
}
