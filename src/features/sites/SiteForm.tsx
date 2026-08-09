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
  ciudad: string;
  responsable_nombre: string;
}

function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
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
    },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (values.nombre.trim() === '')
        errors.nombre = 'El nombre es obligatorio';
      if (values.timezone.trim() === '') {
        errors.timezone = 'La zona horaria es obligatoria';
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

        {form.formError && (
          <p role="alert" className="text-sm text-danger">
            {form.formError}
          </p>
        )}
      </form>
    </Drawer>
  );
}
