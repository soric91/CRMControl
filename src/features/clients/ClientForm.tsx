import { CLIENT_STATUS, clientsApi } from '../../api';
import type { Client, ClientStatus } from '../../api';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Drawer';
import { Input } from '../../components/ui/Input';
import { Select, optionsFrom } from '../../components/ui/Select';
import { Toggle } from '../../components/ui/Toggle';
import { useResourceForm } from '../../hooks/useResourceForm';
import { useToast } from '../../hooks/useToast';
import { CLIENT_STATUS_LABEL } from '../../lib/formatters';

interface ClientFormValues {
  nombre_empresa: string;
  contacto_nombre: string;
  contacto_email: string;
  contacto_telefono: string;
  plan_contratado: string;
  estado: ClientStatus;
  fecha_alta: string;
  puede_ver_consumo: boolean;
}

/** Optional text fields travel as null, never as an empty string. */
function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export interface ClientFormProps {
  /** `null` creates; a client edits it. */
  client: Client | null;
  onClose: () => void;
  onSaved: (client: Client) => void;
}

export function ClientForm({ client, onClose, onSaved }: ClientFormProps) {
  const { notify } = useToast();
  const isEdit = client !== null;

  const form = useResourceForm<ClientFormValues, Client>({
    initialValues: {
      nombre_empresa: client?.nombre_empresa ?? '',
      contacto_nombre: client?.contacto_nombre ?? '',
      contacto_email: client?.contacto_email ?? '',
      contacto_telefono: client?.contacto_telefono ?? '',
      plan_contratado: client?.plan_contratado ?? '',
      estado: client?.estado ?? 'prospecto',
      fecha_alta: client?.fecha_alta ?? '',
      puede_ver_consumo: client?.puede_ver_consumo ?? false,
    },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (values.nombre_empresa.trim() === '') {
        errors.nombre_empresa = 'El nombre de la empresa es obligatorio';
      }
      if (
        values.contacto_email !== '' &&
        !values.contacto_email.includes('@')
      ) {
        errors.contacto_email = 'Ingresá un email válido';
      }
      return errors;
    },
    conflictField: 'nombre_empresa',
    submit: async (values) => {
      const common = {
        nombre_empresa: values.nombre_empresa.trim(),
        contacto_nombre: orNull(values.contacto_nombre),
        contacto_email: orNull(values.contacto_email),
        contacto_telefono: orNull(values.contacto_telefono),
        plan_contratado: orNull(values.plan_contratado),
        estado: values.estado,
        puede_ver_consumo: values.puede_ver_consumo,
      };

      // `fecha_alta` is set once, at creation: the update schema has no field
      // for it.
      return client
        ? clientsApi.updateClient(client.id, common)
        : clientsApi.createClient({
            ...common,
            fecha_alta: orNull(values.fecha_alta),
          });
    },
    onSuccess: (saved) => {
      notify('success', isEdit ? 'Cliente actualizado' : 'Cliente creado');
      onSaved(saved);
    },
  });

  return (
    <Drawer
      open
      onClose={onClose}
      title={isEdit ? 'Editar cliente' : 'Nuevo cliente'}
      description={isEdit ? client.nombre_empresa : undefined}
      footer={
        <>
          <Button onClick={onClose} disabled={form.submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="client-form"
            variant="primary"
            loading={form.submitting}
          >
            {isEdit ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </>
      }
    >
      <form
        id="client-form"
        onSubmit={form.handleSubmit}
        className="flex flex-col gap-4"
      >
        <Input
          id="client-nombre"
          label="Nombre de la empresa"
          required
          autoFocus
          maxLength={200}
          value={form.values.nombre_empresa}
          error={form.errorFor('nombre_empresa')}
          onChange={(event) => {
            form.setValue('nombre_empresa', event.target.value);
          }}
        />
        <Input
          id="client-contacto"
          label="Nombre de contacto"
          maxLength={150}
          value={form.values.contacto_nombre}
          error={form.errorFor('contacto_nombre')}
          onChange={(event) => {
            form.setValue('contacto_nombre', event.target.value);
          }}
        />
        <Input
          id="client-email"
          label="Email de contacto"
          type="email"
          value={form.values.contacto_email}
          error={form.errorFor('contacto_email')}
          onChange={(event) => {
            form.setValue('contacto_email', event.target.value);
          }}
        />
        <Input
          id="client-telefono"
          label="Teléfono de contacto"
          maxLength={40}
          value={form.values.contacto_telefono}
          error={form.errorFor('contacto_telefono')}
          onChange={(event) => {
            form.setValue('contacto_telefono', event.target.value);
          }}
        />
        <Input
          id="client-plan"
          label="Plan contratado"
          maxLength={80}
          value={form.values.plan_contratado}
          error={form.errorFor('plan_contratado')}
          onChange={(event) => {
            form.setValue('plan_contratado', event.target.value);
          }}
        />
        <Select
          id="client-estado"
          label="Estado"
          value={form.values.estado}
          options={optionsFrom(CLIENT_STATUS, CLIENT_STATUS_LABEL)}
          error={form.errorFor('estado')}
          onValueChange={(value) => {
            form.setValue('estado', value);
          }}
        />
        {!isEdit && (
          <Input
            id="client-fecha-alta"
            label="Fecha de alta"
            type="date"
            hint="Si la dejás vacía, el backend usa la fecha de hoy."
            value={form.values.fecha_alta}
            error={form.errorFor('fecha_alta')}
            onChange={(event) => {
              form.setValue('fecha_alta', event.target.value);
            }}
          />
        )}
        <Toggle
          id="client-consumo"
          label="Puede ver su consumo"
          description="Habilita el panel de consumo energético para los usuarios de esta empresa."
          checked={form.values.puede_ver_consumo}
          onCheckedChange={(checked) => {
            form.setValue('puede_ver_consumo', checked);
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
