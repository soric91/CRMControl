import type { ReactNode } from 'react';
import type { Equipment } from '../../api';
import { Badge } from '../../components/ui/Badge';
import { ResourceList } from '../../components/ui/ResourceList';
import type { Column } from '../../components/ui/Table';
import type { PaginatedResource } from '../../hooks/usePaginatedResource';
import {
  EQUIPMENT_TYPE_LABEL,
  MODBUS_TRANSPORT_SHORT,
  formatText,
} from '../../lib/formatters';

/** Where the gateway reaches the device: a serial port, or a host and port. */
export function equipmentEndpoint(equipment: Equipment): string {
  return equipment.transporte === 'tcp'
    ? `${formatText(equipment.host)}:${equipment.puerto_tcp ?? ''}`
    : formatText(equipment.puerto);
}

/** The serial line settings, in the usual `9600 8N1` shorthand. */
export function serialSummary(equipment: Equipment): string | null {
  if (equipment.transporte !== 'rtu') return null;
  return `${equipment.baudrate ?? ''} ${equipment.bits ?? ''}${equipment.paridad ?? ''}${equipment.stop_bits ?? ''}`;
}

const COLUMNS: Column<Equipment>[] = [
  {
    key: 'modbus_id',
    header: 'Modbus ID',
    numeric: true,
    sortValue: (equipment) => equipment.modbus_id,
    render: (equipment) => (
      <span className="font-medium">{equipment.modbus_id}</span>
    ),
  },
  {
    key: 'nombre_dispositivo',
    header: 'Nombre en firmware',
    sortValue: (equipment) => equipment.nombre_dispositivo,
    render: (equipment) => (
      <span className="font-mono text-xs">{equipment.nombre_dispositivo}</span>
    ),
  },
  {
    key: 'tipo',
    header: 'Tipo',
    sortValue: (equipment) => equipment.tipo,
    render: (equipment) => (
      <Badge tone="neutral">{EQUIPMENT_TYPE_LABEL[equipment.tipo]}</Badge>
    ),
  },
  {
    key: 'marca',
    header: 'Marca y modelo',
    sortValue: (equipment) => equipment.marca ?? '',
    render: (equipment) =>
      equipment.marca || equipment.modelo
        ? `${formatText(equipment.marca)} ${equipment.modelo ?? ''}`.trim()
        : formatText(null),
  },
  {
    key: 'transporte',
    header: 'Transporte',
    sortValue: (equipment) => equipment.transporte,
    render: (equipment) => (
      <Badge tone={equipment.transporte === 'tcp' ? 'accent' : 'neutral'}>
        {MODBUS_TRANSPORT_SHORT[equipment.transporte]}
      </Badge>
    ),
  },
  {
    key: 'conexion',
    header: 'Conexión',
    onCard: false,
    sortValue: (equipment) => equipmentEndpoint(equipment),
    render: (equipment) => {
      const serial = serialSummary(equipment);
      return (
        <span className="tabular-nums">
          {equipmentEndpoint(equipment)}
          {serial && <span className="text-content-subtle"> · {serial}</span>}
        </span>
      );
    },
  },
  {
    key: 'device_type',
    header: 'Tipo en firmware',
    onCard: false,
    sortValue: (equipment) => equipment.device_type,
    render: (equipment) => equipment.device_type,
  },
];

export interface EquipmentTableProps {
  resource: PaginatedResource<Equipment>;
  onRowClick: (equipment: Equipment) => void;
  rowActions?: (equipment: Equipment) => ReactNode;
  toolbar?: ReactNode;
  emptyAction?: ReactNode;
}

export function EquipmentTable({
  resource,
  onRowClick,
  rowActions,
  toolbar,
  emptyAction,
}: EquipmentTableProps) {
  return (
    <ResourceList
      resource={resource}
      columns={COLUMNS}
      rowKey={(equipment) => equipment.id}
      caption="Equipos del gateway"
      title={`${resource.total} ${resource.total === 1 ? 'equipo' : 'equipos'}`}
      toolbar={toolbar}
      emptyTitle="Este gateway no tiene equipos"
      emptyDescription="Cada equipo es un dispositivo Modbus colgado del puerto serie del gateway."
      emptyAction={emptyAction}
      onRowClick={onRowClick}
      rowActions={rowActions}
    />
  );
}
