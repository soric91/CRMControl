import { useState } from 'react';
import { useNavigate } from 'react-router';
import { clientsApi, gatewaysApi, sitesApi } from '../../api';
import type { Gateway, GatewayStatus } from '../../api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { IconSearch } from '../../components/ui/Icon';
import { ResourceList } from '../../components/ui/ResourceList';
import { Select } from '../../components/ui/Select';
import type { SelectOption } from '../../components/ui/Select';
import type { Column } from '../../components/ui/Table';
import { useNameLookup } from '../../hooks/useNameLookup';
import { usePaginatedResource } from '../../hooks/usePaginatedResource';
import { useResource } from '../../hooks/useResource';
import { cx } from '../../lib/cx';
import { formatText } from '../../lib/formatters';
import { GatewayStatusBadge, LastSeen } from '../gateways/GatewaysTable';

/** `''` is the chip that asks for everything. */
type StatusChip = GatewayStatus | '';

const CHIPS: { value: StatusChip; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'offline', label: 'Caídos' },
  { value: 'online', label: 'En línea' },
];

export function GatewaysFleetPage() {
  const navigate = useNavigate();
  const [estado, setEstado] = useState<StatusChip>('');
  const [search, setSearch] = useState('');
  const [clientId, setClientId] = useState('');
  const [siteId, setSiteId] = useState('');

  const clients = useNameLookup(
    (limit) => clientsApi.listClients({ limit }),
    (client) => client.id,
    (client) => client.nombre_empresa,
  );
  const sites = useNameLookup(
    (limit) =>
      sitesApi.listSites({ limit, ...(clientId && { client_id: clientId }) }),
    (site) => site.id,
    (site) => site.nombre,
    [clientId],
  );

  const filters = {
    ...(estado !== '' && { estado }),
    ...(search.trim() !== '' && { search: search.trim() }),
    ...(clientId !== '' && { client_id: clientId }),
    ...(siteId !== '' && { site_id: siteId }),
  };

  const gateways = usePaginatedResource(
    (params) => gatewaysApi.listGateways({ ...params, ...filters }),
    [estado, search, clientId, siteId],
  );

  // Un pedido de una fila por estado: el conteo del chip tiene que ser el
  // total, no lo que entró en la página actual.
  const counts = useResource(async () => {
    const scoped = { ...filters, limit: 1 };
    const [all, offline] = await Promise.all([
      gatewaysApi.listGateways({ ...scoped, estado: undefined }),
      gatewaysApi.listGateways({ ...scoped, estado: 'offline' }),
    ]);
    return { all: all.total, offline: offline.total };
  }, [search, clientId, siteId]);

  const countFor = (chip: StatusChip): number | null => {
    if (!counts.data) return null;
    if (chip === '') return counts.data.all;
    if (chip === 'offline') return counts.data.offline;
    return counts.data.all - counts.data.offline;
  };

  /**
   * La ruta del detalle necesita el cliente y la sede, y el gateway solo trae
   * `site_id`. Si la sede no entró en la página del lookup se pide, en vez de
   * dejar la fila muerta.
   */
  const openGateway = async (gateway: Gateway) => {
    const cached = sites.items.find((item) => item.id === gateway.site_id);
    const site = cached ?? (await sitesApi.getSite(gateway.site_id));
    await navigate(
      `/clients/${site.client_id}/sites/${site.id}/gateways/${gateway.id}`,
    );
  };

  const clientOptions: SelectOption<string>[] = [
    { value: '', label: 'Todas las empresas' },
    ...clients.items.map((client) => ({
      value: client.id,
      label: client.nombre_empresa,
    })),
  ];
  const siteOptions: SelectOption<string>[] = [
    { value: '', label: 'Todas las sedes' },
    ...sites.items.map((site) => ({ value: site.id, label: site.nombre })),
  ];

  const columns: Column<Gateway>[] = [
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
      // Los caídos primero: es lo que la persona vino a ver.
      sortValue: (gateway) => (gateway.estado === 'offline' ? 0 : 1),
      render: (gateway) => <GatewayStatusBadge estado={gateway.estado} />,
    },
    {
      key: 'ultima_conexion',
      header: 'Última conexión',
      sortValue: (gateway) => gateway.ultima_conexion ?? '',
      render: (gateway) => <LastSeen iso={gateway.ultima_conexion} />,
    },
    {
      key: 'site_id',
      header: 'Sede',
      onCard: false,
      render: (gateway) => sites.names.get(gateway.site_id) ?? gateway.site_id,
    },
    {
      key: 'firmware_version',
      header: 'Firmware',
      onCard: false,
      render: (gateway) => formatText(gateway.firmware_version),
    },
    {
      key: 'config_habilitada',
      header: 'Descarga',
      render: (gateway) =>
        gateway.config_habilitada ? (
          <Badge tone="accent">Habilitada</Badge>
        ) : (
          <span className="text-content-subtle">—</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Gateways"
        description="Todos los equipos de campo, sin recorrer la jerarquía. Los caídos aparecen primero."
      />

      <div className="flex flex-col gap-3">
        <div
          role="group"
          aria-label="Filtrar por estado"
          className="flex flex-wrap gap-2"
        >
          {CHIPS.map((chip) => {
            const count = countFor(chip.value);
            return (
              <button
                key={chip.value}
                type="button"
                aria-pressed={estado === chip.value}
                onClick={() => {
                  setEstado(chip.value);
                }}
                className={cx(
                  'rounded-full border px-3 py-1 text-sm transition-colors',
                  estado === chip.value
                    ? 'border-accent bg-accent-soft font-medium text-accent-soft-content'
                    : 'border-line text-content-muted hover:border-line-strong hover:text-content',
                )}
              >
                {chip.label}
                {count !== null && (
                  <span className="ml-1.5 tabular-nums opacity-70">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-content-subtle" />
            <input
              type="search"
              aria-label="Buscar por número de serie"
              placeholder="Número de serie…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
              className="w-full rounded-md border border-line-strong bg-surface py-2 pr-3 pl-9 text-sm text-content placeholder:text-content-subtle"
            />
          </div>
          <Select
            id="fleet-client"
            label="Empresa"
            value={clientId}
            options={clientOptions}
            onValueChange={(value) => {
              setClientId(value);
              // La sede elegida puede no pertenecer a la empresa nueva.
              setSiteId('');
            }}
          />
          <Select
            id="fleet-site"
            label="Sede"
            value={siteId}
            options={siteOptions}
            onValueChange={setSiteId}
          />
        </div>
      </div>

      <ResourceList
        resource={gateways}
        columns={columns}
        rowKey={(gateway) => gateway.id}
        caption="Gateways de la flota"
        title={`${gateways.total} ${gateways.total === 1 ? 'gateway' : 'gateways'}`}
        emptyTitle="Ningún gateway coincide"
        emptyDescription="Probá con otro estado o limpiá los filtros."
        onRowClick={(gateway) => {
          void openGateway(gateway);
        }}
      />
    </div>
  );
}
