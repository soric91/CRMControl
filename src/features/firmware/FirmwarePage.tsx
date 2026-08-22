import { useState } from 'react';
import { clientsApi, firmwareApi } from '../../api';
import type { Client, FirmwareRelease, RolloutResult } from '../../api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { IconPlus } from '../../components/ui/Icon';
import { Menu } from '../../components/ui/Menu';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { SkeletonPanel } from '../../components/ui/Skeleton';
import { Toggle } from '../../components/ui/Toggle';
import { useNameLookup } from '../../hooks/useNameLookup';
import { useResource } from '../../hooks/useResource';
import { useToast } from '../../hooks/useToast';
import { asApiError } from '../../lib/errors';
import { formatDateTime } from '../../lib/formatters';
import { FirmwareReleaseForm } from './FirmwareReleaseForm';

/** Un tamaño en bytes dice poco; en MB dice si conviene bajarlo por 4G. */
function formatSize(bytes: number | null): string {
  if (bytes === null) return '—';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * El catálogo de versiones del firmware.
 *
 * Publicar no es desplegar: acá se sube una versión y se deja disponible. A
 * quién pedírsela es una decisión aparte, y por eso es otro botón — es la
 * separación que permite probar una versión en un equipo antes de llevarla a
 * cien sedes.
 */
export function FirmwarePage() {
  const { notify } = useToast();
  const [publicando, setPublicando] = useState(false);
  const [aRetirar, setARetirar] = useState<FirmwareRelease | null>(null);
  const [aDesplegar, setADesplegar] = useState<FirmwareRelease | null>(null);

  const releases = useResource(() => firmwareApi.listFirmwareReleases(), []);

  const retirar = async (release: FirmwareRelease) => {
    try {
      await firmwareApi.retireFirmwareRelease(release.id);
      notify('success', `${release.version} ya no se ofrece a los equipos`);
      releases.reload();
    } catch (caught: unknown) {
      notify('error', asApiError(caught).message);
    } finally {
      setARetirar(null);
    }
  };

  const nuevaVersion = (
    <Button
      variant="primary"
      size="sm"
      icon={<IconPlus className="size-4" />}
      onClick={() => {
        setPublicando(true);
      }}
    >
      Publicar versión
    </Button>
  );

  const items = releases.data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Firmware"
        description="Las versiones publicadas del software de los gateways. Publicar una no la instala en ningún equipo."
        actions={nuevaVersion}
      />

      {releases.loading ? (
        <SkeletonPanel rows={3} />
      ) : releases.error ? (
        <ErrorState error={releases.error} onRetry={releases.reload} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Todavía no hay versiones publicadas"
          description="Publicá una versión con su checksum para poder desplegarla en la flota."
          action={nuevaVersion}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((release) => (
            <li
              key={release.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3"
            >
              <div className="flex flex-col gap-1">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  {release.version}
                  {release.canal === 'beta' && (
                    <Badge tone="warning">beta</Badge>
                  )}
                  {release.retirado_en !== null && (
                    <Badge tone="danger">retirada</Badge>
                  )}
                </p>
                <p className="text-xs text-muted">
                  Publicada el {formatDateTime(release.created_at)} ·{' '}
                  {formatSize(release.tamano_bytes)} ·{' '}
                  {release.gateways_apuntando === 0
                    ? 'ningún equipo la tiene pedida'
                    : `${release.gateways_apuntando} equipo(s) la tienen pedida`}
                </p>
                {release.notas && (
                  <p className="text-sm text-muted">{release.notas}</p>
                )}
                <p
                  className="font-mono text-xs text-muted"
                  title={release.sha256}
                >
                  sha256 {release.sha256.slice(0, 12)}…
                </p>
              </div>

              <Menu
                label={`Acciones de la versión ${release.version}`}
                items={[
                  ...(release.retirado_en === null
                    ? [
                        {
                          label: 'Desplegar en una empresa',
                          onSelect: () => {
                            setADesplegar(release);
                          },
                        },
                        {
                          label: 'Retirar',
                          danger: true,
                          onSelect: () => {
                            setARetirar(release);
                          },
                        },
                      ]
                    : []),
                ]}
              />
            </li>
          ))}
        </ul>
      )}

      {publicando && (
        <FirmwareReleaseForm
          onClose={() => {
            setPublicando(false);
          }}
          onSaved={() => {
            setPublicando(false);
            releases.reload();
          }}
        />
      )}

      {aDesplegar && (
        <RolloutDialog
          release={aDesplegar}
          onClose={() => {
            setADesplegar(null);
          }}
          onDone={() => {
            setADesplegar(null);
            releases.reload();
          }}
        />
      )}

      <ConfirmDialog
        open={aRetirar !== null}
        title="Retirar la versión"
        message={
          aRetirar
            ? `${aRetirar.version} deja de ofrecerse. Los ${aRetirar.gateways_apuntando} equipo(s) que iban hacia ella dejarán de recibirla en su próxima consulta. La versión no se borra: los equipos que ya la instalaron siguen apuntando a ella.`
            : ''
        }
        onCancel={() => {
          setARetirar(null);
        }}
        onConfirm={() => (aRetirar ? retirar(aRetirar) : undefined)}
      />
    </div>
  );
}

