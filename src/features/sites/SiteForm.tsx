import { SITE_TIMEZONE_DEFAULT, clientsApi, sitesApi } from '../../api';
import type { Site } from '../../api';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Drawer';
import { Input } from '../../components/ui/Input';
import { useResourceForm } from '../../hooks/useResourceForm';
import { useToast } from '../../hooks/useToast';

interface SiteFormValues {
  nombre: string;
  direccion: string;
  timezone: string;
  /** Kept as text so the decimal the backend sends is never floated. */
  latitud: string;
  longitud: string;
  responsable_nombre: string;
}

function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Returns an error message when the text is not a number inside the range. */
function coordinateError(value: string, limit: number): string | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 'Tiene que ser un número';
  if (parsed < -limit || parsed > limit) return `Entre -${limit} y ${limit}`;
  return undefined;
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
      latitud: site?.latitud ?? '',
      longitud: site?.longitud ?? '',
      responsable_nombre: site?.responsable_nombre ?? '',
    },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (values.nombre.trim() === '')
        errors.nombre = 'El nombre es obligatorio';
      if (values.timezone.trim() === '') {
        errors.timezone = 'La zona horaria es obligatoria';
      }
      const latitud = coordinateError(values.latitud, 90);
      if (latitud) errors.latitud = latitud;
      const longitud = coordinateError(values.longitud, 180);
      if (longitud) errors.longitud = longitud;
      return errors;
    },
    conflictField: 'nombre',
    submit: async (values) => {
      const payload = {
        nombre: values.nombre.trim(),
        direccion: orNull(values.direccion),
        timezone: values.timezone.trim(),
        latitud: orNull(values.latitud),
        longitud: orNull(values.longitud),
        responsable_nombre: orNull(values.responsable_nombre),
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
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="site-latitud"
            label="Latitud"
            inputMode="decimal"
            numeric
            value={form.values.latitud}
            error={form.errorFor('latitud')}
            onChange={(event) => {
              form.setValue('latitud', event.target.value);
            }}
          />
          <Input
            id="site-longitud"
            label="Longitud"
            inputMode="decimal"
            numeric
            value={form.values.longitud}
            error={form.errorFor('longitud')}
            onChange={(event) => {
              form.setValue('longitud', event.target.value);
            }}
          />
        </div>
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

        {form.formError && (
          <p role="alert" className="text-sm text-danger">
            {form.formError}
          </p>
        )}
      </form>
    </Drawer>
  );
}
