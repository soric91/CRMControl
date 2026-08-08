import type { ReactNode } from 'react';
import type { User, UserRole } from '../../api';
import { Badge } from '../../components/ui/Badge';
import type { BadgeTone } from '../../components/ui/Badge';
import { ResourceList } from '../../components/ui/ResourceList';
import type { Column } from '../../components/ui/Table';
import type { PaginatedResource } from '../../hooks/usePaginatedResource';
import { USER_ROLE_LABEL } from '../../lib/formatters';

const ROLE_TONE: Record<UserRole, BadgeTone> = {
  admin: 'accent',
  tecnico: 'neutral',
  cliente: 'neutral',
  solo_lectura: 'neutral',
};

export interface UsersTableProps {
  resource: PaginatedResource<User>;
  /** Company name per client id, so the table shows names and not UUIDs. */
  clientNames: Map<string, string>;
  rowActions?: (user: User) => ReactNode;
  toolbar?: ReactNode;
  emptyAction?: ReactNode;
}

export function UsersTable({
  resource,
  clientNames,
  rowActions,
  toolbar,
  emptyAction,
}: UsersTableProps) {
  const columns: Column<User>[] = [
    {
      key: 'email',
      header: 'Email',
      sortValue: (user) => user.email,
      render: (user) => <span className="font-medium">{user.email}</span>,
    },
    {
      key: 'role',
      header: 'Rol',
      sortValue: (user) => user.role,
      render: (user) => (
        <Badge tone={ROLE_TONE[user.role]}>{USER_ROLE_LABEL[user.role]}</Badge>
      ),
    },
    {
      key: 'client_id',
      header: 'Empresa',
      render: (user) =>
        user.client_id
          ? (clientNames.get(user.client_id) ?? user.client_id)
          : '—',
    },
    {
      key: 'is_active',
      header: 'Estado',
      sortValue: (user) => String(user.is_active),
      render: (user) =>
        user.is_active ? (
          <Badge tone="success" dot>
            Activo
          </Badge>
        ) : (
          <Badge tone="warning" dot>
            Inactivo
          </Badge>
        ),
    },
  ];

  return (
    <ResourceList
      resource={resource}
      columns={columns}
      rowKey={(user) => user.id}
      caption="Cuentas de la plataforma"
      title={`${resource.total} ${resource.total === 1 ? 'cuenta' : 'cuentas'}`}
      toolbar={toolbar}
      emptyTitle="No hay cuentas que coincidan"
      emptyDescription="Ajustá los filtros o creá una cuenta nueva."
      emptyAction={emptyAction}
      rowActions={rowActions}
    />
  );
}
