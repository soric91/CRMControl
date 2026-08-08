import { useState } from 'react';
import { useNavigate } from 'react-router';
import { gatewaysApi, sitesApi } from '../../api';
import type { Gateway } from '../../api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DetailList, Panel } from '../../components/ui/DetailList';
import { IconPlus } from '../../components/ui/Icon';
import { Menu } from '../../components/ui/Menu';
import { useAuth } from '../../hooks/useAuth';
import { usePaginatedResource } from '../../hooks/usePaginatedResource';
import { useToast } from '../../hooks/useToast';
import { asApiError } from '../../lib/errors';
import {
  formatCoordinates,
  formatDateTime,
  formatText,
} from '../../lib/formatters';
import { canWrite } from '../../lib/permissions';
import { GatewayForm } from '../gateways/GatewayForm';
import { GatewaysTable } from '../gateways/GatewaysTable';
import { SiteForm } from './SiteForm';
import { useSiteOutlet } from './SiteLayout';

type GatewayFormTarget = Gateway | 'new' | null;

export function SiteDetailPage() {
  const { client, site, setSite } = useSiteOutlet();
  const { user } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [editingSite, setEditingSite] = useState(false);
  const [gatewayTarget, setGatewayTarget] = useState<GatewayFormTarget>(null);
  const [gatewayToDelete, setGatewayToDelete] = useState<Gateway | null>(null);

  const gateways = usePaginatedResource(
    (params) => sitesApi.listSiteGateways(site.id, params),
    [site.id],
  );

  const writable = user !== null && canWrite(user.role);
  const basePath = `/clients/${client.id}/sites/${site.id}`;

  const deleteGateway = async (gateway: Gateway) => {
    try {
      await gatewaysApi.deleteGateway(gateway.id);
      notify('success', `Gateway "${gateway.numero_serie}" eliminado`);
      gateways.reload();
    } catch (caught: unknown) {
      notify('error', asApiError(caught).message);
    } finally {
      setGatewayToDelete(null);
    }
  };

  const newGatewayButton = writable ? (
    <Button
      variant="primary"
      size="sm"
      icon={<IconPlus className="size-4" />}
      onClick={() => {
        setGatewayTarget('new');
      }}
    >
      Nuevo gateway
    </Button>
  ) : undefined;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={site.nombre}
        description={formatText(site.direccion)}
        actions={
          writable && (
            <Button
              onClick={() => {
                setEditingSite(true);
              }}
            >
              Editar sede
            </Button>
          )
        }
      />

      <Panel title="Datos de la sede">
        <DetailList
          items={[
            { label: 'Dirección', value: formatText(site.direccion) },
            {
              label: 'Responsable',
              value: formatText(site.responsable_nombre),
            },
            { label: 'Zona horaria', value: site.timezone },
            {
              label: 'Coordenadas',
              value: (
                <span className="tabular-nums">
                  {formatCoordinates(site.latitud, site.longitud)}
                </span>
              ),
            },
            {
              label: 'Última modificación',
              value: formatDateTime(site.updated_at),
            },
          ]}
        />
      </Panel>

      <GatewaysTable
        resource={gateways}
        toolbar={newGatewayButton}
        emptyAction={newGatewayButton}
        onRowClick={(gateway) => {
          void navigate(`${basePath}/gateways/${gateway.id}`);
        }}
        rowActions={(gateway) => (
          <Menu
            label={`Acciones de ${gateway.numero_serie}`}
            items={[
              {
                label: 'Ver equipos',
                onSelect: () => {
                  void navigate(`${basePath}/gateways/${gateway.id}`);
                },
              },
              ...(writable
                ? [
                    {
                      label: 'Editar',
                      onSelect: () => {
                        setGatewayTarget(gateway);
                      },
                    },
                    {
                      label: 'Eliminar',
                      danger: true,
                      onSelect: () => {
                        setGatewayToDelete(gateway);
                      },
                    },
                  ]
                : []),
            ]}
          />
        )}
      />

      {editingSite && (
        <SiteForm
          clientId={client.id}
          site={site}
          onClose={() => {
            setEditingSite(false);
          }}
          onSaved={(saved) => {
            setSite(saved);
            setEditingSite(false);
          }}
        />
      )}

      {gatewayTarget !== null && (
        <GatewayForm
          key={gatewayTarget === 'new' ? 'new' : gatewayTarget.id}
          siteId={site.id}
          gateway={gatewayTarget === 'new' ? null : gatewayTarget}
          onClose={() => {
            setGatewayTarget(null);
          }}
          onSaved={() => {
            setGatewayTarget(null);
            gateways.reload();
          }}
        />
      )}

      <ConfirmDialog
        open={gatewayToDelete !== null}
        title="Eliminar gateway"
        message={
          gatewayToDelete
            ? `Se eliminará "${gatewayToDelete.numero_serie}" junto con sus equipos y variables. Esta acción no se puede deshacer.`
            : ''
        }
        onCancel={() => {
          setGatewayToDelete(null);
        }}
        onConfirm={() =>
          gatewayToDelete ? deleteGateway(gatewayToDelete) : undefined
        }
      />
    </div>
  );
}
