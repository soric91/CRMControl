import { SERVICE_PERMISSION, serviceAccountsApi } from '../../api';
import type {
  Client,
  ServiceAccount,
  ServiceAccountCreated,
  ServicePermission,
} from '../../api';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Drawer';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import type { SelectOption } from '../../components/ui/Select';
import { Toggle } from '../../components/ui/Toggle';
import { useResourceForm } from '../../hooks/useResourceForm';
import { useToast } from '../../hooks/useToast';
import { PERMISSION_DESCRIPTION, PERMISSION_LABEL } from './permissions';

interface ServiceAccountFormValues {
  nombre: string;
  descripcion: string;
  permisos: ServicePermission[];
  client_id: string;
  /** `YYYY-MM-DD`, lo que habla un `<input type="date">`. Vacío = sin vencimiento. */
  expira: string;
}

/** Fin del día elegido, en UTC: la fecha vale entera, no hasta la medianoche local. */
function toDeadline(date: string): string {
  return `${date}T23:59:59Z`;
}

function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

export interface ServiceAccountFormProps {
  /** `null` emite una credencial nueva; una cuenta edita lo que ya existe. */
  account: ServiceAccount | null;
  clients: Client[];
  onClose: () => void;
  /** Solo la creación devuelve el secreto; editar nunca lo toca. */
  onCreated: (created: ServiceAccountCreated) => void;
  onUpdated: () => void;
}

export function ServiceAccountForm({
  account,
  clients,
  onClose,
  onCreated,
  onUpdated,
}: ServiceAccountFormProps) {
  const { notify } = useToast();
  const isEdit = account !== null;

  const clientOptions: SelectOption<string>[] = [
    { value: '', label: 'Toda la plataforma' },
    ...clients.map((client) => ({
      value: client.id,
      label: client.nombre_empresa,
    })),
  ];

  const form = useResourceForm<
    ServiceAccountFormValues,
    ServiceAccount | ServiceAccountCreated
  >({
    initialValues: {
      nombre: account?.nombre ?? '',
      descripcion: account?.descripcion ?? '',
      permisos: account?.permisos ?? [],
      client_id: account?.client_id ?? '',
      expira: toDateInput(account?.expira_en ?? null),
    },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (values.nombre.trim() === '') errors.nombre = 'Obligatorio';
      if (values.permisos.length === 0) {
        errors.permisos =
          'Elegí al menos uno: una credencial que no lee nada no sirve';
      }
      if (
        values.expira !== '' &&
        toDeadline(values.expira) <= new Date().toISOString()
      ) {
        errors.expira = 'Tiene que ser una fecha futura';
      }
      return errors;
    },
    conflictField: 'nombre',
    errorMessages: {
      already_exists: 'Ya hay una credencial con ese nombre',
    },
    submit: async (values) => {
      const expira_en = values.expira === '' ? null : toDeadline(values.expira);
      const descripcion =
        values.descripcion.trim() === '' ? null : values.descripcion.trim();

      // El ámbito no se mueve después de emitida: cambiarlo alteraría en
      // silencio qué datos ve un sistema que ya está corriendo.
      return account
        ? serviceAccountsApi.updateServiceAccount(account.id, {
            nombre: values.nombre.trim(),
            descripcion,
            permisos: values.permisos,
            expira_en,
          })
        : serviceAccountsApi.createServiceAccount({
            nombre: values.nombre.trim(),
            descripcion,
            permisos: values.permisos,
            client_id: values.client_id === '' ? null : values.client_id,
            expira_en,
          });
    },
    onSuccess: (saved) => {
      if (isEdit) {
        notify('success', 'Credencial actualizada');
        onUpdated();
      } else {
        onCreated(saved as ServiceAccountCreated);
      }
    },
  });

  const togglePermission = (permission: ServicePermission, on: boolean) => {
    form.setValue(
      'permisos',
      on
        ? [...form.values.permisos, permission]
        : form.values.permisos.filter((item) => item !== permission),
    );
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={isEdit ? 'Editar credencial' : 'Nueva credencial de servicio'}
      description={
        isEdit
          ? account.credencial_id
          : 'Para otro sistema, no para una persona. El secreto se muestra una sola vez.'
      }
      footer={
        <>
          <Button onClick={onClose} disabled={form.submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="service-account-form"
            variant="primary"
            loading={form.submitting}
          >
            {isEdit ? 'Guardar cambios' : 'Emitir credencial'}
          </Button>
        </>
      }
    >
      <form
        id="service-account-form"
        onSubmit={form.handleSubmit}
        className="flex flex-col gap-4"
      >
        <Input
          id="service-nombre"
          label="Sistema"
          required
          autoFocus={!isEdit}
          hint="Cómo se llama el sistema que va a usarla, p. ej. ApiEMS."
          value={form.values.nombre}
          error={form.errorFor('nombre')}
          onChange={(event) => {
            form.setValue('nombre', event.target.value);
          }}
        />

        <Input
          id="service-descripcion"
          label="Para qué"
          hint="Opcional. Lo que se lee acá dentro de un año decide si se puede revocar sin miedo."
          value={form.values.descripcion}
          error={form.errorFor('descripcion')}
          onChange={(event) => {
            form.setValue('descripcion', event.target.value);
          }}
        />

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium text-content">
            Qué puede leer
          </legend>
          <p className="text-xs text-content-subtle">
            Todo es de lectura: no hay permiso que habilite escribir. Dale lo
            mínimo — se puede ampliar después sin rotar el secreto.
          </p>
          {SERVICE_PERMISSION.map((permission) => (
            <Toggle
              key={permission}
              id={`service-permission-${permission.replace(':', '-')}`}
              label={PERMISSION_LABEL[permission]}
              description={PERMISSION_DESCRIPTION[permission]}
              checked={form.values.permisos.includes(permission)}
              onCheckedChange={(on) => {
                togglePermission(permission, on);
              }}
            />
          ))}
          {form.errorFor('permisos') && (
            <p role="alert" className="text-sm text-danger">
              {form.errorFor('permisos')}
            </p>
          )}
        </fieldset>

        <Select
          id="service-client"
          label="Alcance"
          value={form.values.client_id}
          options={clientOptions}
          // Cambiarlo después movería en silencio qué ve un sistema que ya
          // está corriendo. Se emite una credencial nueva en su lugar.
          disabled={isEdit}
          hint={
            isEdit
              ? 'El alcance no se puede cambiar. Si tiene que ser otro, emití una credencial nueva.'
              : 'Fijala a una empresa si el consumidor sirve solo a esa. Así no puede enumerar las demás.'
          }
          onValueChange={(value) => {
            form.setValue('client_id', value);
          }}
        />

        <Input
          id="service-expira"
          label="Vence el"
          type="date"
          hint="Opcional, pero recomendado: una credencial sin vencimiento es una que nadie vuelve a mirar."
          value={form.values.expira}
          error={form.errorFor('expira')}
          onChange={(event) => {
            form.setValue('expira', event.target.value);
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