/**
 * Pedirle una versión a todos los gateways de una empresa.
 *
 * El resultado se muestra entero, incluidos los equipos que quedaron afuera:
 * un despliegue que contesta "listo" sobre una flota donde la mitad no
 * arrancó es peor que uno que falla.
 */
function RolloutDialog({
  release,
  onClose,
  onDone,
}: {
  release: FirmwareRelease;
  onClose: () => void;
  onDone: () => void;
}) {
  const { notify } = useToast();
  const [clientId, setClientId] = useState('');
  const [ahora, setAhora] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<RolloutResult | null>(null);

  const { items: clients } = useNameLookup(
    (limit) => clientsApi.listClients({ limit }),
    (client) => client.id,
    (client) => client.nombre_empresa,
  );

  const desplegar = async () => {
    setEnviando(true);
    try {
      setResultado(
        await firmwareApi.createFirmwareRollout({
          release_id: release.id,
          client_id: clientId,
          ahora,
        }),
      );
    } catch (caught: unknown) {
      notify('error', asApiError(caught).message);
    } finally {
      setEnviando(false);
    }
  };

  if (resultado) {
    return (
      <Modal
        open
        title={`${resultado.version} desplegada`}
        onClose={onDone}
        footer={
          <Button variant="primary" onClick={onDone}>
            Entendido
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          {!resultado.flota_activa && (
            <p
              role="status"
              className="rounded-lg border border-warning bg-warning-soft px-4 py-3 text-sm text-warning-content"
            >
              Las actualizaciones están desactivadas para la flota: la orden
              quedó escrita, pero ningún equipo va a bajarla hasta que se
              encienda <strong>FIRMWARE_UPDATE_ACTIVO</strong> en Servicios.
            </p>
          )}

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">
              Programados ({resultado.programados.length})
            </h3>
            {resultado.programados.length === 0 ? (
              <p className="text-sm text-muted">Ninguno.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {resultado.programados.map((item) => (
                  <li key={item.gateway_id} className="flex flex-wrap gap-2">
                    <span className="font-medium">{item.numero_serie}</span>
                    <span className="text-muted">
                      desde {formatDateTime(item.aplicar_desde)}
                    </span>
                    {item.descenso && (
                      <Badge tone="warning">vuelve atrás</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {resultado.omitidos.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">
                Sin pedir ({resultado.omitidos.length})
              </h3>
              <ul className="flex flex-col gap-1 text-sm">
                {resultado.omitidos.map((item) => (
                  <li key={item.gateway_id}>
                    <span className="font-medium">{item.numero_serie}</span>
                    <span className="text-muted"> — {item.motivo}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      title={`Desplegar ${release.version}`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            loading={enviando}
            disabled={clientId === ''}
            onClick={() => {
              void desplegar();
            }}
          >
            Desplegar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Select
          id="rollout-client"
          label="Empresa"
          value={clientId}
          options={[
            { value: '', label: 'Elegir una empresa…' },
            ...clients.map((client: Client) => ({
              value: client.id,
              label: client.nombre_empresa,
            })),
          ]}
          onValueChange={setClientId}
          hint="Se le pide a todos los gateways de todas sus sedes."
        />

        <Toggle
          id="rollout-ahora"
          label="Instalar apenas cada equipo pregunte"
          description="Sin esto se aplica en la ventana nocturna configurada para la flota, en la hora local de cada sede."
          checked={ahora}
          onCheckedChange={setAhora}
        />
      </div>
    </Modal>
  );
}
