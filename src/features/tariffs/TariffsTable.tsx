import type { ReactNode } from 'react';
import type { Tariff } from '../../api';
import { ResourceList } from '../../components/ui/ResourceList';
import type { Column } from '../../components/ui/Table';
import type { PaginatedResource } from '../../hooks/usePaginatedResource';
import { formatDateTime, formatMonth } from '../../lib/formatters';

const COLUMNS: Column<Tariff>[] = [
  {
    key: 'mes',
    header: 'Período',
    sortValue: (tariff) => tariff.mes,
    render: (tariff) => (
      <span className="font-medium capitalize">{formatMonth(tariff.mes)}</span>
    ),
  },
  {
    key: 'valor_importado',
    header: 'Importado (por kWh)',
    numeric: true,
    sortValue: (tariff) => Number(tariff.valor_importado),
    // El decimal se muestra tal cual viene: formatearlo lo pasaría por un float.
    render: (tariff) => tariff.valor_importado,
  },
  {
    key: 'valor_excedente',
    header: 'Excedente (por kWh)',
    numeric: true,
    sortValue: (tariff) => Number(tariff.valor_excedente),
    render: (tariff) => tariff.valor_excedente,
  },
  {
    key: 'updated_at',
    header: 'Última modificación',
    onCard: false,
    sortValue: (tariff) => tariff.updated_at,
    render: (tariff) => formatDateTime(tariff.updated_at),
  },
];

export interface TariffsTableProps {
  resource: PaginatedResource<Tariff>;
  rowActions?: (tariff: Tariff) => ReactNode;
  toolbar?: ReactNode;
  emptyAction?: ReactNode;
}

export function TariffsTable({
  resource,
  rowActions,
  toolbar,
  emptyAction,
}: TariffsTableProps) {
  return (
    <ResourceList
      resource={resource}
      columns={COLUMNS}
      rowKey={(tariff) => tariff.id}
      caption="Tarifas mensuales de energía"
      title={`${resource.total} ${resource.total === 1 ? 'período' : 'períodos'}`}
      toolbar={toolbar}
      emptyTitle="Todavía no hay tarifas cargadas"
      emptyDescription="Sin tarifa para un mes, el consumo de ese período no se puede valorizar."
      emptyAction={emptyAction}
      rowActions={rowActions}
    />
  );
}
