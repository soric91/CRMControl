import type { ReactNode } from 'react';
import type { Client, ClientStatus } from '../../api';
import { Badge } from '../../components/ui/Badge';
import type { BadgeTone } from '../../components/ui/Badge';
import { ResourceList } from '../../components/ui/ResourceList';
import type { Column } from '../../components/ui/Table';
import type { PaginatedResource } from '../../hooks/usePaginatedResource';
import {
  CLIENT_STATUS_LABEL,
  formatDate,
  formatText,
} from '../../lib/formatters';

const STATUS_TONE: Record<ClientStatus, BadgeTone> = {
  activo: 'success',
  suspendido: 'warning',
  prospecto: 'neutral',
};

export function ClientStatusBadge({ estado }: { estado: ClientStatus }) {
  return (
    <Badge tone={STATUS_TONE[estado]} dot>
      {CLIENT_STATUS_LABEL[estado]}
    </Badge>
  );
}

const COLUMNS: Column<Client>[] = [
  {
    key: 'nombre_empresa',
    header: 'Empresa',
    sortValue: (client) => client.nombre_empresa,
    render: (client) => (
      <span className="font-medium">{client.nombre_empresa}</span>
    ),
  },
  {
    key: 'estado',
    header: 'Estado',
    sortValue: (client) => client.estado,
    render: (client) => <ClientStatusBadge estado={client.estado} />,
  },
  {
    key: 'contacto',
    header: 'Contacto',
    onCard: false,
    render: (client) => (
      <div className="flex flex-col">
        <span>{formatText(client.contacto_nombre)}</span>
        <span className="text-xs text-content-subtle">
          {formatText(client.contacto_email)}
        </span>
      </div>
    ),
  },
  {
    key: 'plan_contratado',
    header: 'Plan',
    sortValue: (client) => client.plan_contratado ?? '',
    render: (client) => formatText(client.plan_contratado),
  },
  {
    key: 'puede_ver_consumo',
    header: 'Consumo',
    render: (client) =>
      client.puede_ver_consumo ? (
        <Badge tone="accent">Habilitado</Badge>
      ) : (
        <span className="text-content-subtle">—</span>
      ),
  },
  {
    key: 'fecha_alta',
    header: 'Alta',
    numeric: true,
    sortValue: (client) => client.fecha_alta,
    render: (client) => formatDate(client.fecha_alta),
  },
];

export interface ClientsTableProps {
  resource: PaginatedResource<Client>;
  onRowClick: (client: Client) => void;
  rowActions?: (client: Client) => ReactNode;
  emptyAction?: ReactNode;
}

export function ClientsTable({
  resource,
  onRowClick,
  rowActions,
  emptyAction,
}: ClientsTableProps) {
  return (
    <ResourceList
      resource={resource}
      columns={COLUMNS}
      rowKey={(client) => client.id}
      caption="Listado de clientes"
      title={`${resource.total} ${resource.total === 1 ? 'cliente' : 'clientes'}`}
      emptyTitle="Todavía no hay clientes"
      emptyDescription="Creá el primer cliente para empezar a cargar sedes, gateways y equipos."
      emptyAction={emptyAction}
      onRowClick={onRowClick}
      rowActions={rowActions}
    />
  );
}
