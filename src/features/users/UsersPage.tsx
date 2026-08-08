import { useState } from 'react';
import { USER_ROLE, clientsApi, usersApi } from '../../api';
import type { User, UserRole } from '../../api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { IconPlus } from '../../components/ui/Icon';
import { Menu } from '../../components/ui/Menu';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Select, optionsFrom } from '../../components/ui/Select';
import type { SelectOption } from '../../components/ui/Select';
import { useAuth } from '../../hooks/useAuth';
import { usePaginatedResource } from '../../hooks/usePaginatedResource';
import { useNameLookup } from '../../hooks/useNameLookup';
import { useToast } from '../../hooks/useToast';
import { asApiError } from '../../lib/errors';
import { USER_ROLE_LABEL } from '../../lib/formatters';
import { UserForm } from './UserForm';
import { UserPasswordDialog } from './UserPasswordDialog';
import { UsersTable } from './UsersTable';

type FormTarget = User | 'new' | null;
type RoleFilter = UserRole | '';

const ROLE_FILTER_OPTIONS: SelectOption<RoleFilter>[] = [
  { value: '', label: 'Todos los roles' },
  ...optionsFrom(USER_ROLE, USER_ROLE_LABEL),
];

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const { notify } = useToast();

  const [roleFilter, setRoleFilter] = useState<RoleFilter>('');
  const [clientFilter, setClientFilter] = useState('');
  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const [passwordTarget, setPasswordTarget] = useState<User | null>(null);
  const [toDelete, setToDelete] = useState<User | null>(null);

  const { items: clients, names: clientNames } = useNameLookup(
    (limit) => clientsApi.listClients({ limit }),
    (client) => client.id,
    (client) => client.nombre_empresa,
  );

  const users = usePaginatedResource(
    (params) =>
      usersApi.listUsers({
        ...params,
        ...(roleFilter !== '' && { role: roleFilter }),
        ...(clientFilter !== '' && { client_id: clientFilter }),
      }),
    [roleFilter, clientFilter],
  );

  const clientFilterOptions: SelectOption<string>[] = [
    { value: '', label: 'Todas las empresas' },
    ...clients.map((client) => ({
      value: client.id,
      label: client.nombre_empresa,
    })),
  ];

  const remove = async (target: User) => {
    try {
      await usersApi.deleteUser(target.id);
      notify('success', `Cuenta ${target.email} eliminada`);
      users.reload();
    } catch (caught: unknown) {
      notify('error', asApiError(caught).message);
    } finally {
      setToDelete(null);
    }
  };

  const newUserButton = (
    <Button
      variant="primary"
      icon={<IconPlus className="size-4" />}
      onClick={() => {
        setFormTarget('new');
      }}
    >
      Nueva cuenta
    </Button>
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Usuarios"
        description="Cuentas con acceso a la plataforma. Solo un administrador las gestiona."
        actions={newUserButton}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
        <Select
          id="users-role-filter"
          label="Rol"
          value={roleFilter}
          options={ROLE_FILTER_OPTIONS}
          onValueChange={setRoleFilter}
        />
        <Select
          id="users-client-filter"
          label="Empresa"
          value={clientFilter}
          options={clientFilterOptions}
          onValueChange={setClientFilter}
        />
      </div>

      <UsersTable
        resource={users}
        clientNames={clientNames}
        emptyAction={newUserButton}
        rowActions={(target) => (
          <Menu
            label={`Acciones de ${target.email}`}
            items={[
              {
                label: 'Editar',
                onSelect: () => {
                  setFormTarget(target);
                },
              },
              {
                label: 'Restablecer contraseña',
                onSelect: () => {
                  setPasswordTarget(target);
                },
              },
              {
                label: 'Eliminar',
                danger: true,
                // Deleting your own account would lock you out mid-session.
                disabled: target.id === currentUser?.id,
                onSelect: () => {
                  setToDelete(target);
                },
              },
            ]}
          />
        )}
      />

      {formTarget !== null && (
        <UserForm
          key={formTarget === 'new' ? 'new' : formTarget.id}
          user={formTarget === 'new' ? null : formTarget}
          clients={clients}
          onClose={() => {
            setFormTarget(null);
          }}
          onSaved={() => {
            setFormTarget(null);
            users.reload();
          }}
        />
      )}

      {passwordTarget && (
        <UserPasswordDialog
          user={passwordTarget}
          onClose={() => {
            setPasswordTarget(null);
          }}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Eliminar cuenta"
        message={
          toDelete
            ? `Se eliminará la cuenta ${toDelete.email}. La persona perderá el acceso de inmediato.`
            : ''
        }
        onCancel={() => {
          setToDelete(null);
        }}
        onConfirm={() => (toDelete ? remove(toDelete) : undefined)}
      />
    </div>
  );
}
