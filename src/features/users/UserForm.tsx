import {
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  USER_ROLE,
  usersApi,
} from '../../api';
import type { Client, User, UserRole } from '../../api';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Drawer';
import { Input } from '../../components/ui/Input';
import { Select, optionsFrom } from '../../components/ui/Select';
import type { SelectOption } from '../../components/ui/Select';
import { Toggle } from '../../components/ui/Toggle';
import { useResourceForm } from '../../hooks/useResourceForm';
import { useToast } from '../../hooks/useToast';
import { USER_ROLE_LABEL } from '../../lib/formatters';

interface UserFormValues {
  email: string;
  password: string;
  role: UserRole;
  /** Empty means "no company"; required for the `cliente` role. */
  client_id: string;
  is_active: boolean;
}

export interface UserFormProps {
  user: User | null;
  clients: Client[];
  onClose: () => void;
  onSaved: (user: User) => void;
}

export function UserForm({ user, clients, onClose, onSaved }: UserFormProps) {
  const { notify } = useToast();
  const isEdit = user !== null;

  const clientOptions: SelectOption<string>[] = [
    { value: '', label: 'Sin empresa' },
    ...clients.map((client) => ({
      value: client.id,
      label: client.nombre_empresa,
    })),
  ];

  const form = useResourceForm<UserFormValues, User>({
    initialValues: {
      email: user?.email ?? '',
      password: '',
      role: user?.role ?? 'tecnico',
      client_id: user?.client_id ?? '',
      is_active: user?.is_active ?? true,
    },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (!values.email.includes('@')) errors.email = 'Ingresá un email válido';
      if (!isEdit && values.password.length < PASSWORD_MIN_LENGTH) {
        errors.password = `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`;
      }
      // The backend enforces this too; saying it here saves a round trip.
      if (values.role === 'cliente' && values.client_id === '') {
        errors.client_id =
          'Un usuario cliente tiene que pertenecer a una empresa';
      }
      if (values.role !== 'cliente' && values.client_id !== '') {
        errors.client_id = 'Solo el rol cliente puede tener empresa asignada';
      }
      return errors;
    },
    conflictField: 'email',
    submit: async (values) =>
      user
        ? usersApi.updateUser(user.id, {
            role: values.role,
            client_id: values.client_id === '' ? null : values.client_id,
            is_active: values.is_active,
          })
        : usersApi.createUser({
            email: values.email.trim(),
            password: values.password,
            role: values.role,
            client_id: values.client_id === '' ? null : values.client_id,
          }),
    onSuccess: (saved) => {
      notify('success', isEdit ? 'Cuenta actualizada' : 'Cuenta creada');
      onSaved(saved);
    },
  });

  return (
    <Drawer
      open
      onClose={onClose}
      title={isEdit ? 'Editar cuenta' : 'Nueva cuenta'}
      description={isEdit ? user.email : undefined}
      footer={
        <>
          <Button onClick={onClose} disabled={form.submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="user-form"
            variant="primary"
            loading={form.submitting}
          >
            {isEdit ? 'Guardar cambios' : 'Crear cuenta'}
          </Button>
        </>
      }
    >
      <form
        id="user-form"
        onSubmit={form.handleSubmit}
        className="flex flex-col gap-4"
      >
        <Input
          id="user-email"
          label="Email"
          type="email"
          required
          autoFocus={!isEdit}
          // The API has no endpoint to change an address.
          disabled={isEdit}
          hint={isEdit ? 'El email no se puede cambiar.' : undefined}
          value={form.values.email}
          error={form.errorFor('email')}
          onChange={(event) => {
            form.setValue('email', event.target.value);
          }}
        />

        {!isEdit && (
          <Input
            id="user-password"
            label="Contraseña inicial"
            type="password"
            autoComplete="new-password"
            required
            maxLength={PASSWORD_MAX_BYTES}
            hint={`Entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_BYTES} caracteres`}
            value={form.values.password}
            error={form.errorFor('password')}
            onChange={(event) => {
              form.setValue('password', event.target.value);
            }}
          />
        )}

        <Select
          id="user-role"
          label="Rol"
          required
          value={form.values.role}
          options={optionsFrom(USER_ROLE, USER_ROLE_LABEL)}
          error={form.errorFor('role')}
          onValueChange={(value) => {
            form.setValue('role', value);
            // Only `cliente` may carry a company, so switching away clears it.
            if (value !== 'cliente') form.setValue('client_id', '');
          }}
        />

        <Select
          id="user-client"
          label="Empresa"
          value={form.values.client_id}
          options={clientOptions}
          disabled={form.values.role !== 'cliente'}
          error={form.errorFor('client_id')}
          hint={
            form.values.role === 'cliente'
              ? 'La empresa cuyo consumo verá esta cuenta.'
              : 'Solo aplica al rol cliente.'
          }
          onValueChange={(value) => {
            form.setValue('client_id', value);
          }}
        />

        {isEdit && (
          <Toggle
            id="user-active"
            label="Cuenta activa"
            description="Una cuenta inactiva no puede iniciar sesión."
            checked={form.values.is_active}
            onCheckedChange={(checked) => {
              form.setValue('is_active', checked);
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
