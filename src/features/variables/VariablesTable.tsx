import type { ReactNode } from 'react';
import type { Variable } from '../../api';
import { Badge } from '../../components/ui/Badge';
import { ResourceList } from '../../components/ui/ResourceList';
import type { Column, Selection } from '../../components/ui/Table';
import type { PaginatedResource } from '../../hooks/usePaginatedResource';
import {
  MAGNITUD_LABEL,
  MODBUS_DATA_TYPE_LABEL,
  MODBUS_REGISTER_TYPE_LABEL,
  formatText,
} from '../../lib/formatters';

const COLUMNS: Column<Variable>[] = [
  {
    key: 'nombre',
    header: 'Variable',
    sortValue: (variable) => variable.nombre,
    render: (variable) => (
      <span className="font-medium">{variable.nombre}</span>
    ),
  },
  {
    key: 'registro_modbus',
    header: 'Registro',
    numeric: true,
    // Ordena por la dirección real, no por el texto: `0x2006` y `2000` no se
    // comparan como cadenas.
    sortValue: (variable) => variable.registro_modbus,
    // Ya viene escrito en su base; recalcularlo sería inventar una segunda
    // versión de la conversión.
    render: (variable) => (
      <span className="inline-flex items-center gap-1.5">
        {variable.registro_display}
        {variable.notacion_registro === 'hex' && (
          <Badge tone="neutral">HEX</Badge>
        )}
      </span>
    ),
  },
  {
    key: 'tipo_registro',
    header: 'Espacio',
    sortValue: (variable) => variable.tipo_registro,
    render: (variable) => MODBUS_REGISTER_TYPE_LABEL[variable.tipo_registro],
  },
  {
    key: 'tipo_dato',
    header: 'Tipo',
    sortValue: (variable) => variable.tipo_dato,
    render: (variable) => MODBUS_DATA_TYPE_LABEL[variable.tipo_dato],
  },
  {
    key: 'escala',
    header: 'Escala',
    numeric: true,
    render: (variable) => variable.escala,
  },
  {
    key: 'unidad',
    header: 'Unidad',
    render: (variable) => formatText(variable.unidad),
  },
  {
    key: 'magnitud',
    header: 'Mide',
    // Una variable sin magnitud es de las cargadas antes del catálogo: su
    // nombre no se reconoce, y por eso el panel no sabe con qué agruparla.
    // Mostrarlo evita que el hueco pase inadvertido.
    render: (variable) =>
      variable.magnitud ? (
        <span className="inline-flex items-center gap-1.5">
          {MAGNITUD_LABEL[variable.magnitud]}
          {variable.acumulativa && <Badge tone="accent">contador</Badge>}
        </span>
      ) : (
        <Badge tone="warning">sin clasificar</Badge>
      ),
  },
];

export interface VariablesTableProps {
  resource: PaginatedResource<Variable>;
  rowActions?: (variable: Variable) => ReactNode;
  toolbar?: ReactNode;
  emptyAction?: ReactNode;
  /** Variables are leaves, so deleting several at once is safe and useful. */
  selection?: Selection;
}

export function VariablesTable({
  resource,
  rowActions,
  toolbar,
  emptyAction,
  selection,
}: VariablesTableProps) {
  return (
    <ResourceList
      resource={resource}
      columns={COLUMNS}
      rowKey={(variable) => variable.id}
      caption="Variables del equipo"
      title={`${resource.total} ${resource.total === 1 ? 'variable' : 'variables'}`}
      toolbar={toolbar}
      emptyTitle="Este equipo no tiene variables"
      emptyDescription="Una variable define qué registro Modbus se lee, con qué escala y cada cuánto."
      emptyAction={emptyAction}
      rowActions={rowActions}
      selection={selection}
    />
  );
}
