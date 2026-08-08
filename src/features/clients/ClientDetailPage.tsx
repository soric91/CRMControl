import { useState } from 'react';
import { useNavigate } from 'react-router';
import { clientsApi, sitesApi } from '../../api';
import type { Client, Site } from '../../api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DetailList, Panel } from '../../components/ui/DetailList';
import { IconPlus } from '../../components/ui/Icon';
import { Menu } from '../../components/ui/Menu';
import { Toggle } from '../../components/ui/Toggle';
import { useAuth } from '../../hooks/useAuth';
import { usePaginatedResource } from '../../hooks/usePaginatedResource';
import { useToast } from '../../hooks/useToast';
import { asApiError } from '../../lib/errors';
import { formatDate, formatDateTime, formatText } from '../../lib/formatters';
import { canWrite } from '../../lib/permissions';
import { SiteForm } from '../sites/SiteForm';
import { SitesTable } from '../sites/SitesTable';
import { ClientForm } from './ClientForm';
import { ClientStatusBadge } from './ClientsTable';
import { useClientOutlet } from './ClientLayout';
import { MonitorAccessPanel } from './MonitorAccessPanel';

type SiteFormTarget = Site | 'new' | null;

export function ClientDetailPage() {
  const { client, setClient } = useClientOutlet();
  const { user } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [editingClient, setEditingClient] = useState(false);
  const [siteTarget, setSiteTarget] = useState<SiteFormTarget>(null);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
  const [savingConsumo, setSavingConsumo] = useState(false);
  // Turning the panel on is what provisions the client's login, once.
  const [grantAccess, setGrantAccess] = useState(false);

  const sites = usePaginatedResource(
    (params) => clientsApi.listClientSites(client.id, params),
    [client.id],
  );

  const writable = user !== null && canWrite(user.role);

  const toggleConsumo = async (checked: boolean) => {
    setSavingConsumo(true);
    try {
      const updated: Client = await clientsApi.updateClient(client.id, {
        puede_ver_consumo: checked,
      });
      setClient(updated);
      notify(
        'success',
        checked
          ? 'El cliente ya puede ver su consumo'
          : 'Panel de consumo deshabilitado',
      );
      // Revocar el acceso al apagarlo sería un login que falla sin explicar
      // nada; es mejor que entre y vea el estado vacío.
      if (checked) setGrantAccess(true);
    } catch (caught: unknown) {
      notify('error', asApiError(caught).message);
    } finally {
      setSavingConsumo(false);
    }
  };

  const deleteSite = async (site: Site) => {
    try {
      await sitesApi.deleteSite(site.id);
      notify('success', `Sede "${site.nombre}" eliminada`);
      sites.reload();
    } catch (caught: unknown) {
      notify('error', asApiError(caught).message);
    } finally {
      setSiteToDelete(null);
    }
  };

  const newSiteButton = writable ? (
    <Button
      variant="primary"
      size="sm"
      icon={<IconPlus className="size-4" />}
      onClick={() => {
        setSiteTarget('new');
      }}
    >
      Nueva sede
    </Button>
  ) : undefined;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={client.nombre_empresa}
        meta={<ClientStatusBadge estado={client.estado} />}
        description={formatText(client.plan_contratado)}
        actions={
          writable && (
            <Button
              onClick={() => {
                setEditingClient(true);
              }}
            >
              Editar cliente
            </Button>
          )
        }
      />

      <Panel title="Datos del cliente">
        <DetailList
          items={[
            { label: 'Contacto', value: formatText(client.contacto_nombre) },
            { label: 'Email', value: formatText(client.contacto_email) },
            { label: 'Teléfono', value: formatText(client.contacto_telefono) },
            { label: 'Plan', value: formatText(client.plan_contratado) },
            { label: 'Fecha de alta', value: formatDate(client.fecha_alta) },
            {
              label: 'Última modificación',
              value: formatDateTime(client.updated_at),
            },
          ]}
        />

        <div className="mt-5 border-t border-line pt-4">
          <Toggle
            id="client-detail-consumo"
            label="Puede ver su consumo"
            description="Habilita el panel de consumo energético para los usuarios de esta empresa."
            checked={client.puede_ver_consumo}
            disabled={!writable || savingConsumo}
            onCheckedChange={(checked) => {
              void toggleConsumo(checked);
            }}
          />
        </div>
      </Panel>

      <MonitorAccessPanel
        clientId={client.id}
        writable={writable}
        autoCreate={grantAccess}
        onAutoCreateHandled={() => {
          setGrantAccess(false);
        }}
      />

      <SitesTable
        resource={sites}
        toolbar={newSiteButton}
        emptyAction={newSiteButton}
        onRowClick={(site) => {
          void navigate(`/clients/${client.id}/sites/${site.id}`);
        }}
        rowActions={(site) => (
          <Menu
            label={`Acciones de ${site.nombre}`}
            items={[
              {
                label: 'Ver gateways',
                onSelect: () => {
                  void navigate(`/clients/${client.id}/sites/${site.id}`);
                },
              },
              ...(writable
                ? [
                    {
                      label: 'Editar',
                      onSelect: () => {
                        setSiteTarget(site);
                      },
                    },
                    {
                      label: 'Eliminar',
                      danger: true,
                      onSelect: () => {
                        setSiteToDelete(site);
                      },
                    },
                  ]
                : []),
            ]}
          />
        )}
      />

      {editingClient && (
        <ClientForm
          client={client}
          onClose={() => {
            setEditingClient(false);
          }}
          onSaved={(saved) => {
            setClient(saved);
            setEditingClient(false);
          }}
        />
      )}

      {siteTarget !== null && (
        <SiteForm
          key={siteTarget === 'new' ? 'new' : siteTarget.id}
          clientId={client.id}
          site={siteTarget === 'new' ? null : siteTarget}
          onClose={() => {
            setSiteTarget(null);
          }}
          onSaved={() => {
            setSiteTarget(null);
            sites.reload();
          }}
        />
      )}

      <ConfirmDialog
        open={siteToDelete !== null}
        title="Eliminar sede"
        message={
          siteToDelete
            ? `Se eliminará "${siteToDelete.nombre}" junto con sus gateways, equipos y variables. Esta acción no se puede deshacer.`
            : ''
        }
        onCancel={() => {
          setSiteToDelete(null);
        }}
        onConfirm={() => (siteToDelete ? deleteSite(siteToDelete) : undefined)}
      />
    </div>
  );
}
