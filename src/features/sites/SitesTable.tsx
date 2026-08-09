import type { ReactNode } from 'react';
import type { Site } from '../../api';
import { ResourceList } from '../../components/ui/ResourceList';
import type { Column } from '../../components/ui/Table';
import type { PaginatedResource } from '../../hooks/usePaginatedResource';
import { formatText } from '../../lib/formatters';

const COLUMNS: Column<Site>[] = [
  {
    key: 'nombre',
    header: 'Sede',
    sortValue: (site) => site.nombre,
    render: (site) => <span className="font-medium">{site.nombre}</span>,
  },
  {
    key: 'direccion',
    header: 'Dirección',
    render: (site) => formatText(site.direccion),
  },
  {
    key: 'responsable_nombre',
    header: 'Responsable',
    sortValue: (site) => site.responsable_nombre ?? '',
    render: (site) => formatText(site.responsable_nombre),
  },
  {
    key: 'timezone',
    header: 'Zona horaria',
    onCard: false,
    render: (site) => site.timezone,
  },
  {
    key: 'ciudad',
    header: 'Ciudad',
    onCard: false,
    render: (site) => formatText(site.ciudad),
  },
];

export interface SitesTableProps {
  resource: PaginatedResource<Site>;
  onRowClick: (site: Site) => void;
  rowActions?: (site: Site) => ReactNode;
  toolbar?: ReactNode;
  emptyAction?: ReactNode;
}

export function SitesTable({
  resource,
  onRowClick,
  rowActions,
  toolbar,
  emptyAction,
}: SitesTableProps) {
  return (
    <ResourceList
      resource={resource}
      columns={COLUMNS}
      rowKey={(site) => site.id}
      caption="Sedes del cliente"
      title={`${resource.total} ${resource.total === 1 ? 'sede' : 'sedes'}`}
      toolbar={toolbar}
      emptyTitle="Este cliente no tiene sedes"
      emptyDescription="Una sede es la ubicación física donde se instalan los gateways."
      emptyAction={emptyAction}
      onRowClick={onRowClick}
      rowActions={rowActions}
    />
  );
}
