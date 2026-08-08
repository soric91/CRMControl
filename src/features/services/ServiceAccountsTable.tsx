import type { ReactNode } from 'react';
import type { ServiceAccount } from '../../api';
import { Badge } from '../../components/ui/Badge';
import { ResourceList } from '../../components/ui/ResourceList';
import type { Column } from '../../components/ui/Table';
import type { PaginatedResource } from '../../hooks/usePaginatedResource';
import { formatDateTime } from '../../lib/formatters';
import { PERMISSION_LABEL, expiryState } from './permissions';

const COLUMNS: Column<ServiceAccount>[] = [
  {
    key: 'nombre',
    header: 'Sistema',
    sortValue: (account) => account.nombre,
    render: (account) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">{account.nombre}</span>
        {account.descripcion && (
          <span className="text-xs text-content-subtle">
            {account.descripcion}
          </span>
        )}
      </div>
    ),
  },
  {
    key: 'credencial_id',
    header: 'Identificador',
    // Plain text, not a CopyValue: the card layout wraps every cell in a
    // button and a button inside a button is invalid markup. The copy
    // affordance lives where it is actually needed — the dialog that issues
    // the credential, which shows both halves together.
    render: (account) => (
      <code className="font-mono text-xs text-content-muted">
        {account.credencial_id}
      </code>
    ),
  },
  {
    key: 'permisos',
    header: 'Puede leer',
    render: (account) => (
      <div className="flex flex-wrap gap-1">
        {account.permisos.map((permission) => (
          <Badge key={permission} tone="accent">
            {PERMISSION_LABEL[permission]}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    key: 'activo',
    header: 'Estado',
    render: (account) => {
      const expiry = expiryState(account);
      if (!account.activo) {
        return (
          <Badge tone="danger" dot>
            Desactivada
          </Badge>
        );
      }
      if (expiry === 'expired') {
        return (
          <Badge tone="danger" dot>
            Vencida
          </Badge>
        );
      }
      if (expiry === 'soon') {
        return (
          <Badge tone="warning" dot>
            Vence pronto
          </Badge>
        );
      }
      return (
        <Badge tone="success" dot>
          Activa
        </Badge>
      );
    },
  },
  {
    key: 'ultimo_uso_en',
    header: 'Último uso',
    onCard: false,
    sortValue: (account) => account.ultimo_uso_en ?? '',
    // Never used is worth seeing: it usually means the consumer was never
    // configured with the secret that was generated for it.
    render: (account) =>
      account.ultimo_uso_en ? (
        formatDateTime(account.ultimo_uso_en)
      ) : (
        <span className="text-content-subtle">Nunca</span>
      ),
  },
];

export interface ServiceAccountsTableProps {
  resource: PaginatedResource<ServiceAccount>;
  rowActions?: (account: ServiceAccount) => ReactNode;
  emptyAction?: ReactNode;
}

export function ServiceAccountsTable({
  resource,
  rowActions,
  emptyAction,
}: ServiceAccountsTableProps) {
  return (
    <ResourceList
      resource={resource}
      columns={COLUMNS}
      rowKey={(account) => account.id}
      caption="Credenciales de sistemas que consumen esta API"
      title={`${resource.total} ${
        resource.total === 1 ? 'credencial' : 'credenciales'
      }`}
      emptyTitle="Todavía no hay credenciales de servicio"
      emptyDescription="Sin una, otro sistema tendría que entrar con la cuenta de una persona: una contraseña que abre el panel y que además puede escribir."
      emptyAction={emptyAction}
      rowActions={rowActions}
    />
  );
}
