import type { ReactNode } from 'react';
import type { Gateway, GatewayStatus } from '../../api';
import { Badge } from '../../components/ui/Badge';
import type { BadgeTone } from '../../components/ui/Badge';
import { ResourceList } from '../../components/ui/ResourceList';
import type { Column } from '../../components/ui/Table';
import type { PaginatedResource } from '../../hooks/usePaginatedResource';
import {
  GATEWAY_STATUS_LABEL,
  formatDateTime,
  formatRelative,
  formatText,
} from '../../lib/formatters';

const STATUS_TONE: Record<GatewayStatus, BadgeTone> = {
  online: 'success',
  offline: 'danger',
};

export function GatewayStatusBadge({ estado }: { estado: GatewayStatus }) {
  return (
    <Badge tone={STATUS_TONE[estado]} dot>
      {GATEWAY_STATUS_LABEL[estado]}
    </Badge>
  );
}

/** Relative time in the cell, exact timestamp in the tooltip. */
export function LastSeen({ iso }: { iso: string | null }) {
  return (
    <span title={iso ? formatDateTime(iso) : undefined}>
      {formatRelative(iso)}
    </span>
  );
}

const COLUMNS: Column<Gateway>[] = [
  {
    key: 'numero_serie',
    header: 'Número de serie',
    sortValue: (gateway) => gateway.numero_serie,
    render: (gateway) => (
      <span className="font-medium tabular-nums">{gateway.numero_serie}</span>
    ),
  },
  {
    key: 'estado',
    header: 'Estado',
    sortValue: (gateway) => gateway.estado,
    render: (gateway) => <GatewayStatusBadge estado={gateway.estado} />,
  },
  {
    key: 'ultima_conexion',
    header: 'Última conexión',
    sortValue: (gateway) => gateway.ultima_conexion ?? '',
    render: (gateway) => <LastSeen iso={gateway.ultima_conexion} />,
  },
  {
    key: 'firmware_version',
    header: 'Firmware',
    onCard: false,
    render: (gateway) => formatText(gateway.firmware_version),
  },
  {
    key: 'ip_actual',
    header: 'IP',
    onCard: false,
    render: (gateway) => (
      <span className="tabular-nums">{formatText(gateway.ip_actual)}</span>
    ),
  },
];

export interface GatewaysTableProps {
  resource: PaginatedResource<Gateway>;
  onRowClick: (gateway: Gateway) => void;
  rowActions?: (gateway: Gateway) => ReactNode;
  toolbar?: ReactNode;
  emptyAction?: ReactNode;
}

export function GatewaysTable({
  resource,
  onRowClick,
  rowActions,
  toolbar,
  emptyAction,
}: GatewaysTableProps) {
  return (
    <ResourceList
      resource={resource}
      columns={COLUMNS}
      rowKey={(gateway) => gateway.id}
      caption="Gateways de la sede"
      title={`${resource.total} ${resource.total === 1 ? 'gateway' : 'gateways'}`}
      toolbar={toolbar}
      emptyTitle="Esta sede no tiene gateways"
      emptyDescription="El gateway es el equipo que concentra las lecturas Modbus de la sede."
      emptyAction={emptyAction}
      onRowClick={onRowClick}
      rowActions={rowActions}
    />
  );
}
